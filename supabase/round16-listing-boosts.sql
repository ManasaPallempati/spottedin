-- Spotted Round 16 — paid listing boosts (seller pays to promote a listing)
-- UNAPPLIED — NOT RUN ON ANY DATABASE. A human runs it in the Supabase SQL editor.
-- Idempotent: guarded creates, drop-before-create policies/views, exception-guarded
-- constraint add. Safe to re-run.

-- ============================================================================
-- payments.context — allow 'boost' rows
-- ============================================================================
-- Boost payments reuse the Round 6 payments table (same Razorpay order
-- lifecycle, same service-role-only writes). The boost-order Edge Function
-- writes context='boost'; razorpay-order refuses to finalize them and
-- vice versa, so a boost payment can never become a purchase order.
alter table public.payments drop constraint if exists payments_context_check;
do $$ begin
  alter table public.payments
    add constraint payments_context_check
    check (context in ('bag', 'offer', 'boost'));
exception when duplicate_object then null; end $$;

-- ============================================================================
-- boosts — one row per granted boost (demo or paid)
-- ============================================================================
-- Written ONLY by the boost-order / razorpay-webhook Edge Functions (service
-- role, which bypasses RLS). No insert/update/delete policies and no write
-- grants for authenticated — a client cannot forge a boost at the grant
-- layer, before RLS is even consulted (fail closed, mirrors Round 6).
-- payment_id is unique so live finalization (client verify and/or webhook)
-- is idempotent: the first writer wins, later attempts upsert-ignore.
create table if not exists public.boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('3d', '7d')),
  amount_inr integer not null check (amount_inr > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payment_id uuid unique references public.payments(id),
  payment_status text not null default 'demo'
    check (payment_status in ('demo', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists boosts_listing_active_idx
  on public.boosts (listing_id, expires_at);

alter table public.boosts enable row level security;

drop policy if exists "boosts_select_own" on public.boosts;
create policy "boosts_select_own" on public.boosts
  for select using (seller_id = auth.uid());

grant select on public.boosts to authenticated;
grant all on public.boosts to service_role;

-- ============================================================================
-- active_boosts — public read of which listings are boosted right now
-- ============================================================================
-- Deliberately a plain (owner-rights) view: it runs as its owner and so
-- bypasses the boosts RLS, exposing ONLY listing_id + boosted_until for
-- currently active boosts. Feeds use it to rank boosted listings first and
-- show the honest "Boosted" label; amounts, tiers and seller ids stay
-- owner-visible-only through the base table policy above.
drop view if exists public.active_boosts;
create view public.active_boosts as
  select listing_id, max(expires_at) as boosted_until
  from public.boosts
  where starts_at <= now() and expires_at > now()
  group by listing_id;

grant select on public.active_boosts to anon, authenticated;
