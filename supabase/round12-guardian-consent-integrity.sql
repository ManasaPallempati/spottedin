-- Round 12 — stop a minor from consenting on their own behalf.
--
-- Round 11 granted update on both guardian_email and guardian_consent_at to
-- authenticated. That made the consent timestamp writable by the account it is
-- meant to constrain: a 15-year-old could PATCH their own profile, set
-- guardian_consent_at, and satisfy every check that reads it. Verified against
-- the API before this migration — the write succeeded.
--
-- The address to ask is the child's to provide, so guardian_email stays
-- writable. Whether consent was actually given is not, and can only be recorded
-- by the service role after the guardian confirms out of band.

revoke update (guardian_consent_at) on table public.profiles from authenticated;

-- Belt and braces: the grant above is the control, but a trigger states the
-- rule in one place and survives someone re-granting the column later without
-- realising why it was withheld.
--
-- The check targets the `authenticated` role specifically rather than
-- "anything that is not service_role". request.jwt.claim.role is only set for
-- requests arriving through PostgREST, so the broader form also blocked direct
-- SQL — meaning an administrator could not correct a consent record, and
-- neither could a migration. Naming the role blocks the account the rule is
-- about and leaves every out-of-band path alone.
create or replace function public.protect_guardian_consent()
returns trigger
language plpgsql
as $$
begin
  if new.guardian_consent_at is distinct from old.guardian_consent_at
     and current_setting('request.jwt.claim.role', true) = 'authenticated' then
    raise exception 'guardian_consent_not_self_grantable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_guardian_consent on public.profiles;
create trigger profiles_protect_guardian_consent
  before update on public.profiles
  for each row
  execute function public.protect_guardian_consent();
