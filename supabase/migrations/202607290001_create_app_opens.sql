create table public.app_opens (
  id uuid primary key default gen_random_uuid(),
  ua text not null default '',
  path text not null default '',
  created_at timestamptz not null default now(),
  constraint app_opens_ua_length check (char_length(ua) <= 400),
  constraint app_opens_path_length check (char_length(path) <= 200)
);

alter table public.app_opens enable row level security;

revoke all on table public.app_opens from anon, authenticated;
grant insert (ua, path) on table public.app_opens to anon, authenticated;

create policy "Anyone can log an app open"
  on public.app_opens for insert
  to anon, authenticated
  with check (true);
