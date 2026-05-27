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
import { useMembers } from '../stores/useMembers';
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

/**
 * Worlds the current user is allowed to write to. Anything outside this set
 * — e.g. articles from a world that was shared with us as viewer-only, or
 * leftover data from another account in a shared-browser scenario — must
 * NOT be pushed to the cloud, because RLS will (correctly) reject it.
 *
 * Reads from already-hydrated stores; if those aren't ready yet we fall back
 * to "anything goes" so we don't block normal startup sync.
 */
function getEditableWorldIds(): Set<string> | null {
  const worlds = useWorlds.getState().worlds;
  // If worlds haven't hydrated yet, don't filter — caller treats null as
  // "skip the filter for now".
  if (!worlds || worlds.length === 0) return null;
  const myRoles = useMembers.getState().myMemberRoles ?? {};
  const ids = new Set<string>();
  for (const w of worlds) {
    // Pre-sharing rows with no ownerUserId: treat as our own (backfill happens
    // elsewhere). Owner === current user: definitely ours. Editor on a shared
    // world: can write. Viewer-or-unknown: cannot.
    if (!w.ownerUserId || w.ownerUserId === currentUserId) {
      ids.add(w.id);
    } else if (myRoles[w.id] === 'editor') {
      ids.add(w.id);
    }
  }
  return ids;
}

/** True if the current user can push rows belonging to this worldId. */
function canEditWorld(worldId: string): boolean {
  const editable = getEditableWorldIds();
  if (editable === null) return true; // worlds store not hydrated yet — don't block
  return editable.has(worldId);
}

/**
 * Retry a network operation on transient failures with exponential backoff.
 *
 * Supabase JS REJECTS the promise (with TypeError "Failed to fetch") on
 * network-layer failures — those are exactly the flaky ones worth retrying
 * (TLS resets from antivirus HTTPS scanning, transient proxy hiccups, etc).
 * HTTP errors (4xx, 5xx) RESOLVE with { data, error } and are deterministic,
 * so they're not caught here and don't retry.
 */
async function withRetry<T>(fn: () => Promise<T>, label = 'op'): Promise<T> {
  const delays = [500, 1500, 4000];
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg: string = e?.message ?? String(e);
      const isNetwork =
        e instanceof TypeError ||
        /failed to fetch|network|err_connection|err_network|fetch failed|load failed/i.test(msg);
      if (!isNetwork || attempt >= delays.length) throw e;
      console.warn(`[cloudSync] ${label} retry ${attempt + 1}/${delays.length} after ${delays[attempt]}ms:`, msg);
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
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
  const { data: meta, error: metaErr } = await withRetry(
    () => supabase.from('worlds').select('id, updated_at'),
    'reconcile.worlds.catalog'
  );
  if (metaErr) throw metaErr;

  const localRows = await db.worlds.toArray();
  const { idsToPull, toPushUp } = planDelta<World>(meta ?? [], localRows);

  // Phase 2: fetch full rows we need, in small chunks
  if (idsToPull.length) {
    for (let i = 0; i < idsToPull.length; i += 5) {
      const chunk = idsToPull.slice(i, i + 5);
      const { data: rows, error: pullErr } = await withRetry(
        () => supabase.from('worlds').select('*').in('id', chunk),
        'reconcile.worlds.pull'
      );
      if (pullErr) throw pullErr;
      if (rows?.length) await db.worlds.bulkPut(rows.map(worldFromCloud));
    }
  }

  // Push up — chunk
  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 5) {
      const slice = toPushUp.slice(i, i + 5).map(w => worldToCloud(w, userId));
      const { error: upErr } = await withRetry(
        () => supabase.from('worlds').upsert(slice),
        'reconcile.worlds.push'
      );
      if (upErr) throw upErr;
    }
  }
}

async function reconcileArticles(userId: string) {
  const { data: meta, error: metaErr } = await withRetry(
    () => supabase.from('articles').select('id, updated_at'),
    'reconcile.articles.catalog'
  );
  if (metaErr) throw metaErr;

  const localRows = await db.articles.toArray();
  const { idsToPull, toPushUp: rawPush } = planDelta<Article>(meta ?? [], localRows);
  // Don't try to push rows from worlds we don't own/edit — RLS will reject
  // them. Most common cause: shared-browser IndexedDB containing another
  // account's data, or articles from a world shared with us as viewer-only.
  const editable = getEditableWorldIds();
  const toPushUp = editable === null
    ? rawPush
    : rawPush.filter(a => editable.has(a.worldId));
  const skipped = rawPush.length - toPushUp.length;
  if (skipped > 0) {
    console.warn(`[cloudSync] reconcile.articles: skipping ${skipped} article(s) from worlds the current user cannot edit.`);
  }

  if (idsToPull.length) {
    const PULL_CHUNK = 5;
    for (let i = 0; i < idsToPull.length; i += PULL_CHUNK) {
      const chunk = idsToPull.slice(i, i + PULL_CHUNK);
      const { data: rows, error: pullErr } = await withRetry(
        () => supabase.from('articles').select('*').in('id', chunk),
        'reconcile.articles.pull'
      );
      if (pullErr) throw pullErr;
      if (rows?.length) await db.articles.bulkPut(rows.map(articleFromCloud));
    }
  }

  if (toPushUp.length) {
    const PUSH_CHUNK = 10;
    for (let i = 0; i < toPushUp.length; i += PUSH_CHUNK) {
      const slice = toPushUp.slice(i, i + PUSH_CHUNK);
      const payload = slice.map(a => articleToCloud(a, userId));
      const { error: upErr } = await withRetry(
        () => supabase.from('articles').upsert(payload),
        'reconcile.articles.push'
      );
      if (upErr) {
        for (const a of slice) {
          const { error: rowErr } = await withRetry(
            () => supabase.from('articles').upsert(articleToCloud(a, userId)),
            'reconcile.articles.push.single'
          );
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
  const { data: meta, error: metaErr } = await withRetry(
    () => supabase.from('maps').select('id, updated_at'),
    'reconcile.maps.catalog'
  );
  if (metaErr) throw metaErr;

  const localRows = await db.maps.toArray();
  const { idsToPull, toPushUp: rawMapPush } = planDelta<MapData>(meta ?? [], localRows);
  const editableM = getEditableWorldIds();
  const toPushUp = editableM === null
    ? rawMapPush
    : rawMapPush.filter(m => editableM.has(m.worldId));
  if (rawMapPush.length - toPushUp.length > 0) {
    console.warn(`[cloudSync] reconcile.maps: skipping ${rawMapPush.length - toPushUp.length} map(s) from worlds the current user cannot edit.`);
  }

  if (idsToPull.length) {
    for (let i = 0; i < idsToPull.length; i += 5) {
      const chunk = idsToPull.slice(i, i + 5);
      const { data: rows, error: pullErr } = await withRetry(
        () => supabase.from('maps').select('*').in('id', chunk),
        'reconcile.maps.pull'
      );
      if (pullErr) throw pullErr;
      if (rows?.length) await db.maps.bulkPut(rows.map(mapFromCloud));
    }
  }

  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 5) {
      const slice = toPushUp.slice(i, i + 5).map(m => mapToCloud(m, userId));
      const { error: upErr } = await withRetry(
        () => supabase.from('maps').upsert(slice),
        'reconcile.maps.push'
      );
      if (upErr) throw upErr;
    }
  }
}

async function reconcileNotes(userId: string) {
  const { data, error } = await withRetry(
    () => supabase.from('scratchpad_notes').select('*'),
    'reconcile.notes.select'
  );
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
  const rawNotePush = localRows.filter(n => !cloudIds.has(n.id));
  const editableN = getEditableWorldIds();
  // Notes with worldId=null are global / user-personal; we let them through.
  // Notes scoped to a world we can't edit are skipped (probably leftovers
  // from another account in a shared-browser scenario).
  const toPushUp = editableN === null
    ? rawNotePush
    : rawNotePush.filter(n => n.worldId == null || editableN.has(n.worldId));
  if (rawNotePush.length - toPushUp.length > 0) {
    console.warn(`[cloudSync] reconcile.notes: skipping ${rawNotePush.length - toPushUp.length} note(s) from worlds the current user cannot edit.`);
  }
  if (toPushDown.length) await db.scratchpad.bulkPut(toPushDown);
  if (toPushUp.length) {
    const { error: upErr } = await withRetry(
      () => supabase.from('scratchpad_notes').upsert(toPushUp.map(n => noteToCloud(n, userId))),
      'reconcile.notes.push'
    );
    if (upErr) throw upErr;
  }
}

async function reconcileRevisions(userId: string) {
  // Catalog-only — revisions can be many (one per save) and contain full
  // contentJson snapshots, so even SELECT id is the right move here.
  const { data: meta, error: metaErr } = await withRetry(
    () => supabase.from('article_revisions').select('id'),
    'reconcile.revisions.catalog'
  );
  if (metaErr) throw metaErr;

  const localRows = await db.revisions.toArray();
  const cloudIdSet = new Set((meta ?? []).map((r: any) => r.id));
  const localIdSet = new Set(localRows.map(r => r.id));

  // Pull only revisions we don't have locally
  const idsToPull = (meta ?? []).map((r: any) => r.id).filter((id: string) => !localIdSet.has(id));
  if (idsToPull.length) {
    for (let i = 0; i < idsToPull.length; i += 5) {
      const chunk = idsToPull.slice(i, i + 5);
      const { data: rows, error: pullErr } = await withRetry(
        () => supabase.from('article_revisions').select('*').in('id', chunk),
        'reconcile.revisions.pull'
      );
      if (pullErr) throw pullErr;
      if (rows?.length) await db.revisions.bulkPut(rows.map(revisionFromCloud));
    }
  }

  const rawRevPush = localRows.filter(r => !cloudIdSet.has(r.id));
  const editableR = getEditableWorldIds();
  const toPushUp = editableR === null
    ? rawRevPush
    : rawRevPush.filter(r => editableR.has(r.worldId));
  if (rawRevPush.length - toPushUp.length > 0) {
    console.warn(`[cloudSync] reconcile.revisions: skipping ${rawRevPush.length - toPushUp.length} revision(s) from worlds the current user cannot edit.`);
  }
  if (toPushUp.length) {
    for (let i = 0; i < toPushUp.length; i += 10) {
      const slice = toPushUp.slice(i, i + 10);
      const { error: upErr } = await withRetry(
        () => supabase.from('article_revisions').upsert(slice.map(r => revisionToCloud(r, userId))),
        'reconcile.revisions.push'
      );
      if (upErr) throw upErr;
    }
  }
}

// ============================================================
//  ONGOING — single-row fire-and-forget upserts/deletes
// ============================================================

export function upsertWorld(w: World) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => withRetry(
    () => supabase.from('worlds').upsert(worldToCloud(w, uid)).then(throwIfErr),
    'upsertWorld'
  ));
}
export function deleteWorld(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(async () => {
    await withRetry(() => supabase.from('article_revisions').delete().eq('world_id', id).then(throwIfErr), 'deleteWorld.revisions');
    await withRetry(() => supabase.from('articles').delete().eq('world_id', id).then(throwIfErr),          'deleteWorld.articles');
    await withRetry(() => supabase.from('maps').delete().eq('world_id', id).then(throwIfErr),              'deleteWorld.maps');
    await withRetry(() => supabase.from('scratchpad_notes').delete().eq('world_id', id).then(throwIfErr),  'deleteWorld.notes');
    await withRetry(() => supabase.from('worlds').delete().eq('id', id).then(throwIfErr),                  'deleteWorld.world');
  });
}

export function upsertArticle(a: Article) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (!canEditWorld(a.worldId)) {
    console.warn(`[cloudSync] upsertArticle: skipping article "${a.title}" — current user can't edit world ${a.worldId}.`);
    return;
  }
  runOp(() => withRetry(
    () => supabase.from('articles').upsert(articleToCloud(a, uid)).then(throwIfErr),
    'upsertArticle'
  ));
}

/**
 * Batch upsert many articles at once. Used by the import flow so we don't
 * fire 50+ simultaneous requests at the Supabase free tier. Chunks 10 rows
 * per HTTP call, awaits each, retries on network errors, falls back to
 * per-row when a batch fails so we can name the offending article.
 */
export function bulkUpsertArticles(articles: Article[]) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (articles.length === 0) return;
  // Drop any articles from worlds we can't edit so we don't fail RLS on import.
  const editable = getEditableWorldIds();
  const filtered = editable === null ? articles : articles.filter(a => editable.has(a.worldId));
  if (filtered.length === 0) return;
  if (filtered.length < articles.length) {
    console.warn(`[cloudSync] bulkUpsertArticles: dropped ${articles.length - filtered.length} article(s) from non-editable worlds.`);
  }
  articles = filtered;
  runOp(async () => {
    const CHUNK = 10;
    for (let i = 0; i < articles.length; i += CHUNK) {
      const slice = articles.slice(i, i + CHUNK);
      const payload = slice.map(a => articleToCloud(a, uid));
      const { error } = await withRetry(
        () => supabase.from('articles').upsert(payload),
        'bulkUpsertArticles.batch'
      );
      if (error) {
        for (const a of slice) {
          const { error: rowErr } = await withRetry(
            () => supabase.from('articles').upsert(articleToCloud(a, uid)),
            'bulkUpsertArticles.row'
          );
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
    await withRetry(() => supabase.from('article_revisions').delete().eq('article_id', id).then(throwIfErr), 'deleteArticle.revisions');
    await withRetry(() => supabase.from('articles').delete().eq('id', id).then(throwIfErr),                   'deleteArticle.article');
  });
}

export function upsertMap(m: MapData) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (!canEditWorld(m.worldId)) {
    console.warn(`[cloudSync] upsertMap: skipping map "${m.name}" — current user can't edit world ${m.worldId}.`);
    return;
  }
  runOp(() => withRetry(
    () => supabase.from('maps').upsert(mapToCloud(m, uid)).then(throwIfErr),
    'upsertMap'
  ));
}
export function deleteMap(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => withRetry(
    () => supabase.from('maps').delete().eq('id', id).then(throwIfErr),
    'deleteMap'
  ));
}

export function upsertNote(n: ScratchpadNote) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (n.worldId != null && !canEditWorld(n.worldId)) {
    console.warn(`[cloudSync] upsertNote: skipping note — current user can't edit world ${n.worldId}.`);
    return;
  }
  runOp(() => withRetry(
    () => supabase.from('scratchpad_notes').upsert(noteToCloud(n, uid)).then(throwIfErr),
    'upsertNote'
  ));
}
export function deleteNote(id: string) {
  const uid = ensureSignedIn(); if (!uid) return;
  runOp(() => withRetry(
    () => supabase.from('scratchpad_notes').delete().eq('id', id).then(throwIfErr),
    'deleteNote'
  ));
}

export function upsertRevision(r: ArticleRevision) {
  const uid = ensureSignedIn(); if (!uid) return;
  if (!canEditWorld(r.worldId)) {
    console.warn(`[cloudSync] upsertRevision: skipping — current user can't edit world ${r.worldId}.`);
    return;
  }
  runOp(() => withRetry(
    () => supabase.from('article_revisions').upsert(revisionToCloud(r, uid)).then(throwIfErr),
    'upsertRevision'
  ));
}

function throwIfErr({ error }: { error: any }) { if (error) throw error; }

/** Re-run reconciliation. Called when window comes back online. */
export async function resync() {
  if (!currentUserId) return;
  await reconcileAll(currentUserId);
}
