-- Round 19: moderation queue for reports and blocks.
-- NOT applied to any database by this PR. Needs round 17 (reports, blocks)
-- first. Run on staging, then production.
--
-- Moderators are listed by hand in public.moderators; the app never writes
-- that table. Everything a moderator sees comes through the security-definer
-- functions below, which check the caller first. Members still cannot read
-- other people's reports or blocks.
--
-- Add a moderator (SQL editor):
--   insert into public.moderators (user_id)
--   select id from public.profiles where handle = '<their handle>';

-- ============================================================================
-- moderators: no client access at all.
-- ============================================================================
create table if not exists public.moderators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;
revoke all on public.moderators from anon, authenticated;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- ============================================================================
-- Report queue. p_status null returns every status. Oldest first, so the
-- longest-waiting report is on top.
-- ============================================================================
create or replace function public.moderation_reports(p_status text default 'open')
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  target_type text,
  target_id text,
  target_handle text,
  reason text,
  details text,
  reporter_handle text,
  reports_on_target bigint,
  blocks_on_handle bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can read reports' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.created_at,
    r.status,
    r.target_type,
    r.target_id,
    r.target_handle,
    r.reason,
    r.details,
    p.handle,
    (select count(*) from public.reports r2
      where r2.target_type = r.target_type and r2.target_id = r.target_id),
    (select count(*) from public.blocks b
      where r.target_handle is not null and b.blocked_handle = r.target_handle)
  from public.reports r
  left join public.profiles p on p.id = r.reporter_id
  where p_status is null or r.status = p_status
  order by r.created_at asc
  limit 200;
end;
$$;

revoke all on function public.moderation_reports(text) from public, anon;
grant execute on function public.moderation_reports(text) to authenticated;

-- ============================================================================
-- Most-blocked accounts. Counts only: who blocked whom stays private.
-- ============================================================================
create or replace function public.moderation_blocked_handles()
returns table (blocked_handle text, block_count bigint, last_blocked_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can read block counts' using errcode = '42501';
  end if;

  return query
  select b.blocked_handle, count(*), max(b.created_at)
  from public.blocks b
  group by b.blocked_handle
  order by count(*) desc, max(b.created_at) desc
  limit 50;
end;
$$;

revoke all on function public.moderation_blocked_handles() from public, anon;
grant execute on function public.moderation_blocked_handles() to authenticated;

-- ============================================================================
-- Move a report through open -> reviewing -> actioned | dismissed.
-- Changing the status takes no action on the listing or account itself.
-- ============================================================================
create or replace function public.set_report_status(p_report_id uuid, p_status text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can update reports' using errcode = '42501';
  end if;
  if p_status not in ('open', 'reviewing', 'actioned', 'dismissed') then
    raise exception 'Unknown report status %', p_status using errcode = '22023';
  end if;

  update public.reports set status = p_status where id = p_report_id;
  if not found then
    raise exception 'No report %', p_report_id using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_report_status(uuid, text) from public, anon;
grant execute on function public.set_report_status(uuid, text) to authenticated;
