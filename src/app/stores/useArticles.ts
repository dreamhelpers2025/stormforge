import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '../db';
import type { Article, ArticleCategory } from '../types';
import { TEMPLATES } from '../lib/templates';

/** Stable empty-array sentinel — required for React 18+ useSyncExternalStore
 *  selectors. Returning `[]` each render breaks reference equality and
 *  triggers "getSnapshot should be cached" / infinite re-renders. */
export const EMPTY_ARTICLES: readonly Article[] = Object.freeze([]) as any;

function makeEmptyDoc(category: ArticleCategory) {
  const sections = TEMPLATES[category] ?? [];
  const content: any[] = [];
  for (const s of sections) {
    content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: s.heading }] });
    content.push({ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: s.prompt }] });
  }
  if (!content.length) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

interface ArticlesStore {
  byWorld: Record<string, Article[]>;
  loadWorld: (worldId: string) => Promise<void>;
  get: (id: string) => Promise<Article | undefined>;
  create: (worldId: string, category: ArticleCategory, title?: string) => Promise<Article>;
  update: (id: string, patch: Partial<Article>) => Promise<Article | undefined>;
  remove: (id: string) => Promise<void>;
  search: (worldId: string, q: string) => Article[];
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
    const a: Article = {
      id: nanoid(12),
      worldId,
      category,
      title: (title?.trim() || untitledFor(category)),
      summary: '',
      contentJson: makeEmptyDoc(category),
      contentText: '',
      tags: [],
      meta: defaultMetaFor(category),
      pinned: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await db.articles.put(a);
    const cur = get().byWorld[worldId] ?? [];
    set({ byWorld: { ...get().byWorld, [worldId]: [a, ...cur] } });
    return a;
  },
  update: async (id, patch) => {
    const cur = await db.articles.get(id);
    if (!cur) return;
    const next: Article = { ...cur, ...patch, updatedAt: Date.now() };
    await db.articles.put(next);
    const list = (get().byWorld[next.worldId] ?? []).map(a => (a.id === id ? next : a));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [next.worldId]: list } });
    return next;
  },
  remove: async (id) => {
    const cur = await db.articles.get(id);
    if (!cur) return;
    await db.articles.delete(id);
    const list = (get().byWorld[cur.worldId] ?? []).filter(a => a.id !== id);
    set({ byWorld: { ...get().byWorld, [cur.worldId]: list } });
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
