import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '../db';
import type { Article, ArticleCategory } from '../types';
import { TEMPLATES } from '../lib/templates';
import { snapshotIfDue, deleteRevisionsFor } from '../lib/revisions';
import * as cloud from '../lib/cloudSync';

/** Stable empty-array sentinel — required for React 18+ useSyncExternalStore
 *  selectors. Returning `[]` each render breaks reference equality and
 *  triggers "getSnapshot should be cached" / infinite re-renders. */
export const EMPTY_ARTICLES: readonly Article[] = Object.freeze([]) as any;

function makeEmptyDoc(_category: ArticleCategory) {
  // Articles now start blank. The editor exposes a "+ Add prompts" button
  // that opens a picker for inserting category-appropriate prompts.
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

interface ArticlesStore {
  byWorld: Record<string, Article[]>;
  loadWorld: (worldId: string) => Promise<void>;
  get: (id: string) => Promise<Article | undefined>;
  create: (worldId: string, category: ArticleCategory, title?: string) => Promise<Article>;
  createFolder: (worldId: string, name: string, parentId?: string) => Promise<Article>;
  update: (id: string, patch: Partial<Article>) => Promise<Article | undefined>;
  reparent: (id: string, newParentId: string | undefined, order: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  search: (worldId: string, q: string) => Article[];
  /** Bulk insert pre-constructed articles. Used by the import flow. */
  bulkImport: (worldId: string, articles: Article[]) => Promise<void>;
}

export const useArticles = create<ArticlesStore>((set, get) => ({
  byWorld: {},
  loadWorld: async (worldId) => {
    const list = await db.articles.where('worldId').equals(worldId).toArray();
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [worldId]: list } });
  },
  get: async (id) => db.articles.get(id),
  create: async (worldId, category, title) => {
    const now = Date.now();
    const existing = get().byWorld[worldId] ?? [];
    // Assign an order at end of root so new articles append cleanly
    const rootOrders = existing.filter(a => !a.meta?.parentId).map(a => (a.meta?.order as number) ?? 0);
    const order = (rootOrders.length ? Math.max(...rootOrders) : 0) + 1000;
    const a: Article = {
      id: nanoid(12),
      worldId,
      category,
      title: (title?.trim() || untitledFor(category)),
      summary: '',
      contentJson: makeEmptyDoc(category),
      contentText: '',
      tags: [],
      meta: { ...defaultMetaFor(category), order },
      pinned: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await db.articles.put(a);
    set({ byWorld: { ...get().byWorld, [worldId]: [a, ...existing] } });
    cloud.upsertArticle(a);
    return a;
  },
  createFolder: async (worldId, name, parentId) => {
    const now = Date.now();
    const existing = get().byWorld[worldId] ?? [];
    // Order at end of the target parent's children
    const sibs = existing.filter(a => (a.meta?.parentId as string | undefined) === parentId);
    const sibOrders = sibs.map(a => (a.meta?.order as number) ?? 0);
    const order = (sibOrders.length ? Math.max(...sibOrders) : 0) + 1000;
    const a: Article = {
      id: nanoid(12),
      worldId,
      category: 'folder',
      title: name.trim() || 'New Folder',
      summary: '',
      contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentText: '',
      tags: [],
      meta: { parentId, order },
      pinned: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await db.articles.put(a);
    set({ byWorld: { ...get().byWorld, [worldId]: [a, ...existing] } });
    cloud.upsertArticle(a);
    return a;
  },
  update: async (id, patch) => {
    const cur = await db.articles.get(id);
    if (!cur) return;
    // Snapshot the OLD state before mutating, on a throttle.
    snapshotIfDue(cur).catch(() => {});
    const next: Article = { ...cur, ...patch, updatedAt: Date.now() };
    await db.articles.put(next);
    const list = (get().byWorld[next.worldId] ?? []).map(a => (a.id === id ? next : a));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [next.worldId]: list } });
    cloud.upsertArticle(next);
    return next;
  },
  reparent: async (id, newParentId, order) => {
    const cur = await db.articles.get(id);
    if (!cur) return;
    const nextMeta = { ...(cur.meta ?? {}), parentId: newParentId, order };
    const next: Article = { ...cur, meta: nextMeta, updatedAt: Date.now() };
    await db.articles.put(next);
    const list = (get().byWorld[next.worldId] ?? []).map(a => (a.id === id ? next : a));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [next.worldId]: list } });
    cloud.upsertArticle(next);
  },
  remove: async (id) => {
    const cur = await db.articles.get(id);
    if (!cur) return;
    // Orphan children to root (don't cascade delete) so user doesn't lose articles
    const children = (get().byWorld[cur.worldId] ?? []).filter(a => (a.meta?.parentId as string | undefined) === id);
    await db.articles.delete(id);
    deleteRevisionsFor(id).catch(() => {});
    for (const c of children) {
      const nextMeta = { ...(c.meta ?? {}), parentId: undefined };
      const next: Article = { ...c, meta: nextMeta, updatedAt: Date.now() };
      await db.articles.put(next);
      cloud.upsertArticle(next);
    }
    const fresh = (get().byWorld[cur.worldId] ?? [])
      .filter(a => a.id !== id)
      .map(a => {
        if ((a.meta?.parentId as string | undefined) === id) {
          return { ...a, meta: { ...(a.meta ?? {}), parentId: undefined }, updatedAt: Date.now() };
        }
        return a;
      });
    set({ byWorld: { ...get().byWorld, [cur.worldId]: fresh } });
    cloud.deleteArticle(id);
  },
  search: (worldId, q) => {
    const all = get().byWorld[worldId] ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return all.slice(0, 50);
    return all.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      a.contentText.toLowerCase().includes(query) ||
      a.tags.some(t => t.toLowerCase().includes(query))
    ).slice(0, 50);
  },
  bulkImport: async (worldId, articles) => {
    if (!articles.length) return;
    await db.articles.bulkPut(articles);
    const existing = get().byWorld[worldId] ?? [];
    const next = [...articles, ...existing];
    set({ byWorld: { ...get().byWorld, [worldId]: next } });
    // Fire cloud upserts (best-effort, fire-and-forget; reconcile catches stragglers)
    for (const a of articles) cloud.upsertArticle(a);
  },
}));

function untitledFor(category: ArticleCategory): string {
  const map: Partial<Record<ArticleCategory, string>> = {
    species: 'New Species',
    character: 'New Character',
    place: 'New Place',
    country: 'New Country',
    language: 'New Language',
    item: 'New Item',
    magic_system: 'New Magic System',
    conflict: 'New Conflict',
    deity: 'New Deity',
    history: 'New History Entry',
  };
  return map[category] ?? 'Untitled';
}

function defaultMetaFor(category: ArticleCategory): Record<string, any> {
  if (category === 'species') {
    return {
      size: 40,
      lifespan: 50,
      intelligence: 55,
      reproductionRate: 40,
      environments: [],
      diet: 'omnivore',
      behavior: [],
      traits: [],
      weaknesses: [],
      communication: [],
      relationships: [],
      silhouetteSeed: Math.floor(Math.random() * 1_000_000),
    };
  }
  return {};
}
