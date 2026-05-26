import { create } from 'zustand';
import { db, getSettings, patchSettings } from '../db';
import type { AppSettings } from '../types';

interface SettingsStore {
  loaded: boolean;
  settings: AppSettings;
  hydrate: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  setActiveWorld: (id: string | null) => Promise<void>;
  markTutorialSeen: () => Promise<void>;
  pushRecentArticle: (id: string) => Promise<void>;
}

const DEFAULT: AppSettings = {
  id: 'singleton',
  theme: 'dark',
  activeWorldId: null,
  hasSeenTutorial: false,
  recentArticleIds: [],
};

export const useSettings = create<SettingsStore>((set, get) => ({
  loaded: false,
  settings: DEFAULT,
  hydrate: async () => {
    const s = await getSettings();
    applyTheme(s.theme);
    set({ settings: s, loaded: true });
  },
  setTheme: async (theme) => {
    applyTheme(theme);
    try { localStorage.setItem('stormforge.theme', theme); } catch {}
    const s = await patchSettings({ theme });
    set({ settings: s });
  },
  setActiveWorld: async (id) => {
    const s = await patchSettings({ activeWorldId: id });
    set({ settings: s });
  },
  markTutorialSeen: async () => {
    const s = await patchSettings({ hasSeenTutorial: true });
    set({ settings: s });
  },
  pushRecentArticle: async (id) => {
    const cur = get().settings.recentArticleIds.filter(x => x !== id);
    cur.unshift(id);
    const next = cur.slice(0, 8);
    const s = await patchSettings({ recentArticleIds: next });
    set({ settings: s });
  },
}));

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('theme-dark', theme !== 'light');
}
