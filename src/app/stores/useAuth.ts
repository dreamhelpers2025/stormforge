import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AUTH_REDIRECT_URL } from '../lib/supabaseConfig';
import type { Session, User } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;          // true until initial getSession resolves
  signingIn: boolean;
  hydrate: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  signingIn: false,

  hydrate: async () => {
    // Read whatever Supabase has parsed (from localStorage or the URL ?code= exchange).
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });

    // Subscribe so we react to sign-in / sign-out from any tab.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signInWithEmail: async (email) => {
    set({ signingIn: true });
    const trimmed = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: AUTH_REDIRECT_URL },
    });
    set({ signingIn: false });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    // Stop any playing audio so a signed-out user doesn't keep hearing the previous account's tracks.
    try {
      const mod = await import('./useAudio');
      mod.useAudio.getState().stop();
    } catch {}
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
