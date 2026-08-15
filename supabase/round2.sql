-- Spotted Round 2 schema — spottedin-c
-- Self-contained: independent of the canonical maanster-market repo's migrations.
-- No agent has DB credentials; a human runs this in the Supabase SQL editor.
-- Idempotent: every `create policy` is preceded by `drop policy if exists`
-- (Postgres has no `create policy if not exists`).

-- ============================================================================
-- likes
-- ============================================================================
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own" on public.likes
  for select using (user_id = auth.uid());

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes
  for insert with check (user_id = auth.uid());

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes
  for delete using (user_id = auth.uid());

-- ============================================================================
-- bag_items
-- ============================================================================
create table if not exists public.bag_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.bag_items enable row level security;

drop policy if exists "bag_items_select_own" on public.bag_items;
create policy "bag_items_select_own" on public.bag_items
  for select using (user_id = auth.uid());

drop policy if exists "bag_items_insert_own" on public.bag_items;
create policy "bag_items_insert_own" on public.bag_items
  for insert with check (user_id = auth.uid());

drop policy if exists "bag_items_delete_own" on public.bag_items;
create policy "bag_items_delete_own" on public.bag_items
  for delete using (user_id = auth.uid());

-- ============================================================================
-- follows
-- ============================================================================
create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  followee_handle text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, followee_handle)
);

alter table public.follows enable row level security;

-- public select: shop pages need follower counts for any seller, not just self
drop policy if exists "follows_select_public" on public.follows;
create policy "follows_select_public" on public.follows
  for select using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert with check (user_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete using (user_id = auth.uid());

-- ============================================================================
-- orders
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  total_inr integer not null,
  placed_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (buyer_id = auth.uid());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (buyer_id = auth.uid());

-- ============================================================================
-- order_items
-- ============================================================================
create table if not exists public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id text not null,
  price_inr integer not null,
  title text not null,
  img text not null,
  size text not null default '',
  primary key (order_id, listing_id)
);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

-- ============================================================================
-- threads
-- ============================================================================
create table if not exists public.threads (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  peer_id uuid null references public.profiles(id),
  peer_handle text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, peer_handle)
);

alter table public.threads enable row level security;

drop policy if exists "threads_select_participant" on public.threads;
create policy "threads_select_participant" on public.threads
  for select using (auth.uid() in (owner_id, peer_id));

drop policy if exists "threads_update_participant" on public.threads;
create policy "threads_update_participant" on public.threads
  for update using (auth.uid() in (owner_id, peer_id));

drop policy if exists "threads_insert_own" on public.threads;
create policy "threads_insert_own" on public.threads
  for insert with check (owner_id = auth.uid());

-- ============================================================================
-- spotted_messages
-- ============================================================================
-- Named spotted_messages (not "messages") because a "messages" table with an
-- incompatible schema already exists in this project from an unrelated,
-- unlaunched app (codex/supabase-auth-rollout's Next.js "spotted/" prototype)
-- — CREATE TABLE IF NOT EXISTS would silently no-op against it otherwise.
create table if not exists public.spotted_messages (
  id uuid primary key,
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid null references public.profiles(id), -- null = demo counterparty canned reply
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.spotted_messages enable row level security;

drop policy if exists "spotted_messages_select_participant" on public.spotted_messages;
create policy "spotted_messages_select_participant" on public.spotted_messages
  for select using (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and auth.uid() in (t.owner_id, t.peer_id)
    )
  );

drop policy if exists "spotted_messages_insert_participant" on public.spotted_messages;
create policy "spotted_messages_insert_participant" on public.spotted_messages
  for insert with check (
    exists (
      select 1 from public.threads t
      where t.id = thread_id
        and auth.uid() in (t.owner_id, t.peer_id)
        and (
          sender_id = auth.uid()
          or (sender_id is null and t.owner_id = auth.uid())
        )
    )
  );

-- ============================================================================
-- offers
-- ============================================================================
create table if not exists public.offers (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text not null,
  amount_inr integer not null,
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;

drop policy if exists "offers_select_own" on public.offers;
create policy "offers_select_own" on public.offers
  for select using (user_id = auth.uid());

drop policy if exists "offers_insert_own" on public.offers;
create policy "offers_insert_own" on public.offers
  for insert with check (user_id = auth.uid());

-- ============================================================================
-- profiles (existing table — re-assert policies only, no schema change)
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- ============================================================================
-- listings (existing table — add policies, no schema change)
-- ============================================================================
alter table public.listings enable row level security;

drop policy if exists "listings_select_live" on public.listings;
create policy "listings_select_live" on public.listings
  for select using (status = 'live');

drop policy if exists "listings_select_own" on public.listings;
create policy "listings_select_own" on public.listings
  for select using (seller_id = auth.uid());

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings
  for insert with check (seller_id = auth.uid());

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own" on public.listings
  for update using (seller_id = auth.uid());

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own" on public.listings
  for delete using (seller_id = auth.uid());

-- ============================================================================
-- storage: listing-images bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_insert_own" on storage.objects;
create policy "listing_images_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and name like (auth.uid()::text || '/%')
  );

drop policy if exists "listing_images_select_public" on storage.objects;
create policy "listing_images_select_public" on storage.objects
  for select using (bucket_id = 'listing-images');
