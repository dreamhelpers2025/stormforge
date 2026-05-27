-- =========================================================================
-- Stormforge Archive — Phase 3.3: Ambient Music / Ambiance
--
-- Adds:
--   1. A `world-audio` Storage bucket (private, 20MB cap, audio mimes only)
--   2. Storage RLS policies keyed off the first path segment (= world_id)
--   3. `world_audio_tracks` metadata table with sharing-aware RLS
--
-- Path convention enforced by the client:
--     <world_id>/<track_id>__<safe_filename>
--
-- That way `split_part(name, '/', 1)` is always the world_id, and the
-- existing `can_view_world(text)` / `can_edit_world(text)` helpers from
-- 0002_sharing.sql do the permission work.
--
-- Idempotent: safe to re-run. Paste the whole file into a new SQL Editor tab
-- and click Run.
-- =========================================================================

-- ---------- 1. Storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'world-audio',
  'world-audio',
  false,
  20971520,  -- 20 MB
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
    'audio/flac'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- 2. Storage RLS ----------
-- Drop any prior versions so this migration is idempotent.
drop policy if exists "audio_read"   on storage.objects;
drop policy if exists "audio_insert" on storage.objects;
drop policy if exists "audio_update" on storage.objects;
drop policy if exists "audio_delete" on storage.objects;

-- View: anyone who can view the world (owner OR accepted member).
create policy "audio_read" on storage.objects for select
  using (
    bucket_id = 'world-audio'
    and public.can_view_world(split_part(name, '/', 1))
  );

-- Upload: only owner or editor of the world. Path must start with world_id.
create policy "audio_insert" on storage.objects for insert
  with check (
    bucket_id = 'world-audio'
    and public.can_edit_world(split_part(name, '/', 1))
  );

create policy "audio_update" on storage.objects for update
  using (
    bucket_id = 'world-audio'
    and public.can_edit_world(split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'world-audio'
    and public.can_edit_world(split_part(name, '/', 1))
  );

create policy "audio_delete" on storage.objects for delete
  using (
    bucket_id = 'world-audio'
    and public.can_edit_world(split_part(name, '/', 1))
  );

-- ---------- 3. world_audio_tracks metadata table ----------
create table if not exists public.world_audio_tracks (
  id            uuid primary key default gen_random_uuid(),
  world_id      text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  storage_path  text not null,
  duration_ms   bigint,
  source        text,        -- e.g. 'upload', 'pixabay', 'incompetech'
  attribution   text,        -- free-form: artist, license, link
  is_default    boolean not null default false,
  created_at    bigint not null,
  updated_at    bigint not null
);

create index if not exists wat_world_idx on public.world_audio_tracks(world_id);
create index if not exists wat_world_created_idx
  on public.world_audio_tracks(world_id, created_at);

alter table public.world_audio_tracks enable row level security;

drop policy if exists "wat_select" on public.world_audio_tracks;
drop policy if exists "wat_insert" on public.world_audio_tracks;
drop policy if exists "wat_update" on public.world_audio_tracks;
drop policy if exists "wat_delete" on public.world_audio_tracks;

create policy "wat_select" on public.world_audio_tracks for select
  using (public.can_view_world(world_id));

create policy "wat_insert" on public.world_audio_tracks for insert
  with check (auth.uid() = user_id and public.can_edit_world(world_id));

create policy "wat_update" on public.world_audio_tracks for update
  using (public.can_edit_world(world_id))
  with check (public.can_edit_world(world_id));

create policy "wat_delete" on public.world_audio_tracks for delete
  using (public.can_edit_world(world_id));
