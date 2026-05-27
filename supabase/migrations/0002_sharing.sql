-- =========================================================================
-- Stormforge Archive — Phase 3.2.1: Sharing & Collaboration
--
-- Adds the world_members table and updated RLS policies so invited users
-- can read/edit a shared world at their assigned role.
--
-- Run this ONCE in the Supabase SQL Editor (Project → SQL Editor → New Query
-- → paste this whole file → click "Run").
--
-- Idempotent — safe to re-run; every statement is guarded.
-- =========================================================================

-- ---------- 1. world_members table ----------
create table if not exists public.world_members (
  id           uuid primary key default gen_random_uuid(),
  world_id     text not null,
  user_id      uuid references auth.users(id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('viewer','editor')),
  invited_by   uuid not null references auth.users(id) on delete cascade,
  invited_at   bigint not null,
  accepted_at  bigint
);

create unique index if not exists wm_world_email_idx
  on public.world_members(world_id, lower(email));
create index if not exists wm_world_idx on public.world_members(world_id);
create index if not exists wm_user_idx
  on public.world_members(user_id) where user_id is not null;

alter table public.world_members enable row level security;

-- Owner of the world can do anything with its members.
-- The invited user (matched by user_id once accepted) can see only their own row.
drop policy if exists "wm_owner_all" on public.world_members;
drop policy if exists "wm_self_select" on public.world_members;

create policy "wm_owner_all" on public.world_members for all
  using (
    exists (select 1 from public.worlds w
            where w.id = world_members.world_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.worlds w
            where w.id = world_members.world_id and w.user_id = auth.uid())
  );

create policy "wm_self_select" on public.world_members for select
  using (user_id = auth.uid());

-- ---------- 2. Helper functions (security definer so RLS recursion is avoided) ----------
create or replace function public.is_world_member(wid text)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.world_members wm
    where wm.world_id = wid
      and wm.user_id = auth.uid()
      and wm.accepted_at is not null
  );
$$;

create or replace function public.is_world_editor(wid text)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.world_members wm
    where wm.world_id = wid
      and wm.user_id = auth.uid()
      and wm.accepted_at is not null
      and wm.role = 'editor'
  );
$$;

create or replace function public.can_view_world(wid text)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.worlds w
                 where w.id = wid and w.user_id = auth.uid())
      or public.is_world_member(wid);
$$;

create or replace function public.can_edit_world(wid text)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.worlds w
                 where w.id = wid and w.user_id = auth.uid())
      or public.is_world_editor(wid);
$$;

grant execute on function public.is_world_member(text) to authenticated;
grant execute on function public.is_world_editor(text) to authenticated;
grant execute on function public.can_view_world(text) to authenticated;
grant execute on function public.can_edit_world(text) to authenticated;

-- ---------- 3. Updated RLS on worlds ----------
-- SELECT: owner OR accepted member
-- INSERT/UPDATE/DELETE: owner only (unchanged)
drop policy if exists "worlds_select_own" on public.worlds;
drop policy if exists "worlds_select" on public.worlds;
create policy "worlds_select" on public.worlds for select
  using (auth.uid() = user_id or public.is_world_member(id));

-- (INSERT / UPDATE / DELETE policies from 0001_init.sql remain in place)

-- ---------- 4. Updated RLS on articles ----------
drop policy if exists "articles_select_own" on public.articles;
drop policy if exists "articles_insert_own" on public.articles;
drop policy if exists "articles_update_own" on public.articles;
drop policy if exists "articles_delete_own" on public.articles;
drop policy if exists "articles_select" on public.articles;
drop policy if exists "articles_insert" on public.articles;
drop policy if exists "articles_update" on public.articles;
drop policy if exists "articles_delete" on public.articles;

create policy "articles_select" on public.articles for select
  using (public.can_view_world(world_id));
create policy "articles_insert" on public.articles for insert
  with check (auth.uid() = user_id and public.can_edit_world(world_id));
create policy "articles_update" on public.articles for update
  using (public.can_edit_world(world_id))
  with check (public.can_edit_world(world_id));
create policy "articles_delete" on public.articles for delete
  using (public.can_edit_world(world_id));

-- ---------- 5. Updated RLS on maps ----------
drop policy if exists "maps_select_own" on public.maps;
drop policy if exists "maps_insert_own" on public.maps;
drop policy if exists "maps_update_own" on public.maps;
drop policy if exists "maps_delete_own" on public.maps;
drop policy if exists "maps_select" on public.maps;
drop policy if exists "maps_insert" on public.maps;
drop policy if exists "maps_update" on public.maps;
drop policy if exists "maps_delete" on public.maps;

create policy "maps_select" on public.maps for select
  using (public.can_view_world(world_id));
create policy "maps_insert" on public.maps for insert
  with check (auth.uid() = user_id and public.can_edit_world(world_id));
create policy "maps_update" on public.maps for update
  using (public.can_edit_world(world_id))
  with check (public.can_edit_world(world_id));
create policy "maps_delete" on public.maps for delete
  using (public.can_edit_world(world_id));

-- ---------- 6. scratchpad_notes + article_revisions stay owner-only ----------
-- No policy changes; the originals from 0001_init.sql are correct.

-- ---------- 7. claim_pending_invites RPC ----------
-- Called by the client after sign-in; attaches any invites whose email matches
-- the newly-authenticated user. Returns the number of invites claimed.
create or replace function public.claim_pending_invites()
returns int
language plpgsql security definer
set search_path = public, auth
as $$
declare
  updated_count int;
  user_email    text;
begin
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then return 0; end if;

  update public.world_members
  set user_id = auth.uid(),
      accepted_at = (extract(epoch from now()) * 1000)::bigint
  where lower(email) = lower(user_email)
    and user_id is null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.claim_pending_invites() to authenticated;
