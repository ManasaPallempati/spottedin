-- Round 11 — allow 13+, with the restrictions Indian law requires for minors.
--
-- Round 10 blocked under-18s outright. That does not match the reference
-- marketplace, which allows 13+ and restricts what minors can do rather than
-- excluding them. This replaces the hard block with the same shape, but the
-- restrictions here are Indian rather than borrowed:
--
--   * DPDP Act 2023 treats anyone under 18 as a child. Processing their data
--     needs verifiable parental consent, so guardian details are recorded.
--   * The Indian Contract Act makes a minor's agreement void. A minor therefore
--     cannot form a sale contract, which is why they cannot list items — this is
--     not a policy choice that can be toggled.
--
-- 13 is the floor because below it there is no lawful basis to process the data
-- at all under most regimes, and no consent mechanism that would fix that.

alter table public.profiles
  add column if not exists guardian_email text,
  add column if not exists guardian_consent_at timestamptz;

comment on column public.profiles.guardian_consent_at is
  'When verifiable parental consent was recorded. Required under the DPDP Act before a under-18 account may be used.';

alter table public.profiles
  drop constraint if exists profiles_guardian_email_format;
alter table public.profiles
  add constraint profiles_guardian_email_format
  check (guardian_email is null or guardian_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 18 becomes a restriction boundary rather than an entry requirement.
create or replace function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is null then
    return new;
  end if;
  if new.date_of_birth > current_date then
    raise exception 'date_of_birth_in_future' using errcode = 'P0001';
  end if;
  if new.date_of_birth > current_date - interval '13 years' then
    raise exception 'under_minimum_age' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- SECURITY DEFINER so a policy can call it without every caller needing read
-- access to another person's date of birth, and STABLE so it is evaluated once
-- per statement rather than per row.
--
-- A null date of birth counts as an adult. Every profile that existed before
-- this migration has one, and treating unknown as minor would silently stop
-- current sellers from listing. That leaves a gap — an account that never
-- supplies a date of birth is treated as adult — which closes when date of
-- birth becomes required at signup. That is a separate change to the signup
-- form, not something this migration can enforce retroactively.
create or replace function public.is_adult(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select date_of_birth is null or date_of_birth <= current_date - interval '18 years'
       from public.profiles where id = uid),
    false)
$$;

revoke all on function public.is_adult(uuid) from public;
grant execute on function public.is_adult(uuid) to authenticated, anon;

-- A minor cannot form the sale contract a listing represents, so they cannot
-- create one. Reading, liking and buying are unaffected: only insert changes.
--
-- Both insert policies are dropped, not just one. The table carried two
-- permissive INSERT policies covering the same ground — "Users can create their
-- own listings" from the baseline migration and "listings_insert_own" from
-- round 2. Postgres ORs permissive policies together, so restricting one while
-- the other still allowed a bare owner check would have left the restriction
-- entirely ineffective while appearing to work.
drop policy if exists "Users can create their own listings" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;

create policy "listings_insert_own" on public.listings
  for insert
  with check (
    (select auth.uid()) is not null
    and seller_id = (select auth.uid())
    and public.is_adult((select auth.uid()))
  );

grant update (guardian_email, guardian_consent_at) on table public.profiles to authenticated;
