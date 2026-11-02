-- Round 17: Report and Block (listings, profiles, chats).
-- NOT applied to any database by this PR. Run on staging first, then production.
-- Handles are used as the target key, matching follows.followee_handle and the
-- handle-keyed shop/thread routes.

-- ============================================================================
-- reports: write-only for members; moderators read via the service role.
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'profile', 'thread')),
  target_id text not null,              -- listing id, or the handle for profile/thread
  target_handle text,                   -- the person responsible, when known
  reason text not null check (reason in ('prohibited_item', 'counterfeit', 'scam', 'harassment', 'inappropriate', 'spam', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
-- One open report per reporter per target keeps a double tap from filing twice.
create unique index if not exists reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id) where status = 'open';

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, target_handle, reason, details) on public.reports to authenticated;

-- ============================================================================
-- blocks: private to the blocker.
-- ============================================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_handle text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_handle)
);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;
