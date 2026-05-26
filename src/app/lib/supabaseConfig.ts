/**
 * Supabase project configuration.
 *
 * The anon (public) key is SAFE to embed in client code — Supabase is
 * designed this way. Database security is enforced via Row Level Security
 * policies (see migrations.sql) that scope every read/write to auth.uid().
 *
 * The service_role key is NEVER in this file. If you ever see one starting
 * with eyJ... and labeled "service_role", it's the admin key and must stay
 * server-side only.
 */

export const SUPABASE_URL = 'https://dyniwerfmsaevfagktlj.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bml3ZXJmbXNhZXZmYWdrdGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU2NjksImV4cCI6MjA5NTM5MTY2OX0.lahfNPWjeQ-yJWCoXL1Xwee1upnN7-pFxd9Grg04XtU';

/** URL the magic-link should redirect back to. Must match Auth → URL config. */
export const AUTH_REDIRECT_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.split('#')[0]}`
    : 'https://stormforgebuilder.com/app/';
