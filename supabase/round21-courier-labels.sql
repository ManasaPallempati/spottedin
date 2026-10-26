-- Spotted round 21 (was round 8) — Shiprocket labels and automatic tracking
-- No agent applies this migration — a human runs it in the Supabase SQL editor.
-- Requires round20-shipping-fulfilment.sql. Idempotent; safe to re-run.
--
-- Before running: confirm `spotted_seller_pickup` does not already exist
-- (information_schema.tables) — see the note in round20.

-- ============================================================================
-- spotted_seller_pickup — where each seller's parcels are collected from
-- ============================================================================
-- The seller picks one of their own spotted_addresses. courier_location is the
-- pickup nickname registered with Shiprocket; only the courier-label Edge
-- Function (service role) writes it, and it is cleared whenever the seller
-- changes address so the new one gets registered.
create table if not exists public.spotted_seller_pickup (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  address_id uuid not null references public.spotted_addresses(id) on delete cascade,
  courier_location text,
  updated_at timestamptz not null default now()
);

alter table public.spotted_seller_pickup enable row level security;

drop policy if exists "spotted_seller_pickup_select_own" on public.spotted_seller_pickup;
create policy "spotted_seller_pickup_select_own" on public.spotted_seller_pickup
  for select using (seller_id = auth.uid());

drop policy if exists "spotted_seller_pickup_insert_own" on public.spotted_seller_pickup;
create policy "spotted_seller_pickup_insert_own" on public.spotted_seller_pickup
  for insert with check (
    seller_id = auth.uid()
    and exists (select 1 from public.spotted_addresses a where a.id = address_id and a.user_id = auth.uid())
  );

drop policy if exists "spotted_seller_pickup_update_own" on public.spotted_seller_pickup;
create policy "spotted_seller_pickup_update_own" on public.spotted_seller_pickup
  for update using (seller_id = auth.uid())
  with check (
    seller_id = auth.uid()
    and exists (select 1 from public.spotted_addresses a where a.id = address_id and a.user_id = auth.uid())
  );

grant select on public.spotted_seller_pickup to authenticated;
grant insert (seller_id, address_id, courier_location, updated_at) on public.spotted_seller_pickup to authenticated;
grant update (address_id, courier_location, updated_at) on public.spotted_seller_pickup to authenticated;
grant all on public.spotted_seller_pickup to service_role;

-- A client may only ever reset courier_location to null (forcing
-- re-registration), never point it at an arbitrary Shiprocket location.
create or replace function public.spotted_seller_pickup_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and new.courier_location is not null
     and (tg_op = 'INSERT' or new.courier_location is distinct from old.courier_location) then
    raise exception 'courier_location is managed by the server';
  end if;
  return new;
end
$$;

drop trigger if exists spotted_seller_pickup_guard on public.spotted_seller_pickup;
create trigger spotted_seller_pickup_guard
  before insert or update on public.spotted_seller_pickup
  for each row execute function public.spotted_seller_pickup_guard();

-- ============================================================================
-- orders — courier booking details (service-role writes only)
-- ============================================================================
alter table public.orders add column if not exists courier_provider text;
alter table public.orders add column if not exists courier_order_id text;
alter table public.orders add column if not exists courier_shipment_id text;
alter table public.orders add column if not exists label_url text;
alter table public.orders add column if not exists courier_status text;

do $$ begin
  alter table public.orders
    add constraint orders_courier_provider_check check (courier_provider is null or courier_provider in ('shiprocket'));
exception when duplicate_object then null; end $$;

create index if not exists orders_tracking_number_idx on public.orders (tracking_number) where tracking_number is not null;

grant select (courier_provider, courier_status, label_url) on public.orders to authenticated;
-- courier_order_id / courier_shipment_id stay server-side only (no client grant).

-- A Shiprocket-booked order is moved to shipped/delivered by tracking
-- updates; the manual "mark as shipped" path must not overwrite its AWB.
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
  where id = p_order_id and status = 'paid' and courier_provider is null;
  if not found then
    raise exception 'order is not waiting to ship';
  end if;
end
$$;
