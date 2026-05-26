import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig';

/**
 * Singleton Supabase client.
 * PKCE flow + detectSessionInUrl: when the user clicks a magic link,
 * Supabase returns a ?code= query param that the client auto-exchanges
 * for a session. We use PKCE (not implicit/hash) so we don't collide with
 * the app's HashRouter which uses # for routes.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'stormforge.auth',
  },
});
