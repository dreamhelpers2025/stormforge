import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '../db';
import * as cloud from '../lib/cloudSync';
import type { MapData } from '../types';

export const EMPTY_MAPS: readonly MapData[] = Object.freeze([]) as any;

const DEFAULT_BG = 'linear-gradient(135deg, #0c2030 0%, #0a1a26 100%)';

function makeMap(worldId: string, name: string): MapData {
  return {
    id: nanoid(12),
    worldId,
    name: name.trim() || 'Untitled Map',
    description: '',
    background: DEFAULT_BG,
    aspectRatio: 16 / 9,
    showGrid: true,
    pins: [],
    regions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface MapsStore {
  byWorld: Record<string, MapData[]>;
  loadWorld: (worldId: string) => Promise<void>;
  get: (id: string) => Promise<MapData | undefined>;
  create: (worldId: string, name: string) => Promise<MapData>;
  update: (id: string, patch: Partial<MapData>) => Promise<MapData | undefined>;
  remove: (id: string) => Promise<void>;
}

export const useMaps = create<MapsStore>((set, get) => ({
  byWorld: {},
  loadWorld: async (worldId) => {
    const list = await db.maps.where('worldId').equals(worldId).toArray();
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [worldId]: list } });
  },
  get: async (id) => db.maps.get(id),
  create: async (worldId, name) => {
    const m = makeMap(worldId, name);
    await db.maps.put(m);
    const cur = get().byWorld[worldId] ?? [];
    set({ byWorld: { ...get().byWorld, [worldId]: [m, ...cur] } });
    cloud.upsertMap(m);
    return m;
  },
  update: async (id, patch) => {
    const cur = await db.maps.get(id);
    if (!cur) return;
    const next: MapData = { ...cur, ...patch, updatedAt: Date.now() };
    await db.maps.put(next);
    const list = (get().byWorld[next.worldId] ?? []).map(m => (m.id === id ? next : m));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ byWorld: { ...get().byWorld, [next.worldId]: list } });
    cloud.upsertMap(next);
    return next;
  },
  remove: async (id) => {
    const cur = await db.maps.get(id);
    if (!cur) return;
    await db.maps.delete(id);
    const list = (get().byWorld[cur.worldId] ?? []).filter(m => m.id !== id);
    set({ byWorld: { ...get().byWorld, [cur.worldId]: list } });
    cloud.deleteMap(id);
  },
}));
