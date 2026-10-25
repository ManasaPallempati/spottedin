-- Spotted Round 7 — saved addresses, buyer fee + flat shipping, order tracking
-- No agent applies this migration — a human runs it in the Supabase SQL editor.
-- Requires round6-razorpay-checkout.sql (payments table, orders.payment_*).
-- Idempotent: guarded creates, drop-before-create policies, exception-guarded
-- constraint adds, create-or-replace functions. Safe to re-run.
--
-- Before running: confirm `spotted_addresses` does not already exist
-- (select * from information_schema.tables where table_name = 'spotted_addresses')
-- — this database carries a second, unrelated schema from an old prototype,
-- which is why the table is prefixed like spotted_messages.

-- ============================================================================
-- spotted_addresses — a buyer's saved shipping addresses
-- ============================================================================
create table if not exists public.spotted_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  line1 text not null check (char_length(line1) between 1 and 120),
  line2 text not null default '' check (char_length(line2) <= 120),
  city text not null check (char_length(city) between 1 and 60),
  state text not null check (char_length(state) between 1 and 60),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  created_at timestamptz not null default now()
);

create index if not exists spotted_addresses_user_idx on public.spotted_addresses (user_id, created_at desc);

alter table public.spotted_addresses enable row level security;

drop policy if exists "spotted_addresses_select_own" on public.spotted_addresses;
create policy "spotted_addresses_select_own" on public.spotted_addresses
  for select using (user_id = auth.uid());

drop policy if exists "spotted_addresses_insert_own" on public.spotted_addresses;
create policy "spotted_addresses_insert_own" on public.spotted_addresses
  for insert with check (user_id = auth.uid());

drop policy if exists "spotted_addresses_delete_own" on public.spotted_addresses;
create policy "spotted_addresses_delete_own" on public.spotted_addresses
  for delete using (user_id = auth.uid());

grant select, delete on public.spotted_addresses to authenticated;
grant insert (id, user_id, name, phone, line1, line2, city, state, pincode)
  on public.spotted_addresses to authenticated;
grant all on public.spotted_addresses to service_role;

-- ============================================================================
-- orders — one order per seller, with charges, ship-to snapshot and tracking
-- ============================================================================
-- total_inr stays item-price-only (unchanged meaning). What the buyer paid is
-- total_inr + shipping_inr + buyer_fee_inr. ship_to is a copy of the address
-- at checkout so later address edits never rewrite history.
alter table public.orders add column if not exists seller_id uuid;
alter table public.orders add column if not exists ship_to jsonb;
alter table public.orders add column if not exists shipping_inr integer not null default 0;
alter table public.orders add column if not exists buyer_fee_inr integer not null default 0;
alter table public.orders add column if not exists status text not null default 'paid';
alter table public.orders add column if not exists courier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;

do $$ begin
  alter table public.orders
    add constraint orders_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders
    add constraint orders_status_check check (status in ('paid', 'shipped', 'delivered', 'cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders
    add constraint orders_charges_nonnegative check (shipping_inr >= 0 and buyer_fee_inr >= 0);
exception when duplicate_object then null; end $$;

-- The demo checkout inserts these alongside round6's four columns. status,
-- courier, tracking and timestamps are never client-writable: they only move
-- through the security-definer functions below.
grant insert (seller_id, ship_to, shipping_inr, buyer_fee_inr) on public.orders to authenticated;
grant select (seller_id, ship_to, shipping_inr, buyer_fee_inr, status, courier, tracking_number, shipped_at, delivered_at)
  on public.orders to authenticated;

-- payments carries the same charges so the Edge Function can finalize the
-- order exactly as quoted.
alter table public.payments add column if not exists seller_id uuid;
alter table public.payments add column if not exists ship_to jsonb;
alter table public.payments add column if not exists shipping_inr integer not null default 0;
alter table public.payments add column if not exists buyer_fee_inr integer not null default 0;

-- ============================================================================
-- Seller access to their sales
-- ============================================================================
-- Whether the caller sold an order is decided from the listings the order
-- contains, never from orders.seller_id (which the demo path writes from the
-- client). security definer keeps the orders <-> order_items policies from
-- recursing into each other.
create or replace function public.is_order_seller(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.listings l on l.id::text = oi.listing_id
    where oi.order_id = p_order_id
      and l.seller_id = auth.uid()
  )
$$;

grant execute on function public.is_order_seller(uuid) to authenticated;

drop policy if exists "orders_select_seller" on public.orders;
create policy "orders_select_seller" on public.orders
  for select using (public.is_order_seller(id));

drop policy if exists "order_items_select_seller" on public.order_items;
create policy "order_items_select_seller" on public.order_items
  for select using (public.is_order_seller(order_id));

-- ============================================================================
-- Fulfilment transitions: paid -> shipped (seller), shipped -> delivered (buyer)
-- ============================================================================
create or replace function public.mark_order_shipped(p_order_id uuid, p_courier text, p_tracking text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_order_seller(p_order_id) then
    raise exception 'not the seller of this order';
  end if;
  if char_length(coalesce(trim(p_courier), '')) not between 1 and 40
     or char_length(coalesce(trim(p_tracking), '')) not between 4 and 40 then
    raise exception 'courier and tracking number are required';
  end if;
  update public.orders
  set status = 'shipped', courier = trim(p_courier), tracking_number = trim(p_tracking), shipped_at = now()
  where id = p_order_id and status = 'paid';
  if not found then
    raise exception 'order is not waiting to ship';
  end if;
end
$$;

create or replace function public.mark_order_received(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'delivered', delivered_at = now()
  where id = p_order_id and buyer_id = auth.uid() and status = 'shipped';
  if not found then
    raise exception 'order is not on its way';
  end if;
end
$$;

grant execute on function public.mark_order_shipped(uuid, text, text) to authenticated;
grant execute on function public.mark_order_received(uuid) to authenticated;
