-- Round 18: stop exposing private profile fields to everyone.
--
-- profiles has a public read policy, so its COLUMN grants decide what anyone
-- can see. On staging, a read with the public anon key returned
-- date_of_birth, guardian_email, guardian_consent_at, deletion_reason,
-- first_name and last_name for every account (audit, 2026-10-23):
--   * round10 explicitly granted SELECT on date_of_birth (and first/last
--     name, country, interest) to anon and authenticated;
--   * guardian_email, guardian_consent_at and deletion_reason were readable
--     although no migration grants them, so the hosted project also carries a
--     broader table-level SELECT grant than the baseline describes.
-- Accounts may belong to 13-17 year olds (round11), so this is a minor's
-- birth date and their guardian's email, readable by anyone.
--
-- After this round:
--   * anon and authenticated can SELECT only the public columns below;
--   * a signed-in person reads their own full row through my_profile();
--   * INSERT/UPDATE grants are unchanged (rounds 10, 11, 12, 15), so signup
--     and Account details keep working. The client no longer asks for the
--     row back from INSERT/UPDATE (RETURNING would need SELECT on every
--     column); it re-reads through my_profile() instead.
--
-- Apply to STAGING first, then verify with a real signup and an Account
-- details save before production (KNOWN_GAPS: per-column grants fail
-- silently). Production has none of rounds 7-17 yet; this round must ship
-- together with rounds 10-12, never after them.

begin;

-- REVOKE on the table also revokes every column-level SELECT grant.
revoke select on table public.profiles from anon, authenticated;

grant select (
  id,
  handle,
  name,
  avatar_emoji,
  avatar_url,
  bio,
  city,
  rating,
  sales,
  created_at,
  updated_at,
  deleted_at
) on table public.profiles to anon, authenticated;

-- The caller's own row, every column. SECURITY DEFINER so it can read the
-- columns the caller has no SELECT on; it only ever returns auth.uid()'s row.
create or replace function public.my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

revoke all on function public.my_profile() from public;
grant execute on function public.my_profile() to authenticated;

commit;

-- Verify (SQL editor, as postgres): should list only the public columns for anon.
--   select column_name from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'profiles'
--      and grantee = 'anon' and privilege_type = 'SELECT' order by 1;
--
-- Rollback (restores round 10's grants; the broader table grant this round
-- removed should not be restored):
--   grant select (first_name, last_name, avatar_url, date_of_birth, country, interest)
--     on table public.profiles to authenticated, anon;
--   drop function if exists public.my_profile();
