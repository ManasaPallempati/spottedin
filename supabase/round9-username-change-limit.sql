-- Round 9 — let people edit their profile, and rate-limit username changes.
--
-- Depop allows a username change once every 30 days. The reason is not
-- cosmetic: a handle is a seller's shop identity and the /shop/:handle URL
-- buyers use to find them, so unrestricted renaming enables both impersonation
-- (free a name, then take it) and scam-and-rename.
--
-- Enforced with a trigger rather than in the form. RLS cannot express this: a
-- WITH CHECK clause only sees the new row, and this rule needs to compare the
-- new handle against the old one and against when it last changed. A client-side
-- check would also be bypassed by anything calling PostgREST directly.

alter table public.profiles
  add column if not exists handle_changed_at timestamptz;

comment on column public.profiles.handle_changed_at is
  'When the handle was last changed. Null means never changed since signup, which does not count against the limit.';

create or replace function public.enforce_handle_change_limit()
returns trigger
language plpgsql
as $$
begin
  if new.handle is not distinct from old.handle then
    return new;
  end if;

  -- Account deletion anonymises the handle in the same statement that sets
  -- deleted_at. That must never be rate-limited: someone who changed their
  -- username yesterday would otherwise be unable to close their account.
  if new.deleted_at is not null then
    return new;
  end if;

  if old.handle_changed_at is not null
     and old.handle_changed_at > now() - interval '30 days' then
    raise exception 'handle_change_too_soon'
      using errcode = 'P0001',
            hint = to_char(old.handle_changed_at + interval '30 days', 'YYYY-MM-DD');
  end if;

  new.handle_changed_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_handle_change_limit on public.profiles;
create trigger profiles_handle_change_limit
  before update on public.profiles
  for each row
  execute function public.enforce_handle_change_limit();

-- The client needs to read handle_changed_at to tell someone when their next
-- change is allowed, and profiles_select_public already permits reading the
-- table. The column is deliberately absent from the update grant: only the
-- trigger sets it, so a client cannot reset its own cooldown.
grant select (handle_changed_at) on table public.profiles to authenticated, anon;
