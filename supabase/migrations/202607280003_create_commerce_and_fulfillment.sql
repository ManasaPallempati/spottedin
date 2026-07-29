create table public.seller_fulfillment (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pickup_location text not null,
  pickup_postal_code text not null,
  default_weight_kg numeric(8, 3) not null,
  default_length_cm numeric(8, 2) not null,
  default_breadth_cm numeric(8, 2) not null,
  default_height_cm numeric(8, 2) not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_fulfillment_pickup_length check (char_length(pickup_location) between 1 and 64),
  constraint seller_fulfillment_postal_code check (pickup_postal_code ~ '^[1-9][0-9]{5}$'),
  constraint seller_fulfillment_weight check (default_weight_kg > 0 and default_weight_kg <= 100),
  constraint seller_fulfillment_dimensions check (
    default_length_cm > 0 and default_length_cm <= 200
    and default_breadth_cm > 0 and default_breadth_cm <= 200
    and default_height_cm > 0 and default_height_cm <= 200
  )
);

alter table public.seller_fulfillment enable row level security;
revoke all on table public.seller_fulfillment from anon, authenticated;
grant select on table public.seller_fulfillment to authenticated;
grant insert (
  user_id,
  pickup_location,
  pickup_postal_code,
  default_weight_kg,
  default_length_cm,
  default_breadth_cm,
  default_height_cm,
  enabled
) on table public.seller_fulfillment to authenticated;
grant update (
  pickup_location,
  pickup_postal_code,
  default_weight_kg,
  default_length_cm,
  default_breadth_cm,
  default_height_cm,
  enabled
) on table public.seller_fulfillment to authenticated;

create policy "Sellers can read their fulfillment settings"
  on public.seller_fulfillment
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Sellers can create their fulfillment settings"
  on public.seller_fulfillment
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Sellers can update their fulfillment settings"
  on public.seller_fulfillment
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger seller_fulfillment_set_updated_at
before update on public.seller_fulfillment
for each row execute function public.set_profile_updated_at();

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  item_price_inr integer not null,
  platform_fee_inr integer not null default 0,
  shipping_fee_inr integer not null default 0,
  total_inr integer not null,
  currency text not null default 'INR',
  status text not null default 'payment_pending',
  shipping_address jsonb not null,
  courier_id integer,
  courier_name text,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_orders_distinct_parties check (buyer_id <> seller_id),
  constraint commerce_orders_amounts_nonnegative check (
    item_price_inr > 0 and platform_fee_inr >= 0 and shipping_fee_inr >= 0
  ),
  constraint commerce_orders_total_matches check (
    total_inr = item_price_inr + platform_fee_inr + shipping_fee_inr
  ),
  constraint commerce_orders_currency check (currency = 'INR'),
  constraint commerce_orders_status check (
    status in (
      'payment_pending',
      'payment_authorized',
      'paid',
      'payment_failed',
      'expired',
      'cancelled',
      'payment_conflict',
      'refunded'
    )
  ),
  constraint commerce_orders_shipping_address_object check (
    jsonb_typeof(shipping_address) = 'object'
  )
);

create unique index commerce_orders_one_active_checkout_per_listing
  on public.commerce_orders (listing_id)
  where status in ('payment_pending', 'payment_authorized', 'paid');

create index commerce_orders_buyer_created_at_idx
  on public.commerce_orders (buyer_id, created_at desc);

create index commerce_orders_seller_created_at_idx
  on public.commerce_orders (seller_id, created_at desc);

alter table public.commerce_orders enable row level security;
revoke all on table public.commerce_orders from anon, authenticated;
grant select on table public.commerce_orders to authenticated;

create policy "Buyers and sellers can read their orders"
  on public.commerce_orders
  for select
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  );

create trigger commerce_orders_set_updated_at
before update on public.commerce_orders
for each row execute function public.set_profile_updated_at();

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete cascade,
  provider text not null default 'shiprocket',
  provider_order_id text,
  provider_shipment_id text,
  awb_code text,
  courier_id integer,
  courier_name text,
  status text not null default 'not_created',
  tracking_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_provider check (provider = 'shiprocket'),
  constraint shipments_status check (
    status in (
      'not_created',
      'order_created',
      'awb_assigned',
      'pickup_scheduled',
      'in_transit',
      'delivered',
      'cancelled',
      'failed'
    )
  )
);

create index shipments_awb_code_idx on public.shipments (awb_code);

alter table public.shipments enable row level security;
revoke all on table public.shipments from anon, authenticated;
grant select on table public.shipments to authenticated;

create policy "Order parties can read shipment status"
  on public.shipments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.commerce_orders commerce_order
      where commerce_order.id = shipments.order_id
        and (
          commerce_order.buyer_id = (select auth.uid())
          or commerce_order.seller_id = (select auth.uid())
        )
    )
  );

create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_profile_updated_at();

create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  constraint provider_events_provider check (provider in ('razorpay', 'shiprocket')),
  constraint provider_events_unique unique (provider, event_id)
);

alter table public.provider_events enable row level security;
revoke all on table public.provider_events from public, anon, authenticated;

create function public.finalize_paid_commerce_order(
  target_order_id uuid,
  target_payment_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.commerce_orders;
begin
  select *
  into target
  from public.commerce_orders
  where id = target_order_id
  for update;

  if target.id is null then
    raise exception 'Commerce order not found' using errcode = '22023';
  end if;

  if target.status = 'paid' then
    return 'paid';
  end if;

  update public.listings
  set status = 'sold'
  where id = target.listing_id
    and status = 'live';

  if found then
    update public.commerce_orders
    set
      status = 'paid',
      razorpay_payment_id = target_payment_id,
      paid_at = now()
    where id = target_order_id;
    return 'paid';
  end if;

  update public.commerce_orders
  set
    status = 'payment_conflict',
    razorpay_payment_id = target_payment_id
  where id = target_order_id;
  return 'payment_conflict';
end;
$$;

revoke all on function public.finalize_paid_commerce_order(uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_paid_commerce_order(uuid, text)
  to service_role;

