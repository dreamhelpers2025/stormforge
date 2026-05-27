import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface ProfileData {
  displayName: string;
  bio: string;
  avatarDataUrl?: string;
  backgroundDataUrl?: string;
  accent?: string;          // hex color for personal accent
}

const EMPTY: ProfileData = { displayName: '', bio: '' };

interface ProfileStore {
  loaded: boolean;
  saving: boolean;
  profile: ProfileData;
  /** Pull profile data from auth.users.raw_user_meta_data */
  hydrate: () => Promise<void>;
  /** Persist a partial update via supabase.auth.updateUser */
  update: (patch: Partial<ProfileData>) => Promise<void>;
}

export const useProfile = create<ProfileStore>((set, get) => ({
  loaded: false,
  saving: false,
  profile: EMPTY,

  hydrate: async () => {
    const { data } = await supabase.auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Partial<ProfileData>;
    set({
      loaded: true,
      profile: {
        displayName: meta.displayName ?? '',
        bio: meta.bio ?? '',
        avatarDataUrl: meta.avatarDataUrl,
        backgroundDataUrl: meta.backgroundDataUrl,
        accent: meta.accent,
      },
    });
  },

  update: async (patch) => {
    set({ saving: true });
    const cur = get().profile;
    const next: ProfileData = { ...cur, ...patch };
    const { error } = await supabase.auth.updateUser({ data: next as any });
    if (error) {
      console.warn('[profile] update failed', error);
      set({ saving: false });
      throw error;
    }
    set({ profile: next, saving: false });
  },
}));

/** Derived username from email (the part before @). */
export function usernameFromEmail(email: string | undefined): string {
  if (!email) return 'anonymous';
  return email.split('@')[0];
}
