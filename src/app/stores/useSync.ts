import { create } from 'zustand';

export type SyncState = 'signed-out' | 'idle' | 'syncing' | 'offline' | 'error';

interface SyncStore {
  state: SyncState;
  pending: number;        // pending operations in the queue
  lastSync: number | null;
  lastError: string | null;
  set: (patch: Partial<Omit<SyncStore, 'set' | 'inc' | 'dec'>>) => void;
  inc: () => void;
  dec: () => void;
}

export const useSync = create<SyncStore>((set, get) => ({
  state: 'signed-out',
  pending: 0,
  lastSync: null,
  lastError: null,
  set: (patch) => set((s) => ({ ...s, ...patch })),
  inc: () => set((s) => ({ pending: s.pending + 1, state: 'syncing' })),
  dec: () => {
    const next = Math.max(0, get().pending - 1);
    set({
      pending: next,
      state: next === 0 ? 'idle' : 'syncing',
      lastSync: next === 0 ? Date.now() : get().lastSync,
    });
  },
}));
