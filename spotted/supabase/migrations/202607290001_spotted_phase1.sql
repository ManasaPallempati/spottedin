create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  avatar_url text,
  rating numeric(2,1) not null default 5.0,
  sales integer not null default 0,
  sizes text[] not null default '{}',
  budget_min integer,
  budget_max integer,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  seller_handle text not null,
  title text not null,
  brand text not null,
  size text not null,
  condition text not null,
  era text,
  category text not null check (category in ('OUTERWEAR','TOPS','BOTTOMS','SHOES','BAGS')),
  retail_price integer,
  start_price integer not null check (start_price > 0),
  floor_price integer not null check (floor_price > 0 and floor_price <= start_price),
  drop_rate text not null check (drop_rate in ('CHILL','STANDARD','TURBO')),
  listed_at timestamptz not null default date_trunc('hour', now()),
  status text not null default 'live' check (status in ('live','sold','ended')),
  photos jsonb not null default '[]',
  description text not null default '',
  watching integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.spots (
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  alerts_on boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.deck_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  signal text not null check (signal in ('spot','drop')),
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'sent' check (status in ('sent','accepted','declined','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'text' check (type in ('text','offer')),
  body text not null default '',
  offer_id uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  offer_id uuid references public.offers(id),
  price_paid integer not null check (price_paid > 0),
  shipping_option text not null check (shipping_option in ('tracked','express')),
  status text not null default 'payment_pending',
  stripe_checkout_session_id text unique,
  tracking_events jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.fits (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  video_url text,
  poster jsonb,
  caption text not null,
  look_listing_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.wanted_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  photo_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists listings_status_category_idx on public.listings(status, category);
create index if not exists offers_expiry_idx on public.offers(status, expires_at);
create index if not exists messages_thread_created_idx on public.messages(thread_id, created_at);

-- Buyer-facing projection deliberately excludes start_price and floor_price.
create or replace view public.public_listings
with (security_barrier = true)
as
select
  l.id,
  l.title,
  l.brand,
  l.size,
  l.condition,
  l.era,
  l.category,
  l.retail_price,
  greatest(
    l.floor_price,
    l.start_price - case l.drop_rate
      when 'CHILL' then floor(extract(epoch from (now() - l.listed_at)) / 86400)::integer
      when 'STANDARD' then floor(extract(epoch from (now() - l.listed_at)) / 3600)::integer
      when 'TURBO' then floor(extract(epoch from (now() - l.listed_at)) / 3600)::integer * 2
      else 0
    end
  ) as current_price,
  l.drop_rate,
  l.listed_at,
  l.status,
  l.seller_handle,
  (select count(*)::integer from public.spots s where s.listing_id = l.id) as spots,
  l.watching,
  l.description,
  l.photos
from public.listings l
where l.status = 'live';

revoke all on public.listings from anon, authenticated;
grant select on public.public_listings to anon, authenticated;

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.spots enable row level security;
alter table public.deck_signals enable row level security;
alter table public.offers enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.fits enable row level security;
alter table public.wanted_posts enable row level security;
alter table public.waitlist enable row level security;

create policy "public profiles are readable" on public.users for select using (true);
create policy "users update themselves" on public.users for update using (auth.uid() = id);
create policy "sellers manage their listings" on public.listings for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "users manage their spots" on public.spots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users write their deck signals" on public.deck_signals for insert
  with check (auth.uid() = user_id);
create policy "offer participants read" on public.offers for select using (
  auth.uid() = buyer_id or auth.uid() = (select seller_id from public.listings where id = listing_id)
);
create policy "buyers send offers" on public.offers for insert with check (auth.uid() = buyer_id);
create policy "sellers update offers" on public.offers for update using (
  auth.uid() = (select seller_id from public.listings where id = listing_id)
);
create policy "thread participants read" on public.threads for select
  using (auth.uid() in (buyer_id, seller_id));
create policy "thread participants create" on public.threads for insert
  with check (auth.uid() in (buyer_id, seller_id));
create policy "thread participants read messages" on public.messages for select using (
  exists (select 1 from public.threads t where t.id = thread_id and auth.uid() in (t.buyer_id, t.seller_id))
);
create policy "thread participants send messages" on public.messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.threads t where t.id = thread_id and auth.uid() in (t.buyer_id, t.seller_id)
  )
);
create policy "order participants read" on public.orders for select
  using (auth.uid() in (buyer_id, seller_id));
create policy "fit feed is public" on public.fits for select using (true);
create policy "sellers manage fits" on public.fits for all
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "wanted posts are public" on public.wanted_posts for select using (true);
create policy "users create wanted posts" on public.wanted_posts for insert
  with check (auth.uid() = user_id);
create policy "anyone may join waitlist" on public.waitlist for insert with check (true);

create or replace function public.expire_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.offers
  set status = 'expired'
  where status = 'sent' and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_offers() from public, anon, authenticated;
