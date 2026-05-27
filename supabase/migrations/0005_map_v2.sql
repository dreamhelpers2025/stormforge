-- =========================================================================
-- Stormforge — Phase 2.5: Cartographer's Toolkit (map editor v2)
--
-- Adds three optional columns to public.maps:
--   stamps        jsonb  — decorative scenery icons (mountains, trees…)
--   style         text   — style preset key ('parchment','vellum',…)
--   show_compass  bool   — toggle the corner compass rose
--
-- All optional with sensible defaults so existing maps keep rendering
-- exactly the same after the migration. Idempotent — safe to re-run.
-- =========================================================================

alter table public.maps add column if not exists stamps       jsonb   default '[]'::jsonb;
alter table public.maps add column if not exists style        text;
alter table public.maps add column if not exists show_compass boolean default false;
