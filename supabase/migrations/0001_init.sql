-- =========================================================================
-- Stormforge Archive — initial schema
--
-- Run this ONCE in the Supabase SQL Editor (Project → SQL Editor → New Query
-- → paste this whole file → click "Run").
--
-- Safe to re-run; every statement is guarded.
-- =========================================================================

-- ---------- worlds ----------
create table if not exists public.worlds (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  tagline         text,
  description     text,
  cover_gradient  text,
  theme_accent    text,
  banner_emoji    text,
  goal            jsonb,
  created_at      bigint not null,
  updated_at      bigint not null
);
create index if not exists worlds_user_idx on public.worlds(user_id);
create index if not exists worlds_updated_idx on public.worlds(updated_at desc);

alter table public.worlds enable row level security;

drop policy if exists "worlds_select_own"  on public.worlds;
drop policy if exists "worlds_insert_own"  on public.worlds;
drop policy if exists "worlds_update_own"  on public.worlds;
drop policy if exists "worlds_delete_own"  on public.worlds;
create policy "worlds_select_own" on public.worlds for select using (auth.uid() = user_id);
create policy "worlds_insert_own" on public.worlds for insert with check (auth.uid() = user_id);
create policy "worlds_update_own" on public.worlds for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "worlds_delete_own" on public.worlds for delete using (auth.uid() = user_id);


-- ---------- articles ----------
create table if not exists public.articles (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  world_id        text not null,
  category        text not null,
  title           text not null,
  summary         text,
  content_json    jsonb,
  content_text    text,
  image_data_url  text,
  gallery         jsonb,
  tags            text[],
  meta            jsonb,
  pinned          boolean default false,
  status          text default 'draft',
  created_at      bigint not null,
  updated_at      bigint not null
);
create index if not exists articles_user_idx  on public.articles(user_id);
create index if not exists articles_world_idx on public.articles(world_id);
create index if not exists articles_cat_idx   on public.articles(world_id, category);
create index if not exists articles_updated_idx on public.articles(updated_at desc);

alter table public.articles enable row level security;

drop policy if exists "articles_select_own" on public.articles;
drop policy if exists "articles_insert_own" on public.articles;
drop policy if exists "articles_update_own" on public.articles;
drop policy if exists "articles_delete_own" on public.articles;
create policy "articles_select_own" on public.articles for select using (auth.uid() = user_id);
create policy "articles_insert_own" on public.articles for insert with check (auth.uid() = user_id);
create policy "articles_update_own" on public.articles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "articles_delete_own" on public.articles for delete using (auth.uid() = user_id);


-- ---------- maps ----------
create table if not exists public.maps (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  world_id        text not null,
  name            text not null,
  description     text,
  background      text,
  aspect_ratio    real,
  show_grid       boolean default true,
  pins            jsonb default '[]'::jsonb,
  regions         jsonb default '[]'::jsonb,
  created_at      bigint not null,
  updated_at      bigint not null
);
create index if not exists maps_user_idx  on public.maps(user_id);
create index if not exists maps_world_idx on public.maps(world_id);

alter table public.maps enable row level security;

drop policy if exists "maps_select_own" on public.maps;
drop policy if exists "maps_insert_own" on public.maps;
drop policy if exists "maps_update_own" on public.maps;
drop policy if exists "maps_delete_own" on public.maps;
create policy "maps_select_own" on public.maps for select using (auth.uid() = user_id);
create policy "maps_insert_own" on public.maps for insert with check (auth.uid() = user_id);
create policy "maps_update_own" on public.maps for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "maps_delete_own" on public.maps for delete using (auth.uid() = user_id);


-- ---------- scratchpad_notes ----------
create table if not exists public.scratchpad_notes (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  world_id    text,
  content     text,
  created_at  bigint not null
);
create index if not exists scratchpad_user_idx  on public.scratchpad_notes(user_id);
create index if not exists scratchpad_world_idx on public.scratchpad_notes(world_id);

alter table public.scratchpad_notes enable row level security;

drop policy if exists "scratchpad_select_own" on public.scratchpad_notes;
drop policy if exists "scratchpad_insert_own" on public.scratchpad_notes;
drop policy if exists "scratchpad_update_own" on public.scratchpad_notes;
drop policy if exists "scratchpad_delete_own" on public.scratchpad_notes;
create policy "scratchpad_select_own" on public.scratchpad_notes for select using (auth.uid() = user_id);
create policy "scratchpad_insert_own" on public.scratchpad_notes for insert with check (auth.uid() = user_id);
create policy "scratchpad_update_own" on public.scratchpad_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scratchpad_delete_own" on public.scratchpad_notes for delete using (auth.uid() = user_id);


-- ---------- article_revisions ----------
create table if not exists public.article_revisions (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  article_id    text not null,
  world_id      text not null,
  title         text,
  summary       text,
  content_json  jsonb,
  meta          jsonb,
  created_at    bigint not null
);
create index if not exists revisions_user_idx    on public.article_revisions(user_id);
create index if not exists revisions_article_idx on public.article_revisions(article_id, created_at desc);

alter table public.article_revisions enable row level security;

drop policy if exists "revisions_select_own" on public.article_revisions;
drop policy if exists "revisions_insert_own" on public.article_revisions;
drop policy if exists "revisions_update_own" on public.article_revisions;
drop policy if exists "revisions_delete_own" on public.article_revisions;
create policy "revisions_select_own" on public.article_revisions for select using (auth.uid() = user_id);
create policy "revisions_insert_own" on public.article_revisions for insert with check (auth.uid() = user_id);
create policy "revisions_update_own" on public.article_revisions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revisions_delete_own" on public.article_revisions for delete using (auth.uid() = user_id);
