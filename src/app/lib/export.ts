import { db } from '../db';
import type { World, Article, ScratchpadNote } from '../types';

export interface WorldExport {
  formatVersion: 1;
  exportedAt: number;
  world: World;
  articles: Article[];
  scratchpad: ScratchpadNote[];
}

export async function exportWorld(worldId: string): Promise<WorldExport> {
  const world = await db.worlds.get(worldId);
  if (!world) throw new Error('World not found');
  const articles = await db.articles.where('worldId').equals(worldId).toArray();
  const scratchpad = await db.scratchpad.where('worldId').equals(worldId).toArray();
  return {
    formatVersion: 1,
    exportedAt: Date.now(),
    world,
    articles,
    scratchpad,
  };
}

export async function importWorld(payload: WorldExport, opts?: { newId?: boolean }): Promise<string> {
  if (payload.formatVersion !== 1) throw new Error('Unsupported export format');
  let world = payload.world;
  const articles = payload.articles;
  const scratchpad = payload.scratchpad ?? [];
  if (opts?.newId) {
    const { nanoid } = await import('nanoid');
    const newWorldId = nanoid(12);
    const remap: Record<string, string> = { [world.id]: newWorldId };
    world = { ...world, id: newWorldId, updatedAt: Date.now() };
    for (const a of articles) {
      const newId = nanoid(12);
      remap[a.id] = newId;
    }
    for (const a of articles) {
      a.id = remap[a.id];
      a.worldId = newWorldId;
    }
    for (const s of scratchpad) {
      s.id = nanoid(12);
      s.worldId = newWorldId;
    }
  }
  await db.transaction('rw', db.worlds, db.articles, db.scratchpad, async () => {
    await db.worlds.put(world);
    await db.articles.bulkPut(articles);
    if (scratchpad.length) await db.scratchpad.bulkPut(scratchpad);
  });
  return world.id;
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
