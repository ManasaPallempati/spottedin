-- Round 22: saves (private bookmarks), like Depop's "My saves".
-- NOT applied to any database by this PR. Run on staging, then production.
-- Same shape as public.likes (round 2): one row per person per listing, and
-- only the owner can read, add or remove their rows. Saves are never counted
-- or shown to sellers.
--
-- Before running: confirm public.saves does not exist yet
-- (select table_name from information_schema.tables
--  where table_schema = 'public' and table_name = 'saves';  -- expect 0 rows)

create table if not exists public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists saves_user_created_idx on public.saves (user_id, created_at desc);

alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own" on public.saves
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own" on public.saves
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.saves from anon;
grant select, insert, delete on public.saves to authenticated;
grant all on public.saves to service_role;
