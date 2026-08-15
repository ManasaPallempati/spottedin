create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  name text not null,
  avatar_emoji text not null default '🙂',
  bio text not null default '',
  city text not null default 'India',
  rating numeric(2, 1) not null default 0,
  sales integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^@[a-z0-9][a-z0-9._]{2,29}$'),
  constraint profiles_name_length check (char_length(name) between 1 and 80),
  constraint profiles_avatar_length check (char_length(avatar_emoji) between 1 and 16),
  constraint profiles_bio_length check (char_length(bio) <= 500),
  constraint profiles_city_length check (char_length(city) between 1 and 80),
  constraint profiles_rating_range check (rating between 0 and 5),
  constraint profiles_sales_nonnegative check (sales >= 0)
);

create unique index profiles_handle_ci_unique on public.profiles (lower(handle));

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert (id, handle, name, avatar_emoji, bio, city) on table public.profiles to authenticated;
grant update (handle, name, avatar_emoji, bio, city) on table public.profiles to authenticated;

create policy "Public profiles are viewable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

revoke execute on function public.set_profile_updated_at() from public, anon, authenticated;
