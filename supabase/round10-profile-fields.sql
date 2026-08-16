-- Round 10 — the remaining Account details fields.
--
-- Adds first/last name, profile picture, date of birth, country, department
-- interest, and a deletion reason.
--
-- Age is enforced at 18, not merely recorded. Under India's DPDP Act 2023
-- anyone under 18 is a child, and processing their data requires verifiable
-- parental consent — an obligation this app is in no position to meet. The
-- Indian Contract Act also makes agreements with minors void, so a minor cannot
-- form the sale contract a marketplace depends on.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text,
  add column if not exists date_of_birth date,
  add column if not exists country text not null default 'IN',
  add column if not exists interest text,
  add column if not exists deletion_reason text;

-- Length caps mirror the existing name/bio constraints. All are nullable
-- because existing rows predate them and nobody should be locked out of their
-- profile until they fill everything in.
alter table public.profiles
  drop constraint if exists profiles_first_name_length;
alter table public.profiles
  add constraint profiles_first_name_length
  check (first_name is null or char_length(first_name) between 1 and 40);

alter table public.profiles
  drop constraint if exists profiles_last_name_length;
alter table public.profiles
  add constraint profiles_last_name_length
  check (last_name is null or char_length(last_name) between 1 and 40);

-- ISO 3166-1 alpha-2. Stored rather than a display name so the label can be
-- translated or corrected without a data migration.
alter table public.profiles
  drop constraint if exists profiles_country_format;
alter table public.profiles
  add constraint profiles_country_format
  check (country ~ '^[A-Z]{2}$');

alter table public.profiles
  drop constraint if exists profiles_interest_valid;
alter table public.profiles
  add constraint profiles_interest_valid
  check (interest is null or interest in ('womenswear', 'menswear', 'both'));

-- Free text is deliberately not allowed: the list is fixed so it can be counted,
-- and so nothing identifying ends up attached to an anonymised row.
alter table public.profiles
  drop constraint if exists profiles_deletion_reason_valid;
alter table public.profiles
  add constraint profiles_deletion_reason_valid
  check (
    deletion_reason is null
    or deletion_reason in (
      'not_using', 'new_account', 'not_selling', 'transaction_issue',
      'policies', 'fees', 'safety_privacy', 'other'
    )
  );

-- Age cannot be a check constraint: it depends on the current date, and CHECK
-- expressions must be immutable. A trigger is the only correct place.
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
  if new.date_of_birth > current_date - interval '18 years' then
    raise exception 'under_minimum_age' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_minimum_age on public.profiles;
create trigger profiles_minimum_age
  before insert or update on public.profiles
  for each row
  execute function public.enforce_minimum_age();

-- The column grants are explicit (see the baseline migration), so new columns
-- are invisible to the client until named here. deletion_reason is writable
-- because the person chooses it on the way out; avatar_url points at the public
-- listing-images bucket the app already uploads to.
grant update (first_name, last_name, avatar_url, date_of_birth, country, interest, deletion_reason)
  on table public.profiles to authenticated;

grant select (first_name, last_name, avatar_url, date_of_birth, country, interest)
  on table public.profiles to authenticated, anon;
