/**
 * Cloud sync engine.
 *
 * Behaviour:
 *   - Without sign-in, this module is dormant. The app works fully on IndexedDB.
 *   - On sign-in, we do a two-way reconciliation: rows on either side that
 *     are newer (by updated_at) win.
 *   - On every local mutation, the relevant store calls cloudSync.upsertXxx()
 *     which fires-and-forgets a Supabase upsert. The useSync store tracks
 *     pending count + state so the UI can show "Saving…" / "Synced".
 *   - On error (network down, auth lapsed), we set state='error' and stop.
 *     Re-signing in or going back online triggers a fresh reconcile.
 *
 * Conflict model: last-write-wins by `updated_at` (a unix-ms number). Good
 * enough for a single-user, multi-device workflow. Collaboration in Phase 3.2
 * will layer a row-level merge on top.
 */

import { supabase } from './supabase';
import { db } from '../db';
import { useSync } from '../stores/useSync';
import {
  worldFromCloud, worldToCloud,
  articleFromCloud, articleToCloud,
  mapFromCloud, mapToCloud,
  noteFromCloud, noteToCloud,
  revisionFromCloud, revisionToCloud,
} from './cloudMappers';
import { useWorlds } from '../stores/useWorlds';
import { useArticles } from '../stores/useArticles';
import { useMaps } from '../stores/useMaps';
import type { Article, World, MapData, ScratchpadNote, ArticleRevision } from '../types';

let currentUserId: string | null = null;

/** Called from the auth bootstrap when a session becomes available. */
export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
  if (!userId) useSync.getState().set({ state: 'signed-out' });
}

function ensureSignedIn(): string | null {
  if (!currentUserId) return null;
  if (!navigator.onLine) {
    useSync.getState().set({ state: 'offline' });
    return null;
  }
  return currentUserId;
}

/** Best-effort error stringification for Supabase errors. */
function formatError(e: any): string {
  if (!e) return 'unknown';
  const parts: string[] = [];
  if (e.code) parts.push(`[${e.code}]`);
  if (e.message) parts.push(e.message);
  else parts.push(String(e));
  if (e.details && e.details !== e.message) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  return parts.join(' · ');
}

/** Wrap a fire-and-forget cloud op with pending-counter bookkeeping. */
function runOp(fn: () => Promise<unknown>): void {
  useSync.getState().inc();
  fn()
    .catch((e: any) => {
      console.error('[cloudSync] op failed:', e);
      useSync.getState().set({ state: 'error', lastError: formatError(e) });
    })
    .finally(() => useSync.getState().dec());
}

// ============================================================
//  RECONCILE — one-shot two-way sync on sign in / online recovery
// ============================================================

export async function reconcileAll(userId: string): Promise<void> {
  currentUserId = userId;
  useSync.getState().set({ state: 'syncing', lastError: null });

  // Sequential + labeled. If one step fails we want to know which.
  const steps: Array<[string, () => Promise<void>]> = [
    ['worlds',    () => reconcileWorlds(userId)],
    ['articles',  () => reconcileArticles(userId)],
    ['maps',      () => reconcileMaps(userId)],
    ['notes',     () => reconcileNotes(userId)],
    ['revisions', () => reconcileRevisions(userId)],
  ];

  for (const [label, run] of steps) {
    try {
      await run();
    } catch (e: any) {
      console.error(`[cloudSync] reconcile.${label} failed:`, e);
      useSync.getState().set({
        state: 'error',
        lastError: `reconcile.${label}: ${formatError(e)}`,
      });
      return;
    }
  }

  useSync.getState().set({ state: 'idle', lastSync: Date.now(), lastError: null });

  // Refresh local stores from IndexedDB after reconciliation may have written
  // new rows directly to Dexie.
  await useWorlds.getState().hydrate();
}

// ------- per-table reconcile ---------
//
// All reconciles use a two-phase strategy:
//   Phase 1: SELECT id, updated_at  (tiny response, immune to row size)
//   Phase 2: SELECT * but ONLY for the rows we actually need to pull down,
//            and only in small chunks so any single huge row can't blow
//            the whole sync up.
//
// This is what prevents a user with a large cover image / large embedded
// images in articles from getting ERR_CONNECTION_RESET on reconcile.

/** Decide which IDs need to be pulled down, which local rows need pushing up. */
function planDelta<L extends { id: string; updatedAt: number }>(
  cloudMeta: Array<{ id: string; updated_at: number }>,
  localRows: L[]
): { idsToPull: string[]; toPushUp: L[] } {
  const cloudMap = new Map<string, number>();
  for (const r of cloudMeta) cloudMap.set(r.id, Number(r.updated_at) || 0);
  const localMap = new Map<string, L>();
  for (const r of localRows) localMap.set(r.id, r);

  const idsToPull: string[] = [];
  const toPushUp: L[] = [];

  // Local rows: push up if not in cloud OR if local newer
  for (const local of localRows) {
    const cloudTs = cloudMap.get(local.id);
    if (cloudTs == null) toPushUp.push(local);
    else if (local.updatedAt > cloudTs) toPushUp.push(local);
  }
  // Cloud rows: pull down if not local OR if cloud newer
  for (const r of cloudMeta) {
    const local = localMap.get(r.id);
    const cloudTs = Number(r.updated_at) || 0;
    if (!local) idsToPull.push(r.id);
    else if (cloudTs > local.updatedAt) idsToPull.push(r.id);
  }
  return { idsToPull, toPushUp };
}

async function reconcileWorlds(userId: string) {
  // Phase 1: lightweight catalog
  const { data: meta, error: metaErr } = await supabase
    .from('worlds')
    .select('id, updated_at');
  if (metaErr) throw metaErr;

  const localRows = await db.worlds.toArray();
  const { idsToPull, toPushUp } = planDelta<World>(meta ?? [], localRows);

  // Phase 2: fetch full rows we need, in small chunks
  if (idsToPull.length) {
    for (let i = 0; i < idsToPull.length; i += 5) {
      const chunk = idsToPull.slice(i, i + 5);
      const { data: rows, error: pullErr } = await supabase
        .from('worlds').select('*').in('id', chunk);
      if (pullErr) throw pullErr;
      if (rows?.length) await db.worlds.bulkPut(rows.map(worldFromCloud));
    }
  }

  // Push up — chunk
  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 5) {
      const slice = toPushUp.slice(i, i + 5).map(w => worldToCloud(w, userId));
      const { error: upErr } = await supabase.from('worlds').upsert(slice);
      if (upErr) throw upErr;
    }
  }
}

async function reconcileArticles(userId: string) {
  // Phase 1: lightweight catalog
  const { data: meta, error: metaErr } = await supabase
    .from('articles')
    .select('id, updated_at');
  if (metaErr) throw metaErr;

  const localRows = await db.articles.toArray();
  const { idsToPull, toPushUp } = planDelta<Article>(meta ?? [], localRows);

  // Phase 2: pull full articles we need, in chunks. Articles can be heavy
  // (contentJson with embedded images), so we keep chunks small.
  if (idsToPull.length) {
    const PULL_CHUNK = 5;
    for (let i = 0; i < idsToPull.length; i += PULL_CHUNK) {
      const chunk = idsToPull.slice(i, i + PULL_CHUNK);
      const { data: rows, error: pullErr } = await supabase
        .from('articles').select('*').in('id', chunk);
      if (pullErr) throw pullErr;
      if (rows?.length) await db.articles.bulkPut(rows.map(articleFromCloud));
    }
  }

  // Push up with per-row fallback so a single failing article is named.
  if (toPushUp.length) {
    const PUSH_CHUNK = 10;
    for (let i = 0; i < toPushUp.length; i += PUSH_CHUNK) {
      const slice = toPushUp.slice(i, i + PUSH_CHUNK);
      const payload = slice.map(a => articleToCloud(a, userId));
      const { error: upErr } = await supabase.from('articles').upsert(payload);
      if (upErr) {
        for (const a of slice) {
          const { error: rowErr } = await supabase.from('articles').upsert(articleToCloud(a, userId));
          if (rowErr) {
            console.error('[cloudSync] failing article in reconcile:', { id: a.id, title: a.title, category: a.category }, rowErr);
            throw new Error(`article "${a.title}" (${a.category}): ${rowErr.message ?? String(rowErr)}`);
          }
        }
        throw upErr;
      }
    }
  }
}

async function reconcileMaps(userId: string) {
  // Phase 1: catalog only (maps have potentially-huge background images)
  const { data: meta, error: metaErr } = await supabase
    .from('maps').select('id, updated_at');
  if (metaErr) throw metaErr;

  const localRows = await db.maps.toArray();
  const { idsToPull, toPushUp } = planDelta<MapData>(meta ?? [], localRows);

  // Phase 2: pull what we need
  if (idsToPull.length) {
    for (let i = 0; i < idsToPull.length; i += 5) {
      const chunk = idsToPull.slice(i, i + 5);
      const { data: rows, error: pullErr } = await supabase
        .from('maps').select('*').in('id', chunk);
      if (pullErr) throw pullErr;
      if (rows?.length) await db.maps.bulkPut(rows.map(mapFromCloud));
    }
  }

  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 5) {
      const slice = toPushUp.slice(i, i + 5).map(m => mapToCloud(m, userId));
      const { error: upErr } = await supabase.from('maps').upsert(slice);
      if (upErr) throw upErr;
    }
  }
}

async function reconcileNotes(userId: string) {
  const { data, error } = await supabase.from('scratchpad_notes').select('*');
  if (error) throw error;
  const cloudRows: ScratchpadNote[] = (data ?? []).map(noteFromCloud);
  const localRows = await db.scratchpad.toArray();
  const byId = new Map<string, ScratchpadNote>();
  for (const r of cloudRows) byId.set(r.id, r);
  // Local always wins for notes since they're append-only (no updatedAt)
  const toPushDown: ScratchpadNote[] = [];
  const localIds = new Set(localRows.map(n => n.id));
  for (const r of cloudRows) if (!localIds.has(r.id)) toPushDown.push(r);
  const cloudIds = new Set(cloudRows.map(n => n.id));
  const toPushUp = localRows.filter(n => !cloudIds.has(n.id));
  if (toPushDown.length) await db.scratchpad.bulkPut(toPushDown);
  if (toPushUp.length) {
    const { error: upErr } = await supabase.from('scratchpad_notes').upsert(toPushUp.map(n => noteToCloud(n, userId)));
    if (upErr) throw upErr;
  }
}

async function reconcileRevisions(userId: string) {
  const { data, error } = await supabase.from('article_revisions').select('*');
  if (error) throw error;
  const cloudRows: ArticleRevision[] = (data ?? []).map(revisionFromCloud);
  const localRows = await db.revisions.toArray();
  const localIds = new Set(localRows.map(r => r.id));
  const cloudIds = new Set(cloudRows.map(r => r.id));
  const toPushDown = cloudRows.filter(r => !localIds.has(r.id));
  const toPushUp = localRows.filter(r => !cloudIds.has(r.id));
  if (toPushDown.length) await db.revisions.bulkPut(toPushDown);
  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 25) {
      const slice = toPushUp.slice(i, i + 25);
      const { error: upErr } = await supabase.from('article_revisions').upsert(slice.map(r => revisionToCloud(r, userId)));
      if (upErr) throw upErr;
    }
  }
}

// ============================================================
//  ONGOING — single-row fire-and-forget upserts/deletes
// ============================================================

export function upsertWorld(w: World) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('worlds').upsert(worldToCloud(w, uid)).then(throwIfErr));
}
export function deleteWorld(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(async () => {
    await supabase.from('article_revisions').delete().eq('world_id', id).then(throwIfErr);
    await supabase.from('articles').delete().eq('world_id', id).then(throwIfErr);
    await supabase.from('maps').delete().eq('world_id', id).then(throwIfErr);
    await supabase.from('scratchpad_notes').delete().eq('world_id', id).then(throwIfErr);
    await supabase.from('worlds').delete().eq('id', id).then(throwIfErr);
  });
}

export function upsertArticle(a: Article) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('articles').upsert(articleToCloud(a, uid)).then(throwIfErr));
}

/**
 * Batch upsert many articles at once. Used by the import flow so we don't
 * fire 50+ simultaneous requests at the Supabase free tier (which can throttle
 * or fail on overlapping connections). Chunks 20 rows per HTTP call and
 * awaits each chunk before moving on.
 */
export function bulkUpsertArticles(articles: Article[]) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (articles.length === 0) return;
  runOp(async () => {
    const CHUNK = 10;
    for (let i = 0; i < articles.length; i += CHUNK) {
      const slice = articles.slice(i, i + CHUNK);
      const payload = slice.map(a => articleToCloud(a, uid));
      const { error } = await supabase.from('articles').upsert(payload);
      if (error) {
        // Fall back to per-row to identify which article specifically failed
        for (const a of slice) {
          const { error: rowErr } = await supabase.from('articles').upsert(articleToCloud(a, uid));
          if (rowErr) {
            console.error('[cloudSync] failing article:', { id: a.id, title: a.title, category: a.category }, rowErr);
            throw new Error(`article "${a.title}" (${a.category}): ${rowErr.message ?? String(rowErr)}`);
          }
        }
        throw error;
      }
    }
  });
}
export function deleteArticle(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(async () => {
    await supabase.from('article_revisions').delete().eq('article_id', id).then(throwIfErr);
    await supabase.from('articles').delete().eq('id', id).then(throwIfErr);
  });
}

export function upsertMap(m: MapData) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('maps').upsert(mapToCloud(m, uid)).then(throwIfErr));
}
export function deleteMap(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('maps').delete().eq('id', id).then(throwIfErr));
}

export function upsertNote(n: ScratchpadNote) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('scratchpad_notes').upsert(noteToCloud(n, uid)).then(throwIfErr));
}
export function deleteNote(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('scratchpad_notes').delete().eq('id', id).then(throwIfErr));
}

export function upsertRevision(r: ArticleRevision) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => supabase.from('article_revisions').upsert(revisionToCloud(r, uid)).then(throwIfErr));
}

function throwIfErr({ error }: { error: any }) { if (error) throw error; }

/** Re-run reconciliation. Called when window comes back online. */
export async function resync() {
  if (!currentUserId) return;
  await reconcileAll(currentUserId);
}
