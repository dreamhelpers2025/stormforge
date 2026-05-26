import Dexie, { type Table } from 'dexie';
import type { World, Article, ScratchpadNote, AppSettings, MapData, ArticleRevision } from './types';

class StormforgeDB extends Dexie {
  worlds!: Table<World, string>;
  articles!: Table<Article, string>;
  scratchpad!: Table<ScratchpadNote, string>;
  settings!: Table<AppSettings, string>;
  maps!: Table<MapData, string>;
  revisions!: Table<ArticleRevision, string>;

  constructor() {
    super('stormforge');
    this.version(1).stores({
      worlds: 'id, name, updatedAt',
      articles: 'id, worldId, category, title, updatedAt, pinned, [worldId+category]',
      scratchpad: 'id, worldId, createdAt',
      settings: 'id',
    });
    // v2 adds maps + article revisions
    this.version(2).stores({
      worlds: 'id, name, updatedAt',
      articles: 'id, worldId, category, title, updatedAt, pinned, [worldId+category]',
      scratchpad: 'id, worldId, createdAt',
      settings: 'id',
      maps: 'id, worldId, updatedAt',
      revisions: 'id, articleId, worldId, createdAt, [articleId+createdAt]',
    });
  }
}

export const db = new StormforgeDB();

/** Get-or-create the singleton settings row. */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const fresh: AppSettings = {
    id: 'singleton',
    theme: 'dark',
    activeWorldId: null,
    hasSeenTutorial: false,
    recentArticleIds: [],
  };
  await db.settings.put(fresh);
  return fresh;
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await db.settings.put(next);
  return next;
}
