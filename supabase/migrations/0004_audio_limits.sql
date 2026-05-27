-- =========================================================================
-- Stormforge — Phase 3.3.1: audio quotas
--
-- Lock down storage usage on the free tier:
--   1. Drop the per-file cap from 20 MB to 10 MB
--   2. Enforce a 4-tracks-per-world ceiling at the database level
--      (so even a direct API call can't bypass the UI guard)
--
-- Idempotent — safe to re-run.
-- =========================================================================

-- 1. Shrink the bucket's per-file cap.
update storage.buckets
   set file_size_limit = 10485760   -- 10 MB
 where id = 'world-audio';

-- 2. Trigger-enforced cap of 4 tracks per world on inserts.
create or replace function public.enforce_audio_track_cap()
returns trigger
language plpgsql
as $$
declare
  cnt int;
begin
  select count(*) into cnt
    from public.world_audio_tracks
   where world_id = new.world_id;
  if cnt >= 4 then
    raise exception 'This world already has the maximum of 4 ambient tracks. Remove one before adding another.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audio_track_cap on public.world_audio_tracks;
create trigger trg_audio_track_cap
  before insert on public.world_audio_tracks
  for each row execute function public.enforce_audio_track_cap();
