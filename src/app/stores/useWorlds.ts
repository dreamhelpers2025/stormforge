import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '../db';
import * as cloud from '../lib/cloudSync';
import { supabase } from '../lib/supabase';
import type { World, WorldTheme } from '../types';

const GRADIENTS = [
  'linear-gradient(135deg, #0B1E2D 0%, #1E7C86 50%, #43C7C7 100%)',
  'linear-gradient(135deg, #2a0f0a 0%, #6e2b1d 50%, #B88A3B 100%)',
  'linear-gradient(135deg, #0a1f15 0%, #1d6e3a 50%, #6ed099 100%)',
  'linear-gradient(135deg, #1a0a2e 0%, #4b1e7e 50%, #c084fc 100%)',
  'linear-gradient(135deg, #0a1a2e 0%, #1e4b86 50%, #93c5fd 100%)',
  'linear-gradient(135deg, #050505 0%, #2a2a2a 50%, #5a5a5a 100%)',
];
const THEMES: WorldTheme[] = ['tempest', 'ember', 'verdant', 'arcane', 'frost', 'umbra'];

function makeWorld(name: string, idx = 0): World {
  return {
    id: nanoid(12),
    name,
    tagline: '',
    description: '',
    coverGradient: GRADIENTS[idx % GRADIENTS.length],
    themeAccent: THEMES[idx % THEMES.length],
    bannerEmoji: '🐉',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface WorldsStore {
  worlds: World[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  create: (name: string) => Promise<World>;
  update: (id: string, patch: Partial<World>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  get: (id: string) => World | undefined;
}

export const useWorlds = create<WorldsStore>((set, get) => ({
  worlds: [],
  loaded: false,
  hydrate: async () => {
    const worlds = await db.worlds.orderBy('updatedAt').reverse().toArray();
    // Backfill ownerUserId on pre-sharing local rows. Anything in local IndexedDB
    // before sharing existed was created by the current user, so it's safe to
    // attribute to them.
    try {
      const { data } = await supabase.auth.getUser();
      const myId = data.user?.id;
      if (myId) {
        const needsBackfill = worlds.filter(w => !w.ownerUserId);
        if (needsBackfill.length) {
          for (const w of needsBackfill) w.ownerUserId = myId;
          await db.worlds.bulkPut(needsBackfill);
        }
      }
    } catch {
      // signed-out user; leave as-is, they'll be marked when they sign in
    }
    set({ worlds, loaded: true });
  },
  create: async (name) => {
    const idx = get().worlds.length;
    const w = makeWorld(name.trim() || 'Untitled Realm', idx);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) w.ownerUserId = data.user.id;
    } catch {}
    await db.worlds.put(w);
    set({ worlds: [w, ...get().worlds] });
    cloud.upsertWorld(w);
    return w;
  },
  update: async (id, patch) => {
    const cur = await db.worlds.get(id);
    if (!cur) return;
    const next: World = { ...cur, ...patch, updatedAt: Date.now() };
    await db.worlds.put(next);
    set({ worlds: get().worlds.map(w => (w.id === id ? next : w)).sort((a, b) => b.updatedAt - a.updatedAt) });
    cloud.upsertWorld(next);
  },
  remove: async (id) => {
    await db.transaction('rw', db.worlds, db.articles, db.scratchpad, db.maps, db.revisions, async () => {
      await db.worlds.delete(id);
      await db.articles.where('worldId').equals(id).delete();
      await db.scratchpad.where('worldId').equals(id).delete();
      await db.maps.where('worldId').equals(id).delete();
      await db.revisions.where('worldId').equals(id).delete();
    });
    set({ worlds: get().worlds.filter(w => w.id !== id) });
    cloud.deleteWorld(id);
  },
  get: (id) => get().worlds.find(w => w.id === id),
}));

export const WORLD_GRADIENTS = GRADIENTS;
export const WORLD_THEMES = THEMES;
