-- =========================================================================
-- Stormforge — profile images bucket
--
-- Permanently kills the JWT-bloat trap. Avatars and background banners used
-- to live as data URLs inside auth.users.raw_user_meta_data, which gets
-- embedded into every JWT — large images blew past proxy header limits and
-- made sign-in fail for the affected user (we hit this on Gracie's account).
--
-- Now: avatars and backgrounds live in a private Storage bucket, indexed by
--      the user's id as the first path segment. User_metadata stores only
--      the path string ("<userId>/avatar.jpg"), not the binary.
--
-- Idempotent — safe to re-run.
-- =========================================================================

-- 1. Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  false,
  5242880,                            -- 5 MB cap per file
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage RLS — first path segment is the owning user id.
--    The bucket is private; we mint short-lived signed URLs on read.
drop policy if exists "profile_read"   on storage.objects;
drop policy if exists "profile_insert" on storage.objects;
drop policy if exists "profile_update" on storage.objects;
drop policy if exists "profile_delete" on storage.objects;

create policy "profile_read" on storage.objects for select
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "profile_insert" on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "profile_update" on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'profile-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "profile_delete" on storage.objects for delete
  using (
    bucket_id = 'profile-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );
