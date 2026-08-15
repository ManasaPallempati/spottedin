-- Spotted Round 6 — Razorpay checkout (server-authoritative payments) — spottedin-c
-- No agent applies this migration — a human runs it in the Supabase SQL editor.
-- Idempotent: guarded creates, drop-before-create policies, exception-guarded
-- constraint add. Safe to re-run.

-- ============================================================================
-- payments — one row per Razorpay checkout attempt
-- ============================================================================
-- Written ONLY by the razorpay-order / razorpay-webhook Edge Functions
-- (service role, which bypasses RLS); authenticated clients can only read
-- their own rows. The demo checkout path never touches this table.
-- `order_uuid` / `order_code` are pre-assigned at create time so finalization
-- (insert into orders/order_items) is deterministic and idempotent whether it
-- runs from the client verify call, the webhook, or both.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  context text not null check (context in ('bag', 'offer')),
  offer_id uuid,
  items jsonb not null,
  item_total_inr integer not null check (item_total_inr > 0),
  charged_inr integer not null check (charged_inr > 0),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  order_uuid uuid not null unique default gen_random_uuid(),
  order_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid());
-- No insert/update/delete policies and no write grants for authenticated —
-- payment rows are service-role-only writes by design (fail closed).

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

-- ============================================================================
-- razorpay_webhook_events — webhook delivery dedup ledger (service-role only)
-- ============================================================================
create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_type text not null default '',
  received_at timestamptz not null default now()
);

alter table public.razorpay_webhook_events enable row level security;
-- RLS on with zero policies: no client role can read or write this table.
grant all on public.razorpay_webhook_events to service_role;

-- ============================================================================
-- orders — distinguish paid orders from demo ones
-- ============================================================================
alter table public.orders add column if not exists payment_id uuid references public.payments(id);
alter table public.orders add column if not exists payment_status text not null default 'demo';

do $$ begin
  alter table public.orders
    add constraint orders_payment_status_check
    check (payment_status in ('demo', 'paid', 'refunded'));
exception when duplicate_object then null; end $$;

-- Clients may READ the new columns but never write them: 'paid' is only ever
-- set by the Edge Functions (service role). Revoking table-wide insert/update
-- and re-granting insert on exactly the columns the demo checkout sends keeps
-- the demo path working (payment_status stays at its 'demo' default) while
-- making a client-forged paid order impossible at the grant layer, before RLS
-- is even consulted. This schema grants per-column (see round3b), so the new
-- columns also need an explicit select grant.
revoke insert, update on public.orders from authenticated;
grant insert (id, buyer_id, code, total_inr) on public.orders to authenticated;
grant select (payment_id, payment_status) on public.orders to authenticated;
