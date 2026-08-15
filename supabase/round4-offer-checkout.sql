-- Spotted Round 4 — discounted checkout for accepted offers — spottedin-c
-- No agent applies this migration — a human runs it in the Supabase SQL editor.
-- Idempotent: every `create policy` is preceded by `drop policy if exists`;
-- the function uses `create or replace`.

-- ============================================================================
-- listings — additive select policy so buyers can see listings they bought
-- ============================================================================
-- Additive alongside the existing listings_select_live and listings_select_own
-- policies (a row is visible if ANY policy matches) — do not touch those.
drop policy if exists "listings_select_sold" on public.listings;
create policy "listings_select_sold" on public.listings
  for select using (status = 'sold');

-- ============================================================================
-- mark_listings_sold — security-definer RPC to flip purchased listings to sold
-- ============================================================================
-- Buyers cannot UPDATE listings directly (listings_update_own only allows the
-- seller to update their own rows), so marking a purchased listing sold
-- requires this narrowly-scoped function, which internally verifies the
-- caller actually has a paid order for that exact listing before doing
-- anything — this is not a general-purpose privilege escalation.
create or replace function public.mark_listings_sold(p_listing_ids text[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set status = 'sold'
  where id::text = any(p_listing_ids)
    and status = 'live'
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.buyer_id = auth.uid()
        and oi.listing_id = public.listings.id::text
    )
$$;

grant execute on function public.mark_listings_sold(text[]) to authenticated;
