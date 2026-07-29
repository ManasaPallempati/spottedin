create table public.seller_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'razorpay_route',
  razorpay_account_id text unique,
  status text not null default 'not_started',
  transfers_enabled boolean not null default false,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_payout_accounts_provider check (provider = 'razorpay_route'),
  constraint seller_payout_accounts_status check (
    status in ('not_started', 'account_created', 'kyc_pending', 'activated', 'suspended', 'rejected')
  ),
  constraint seller_payout_accounts_provider_id check (
    razorpay_account_id is null
    or razorpay_account_id ~ '^acc_[A-Za-z0-9]{8,32}$'
  ),
  constraint seller_payout_accounts_enabled_status check (
    not transfers_enabled or status = 'activated'
  )
);

alter table public.seller_payout_accounts enable row level security;
revoke all on table public.seller_payout_accounts from anon, authenticated;
grant select on table public.seller_payout_accounts to authenticated;

create policy "Sellers can read their payout readiness"
  on public.seller_payout_accounts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create trigger seller_payout_accounts_set_updated_at
before update on public.seller_payout_accounts
for each row execute function public.set_profile_updated_at();

create table public.route_transfers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  provider text not null default 'razorpay_route',
  linked_account_id text,
  razorpay_transfer_id text unique,
  amount_inr integer not null,
  currency text not null default 'INR',
  status text not null default 'seller_not_ready',
  settlement_status text,
  on_hold boolean not null default true,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_transfers_provider check (provider = 'razorpay_route'),
  constraint route_transfers_amount check (amount_inr > 0),
  constraint route_transfers_currency check (currency = 'INR'),
  constraint route_transfers_status check (
    status in (
      'seller_not_ready',
      'creating',
      'on_hold',
      'ready_to_release',
      'processed',
      'failed',
      'reversed',
      'partially_reversed'
    )
  ),
  constraint route_transfers_settlement_status check (
    settlement_status is null
    or settlement_status in ('pending', 'on_hold', 'settled')
  )
);

create index route_transfers_seller_created_at_idx
  on public.route_transfers (seller_id, created_at desc);

alter table public.route_transfers enable row level security;
revoke all on table public.route_transfers from anon, authenticated;
grant select on table public.route_transfers to authenticated;

create policy "Sellers can read their Route transfers"
  on public.route_transfers
  for select
  to authenticated
  using (seller_id = (select auth.uid()));

create trigger route_transfers_set_updated_at
before update on public.route_transfers
for each row execute function public.set_profile_updated_at();

create function public.claim_route_transfer(target_order_id uuid)
returns table (
  payout_id uuid,
  payment_id text,
  linked_account_id text,
  amount_inr integer,
  acquired boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.commerce_orders%rowtype;
  target_account public.seller_payout_accounts%rowtype;
  claimed_id uuid;
begin
  select *
  into target_order
  from public.commerce_orders
  where id = target_order_id
    and status = 'paid'
    and razorpay_payment_id is not null;

  if not found then
    return;
  end if;

  select *
  into target_account
  from public.seller_payout_accounts
  where user_id = target_order.seller_id
    and status = 'activated'
    and transfers_enabled
    and razorpay_account_id is not null;

  if not found then
    insert into public.route_transfers (
      order_id,
      seller_id,
      amount_inr,
      status,
      last_error
    ) values (
      target_order.id,
      target_order.seller_id,
      target_order.item_price_inr,
      'seller_not_ready',
      'Seller Razorpay Route account is not activated'
    )
    on conflict (order_id) do nothing;

    return query
    select
      route_transfer.id,
      target_order.razorpay_payment_id,
      route_transfer.linked_account_id,
      route_transfer.amount_inr,
      false
    from public.route_transfers route_transfer
    where route_transfer.order_id = target_order.id;
    return;
  end if;

  insert into public.route_transfers (
    order_id,
    seller_id,
    linked_account_id,
    amount_inr,
    status,
    last_error
  ) values (
    target_order.id,
    target_order.seller_id,
    target_account.razorpay_account_id,
    target_order.item_price_inr,
    'creating',
    null
  )
  on conflict (order_id) do nothing
  returning id into claimed_id;

  if claimed_id is null then
    update public.route_transfers
    set
      linked_account_id = target_account.razorpay_account_id,
      status = 'creating',
      last_error = null
    where order_id = target_order.id
      and status = 'seller_not_ready'
    returning id into claimed_id;
  end if;

  return query
  select
    route_transfer.id,
    target_order.razorpay_payment_id,
    target_account.razorpay_account_id,
    route_transfer.amount_inr,
    coalesce(route_transfer.id = claimed_id, false)
  from public.route_transfers route_transfer
  where route_transfer.order_id = target_order.id;
end;
$$;

revoke all on function public.claim_route_transfer(uuid) from public, anon, authenticated;
grant execute on function public.claim_route_transfer(uuid) to service_role;
