# SQL migrations: run order, checks and rollback

Every `supabase/round*.sql` file is run **by a human** in the Supabase SQL
editor. Agents never run them. Always run a file on **staging first**, check
the app, then run it on production.

## Numbering

`main` and `TEST2026.02` were numbered separately, and both had a `round7`
and a `round8`. To keep the names unique, the shipping files from PR #59 are
now:

| Old name (PR #59 before the rename) | New name |
|---|---|
| `round7-shipping-fulfilment.sql` | `round20-shipping-fulfilment.sql` |
| `round8-courier-labels.sql` | `round21-courier-labels.sql` |

`TEST2026.02` keeps its own `round7-account-deletion.sql` and
`round8-handle-rules.sql`. Next free number on both lines: **22**.

## Run order

Run the files in each chain in order. The two chains don't depend on each
other.

**Checkout and shipping (PR #59):**

1. `round6-razorpay-checkout.sql`, if not already run
2. `round20-shipping-fulfilment.sql`
3. `round21-courier-labels.sql`

**Moderation (PR #64, on `TEST2026.02`):**

1. `round17-reports-and-blocks.sql`, if not already run
2. `round19-moderation-queue.sql`

Every file is safe to re-run: creates are guarded, policies are dropped
before they're re-created, and functions use `create or replace`. One catch:
round21 redefines round20's `mark_order_shipped`, so if you ever re-run round20,
re-run round21 right after it.

## Checks before each file

Paste a file's check into the SQL editor before running that file. Stop if
any result differs from the "Expect" line.

### round20-shipping-fulfilment.sql

```sql
-- Must exist (round 6 and earlier)
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('orders', 'order_items', 'listings', 'profiles', 'payments');
-- Expect: 5 rows. If payments is missing, run round6 first.

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'orders' and column_name in ('payment_id', 'payment_status');
-- Expect: 2 rows (round6).

-- Must not exist yet: the old prototype schema in this database has look-alike tables
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'spotted_addresses';
-- Expect: 0 rows on a first run. If it exists, compare its columns with the file before re-running.

-- An existing orders.status column with other values would break the new check constraint
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'orders' and column_name = 'status';
-- Expect: 0 rows on a first run. If it exists, check that its values are only paid/shipped/delivered/cancelled.
```

### round21-courier-labels.sql

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'spotted_addresses';
-- Expect: 1 row (round20).

select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name in ('is_order_seller', 'mark_order_shipped');
-- Expect: 2 rows (round20).

select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'spotted_seller_pickup';
-- Expect: 0 rows on a first run.
```

### round17-reports-and-blocks.sql

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('reports', 'blocks');
-- Expect: 0 rows on a first run. If either exists with different columns, stop.
```

### round19-moderation-queue.sql

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('reports', 'blocks');
-- Expect: 2 rows (round17).

select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'moderators';
-- Expect: 0 rows on a first run.
```

## After running

- **round20:** place one demo order on staging. Follow the checklist in the
  PR #59 description.
- **round21:** nothing changes in the app until Shiprocket is switched on (see
  `SHIPROCKET.md`). Check that the seller's order page still shows the manual
  "Mark as shipped" form.
- **round19:** add yourself to `public.moderators`. The SQL is at the top of
  the file. Then open `/admin/reports`.

Tested on 2026-10-26 against a scratch Postgres 16 with Supabase stand-ins
for `auth.uid()` and the roles (not against Supabase itself):
- Shipping chain: round6, round20 and round21 applied, re-applied, rolled back
  (21 then 20), and applied again cleanly.
- Moderation chain: round17 and round19 applied, re-applied and rolled back.
  A non-moderator was refused by `moderation_reports`, and a moderator could
  read the queue and change a report's status.

## Rollback

Roll back in **reverse order**: round21 before round20, and round19 before
round17. Each script runs in one transaction.

⚠️ Rolling back drops tables and columns, and **the data in them is lost**:
saved addresses, shipping charges, tracking numbers and reports. Export
anything you need first (Table editor → Export to CSV). Before rolling back,
put the app back to a build that doesn't use these columns. Otherwise
Purchases, Sales and checkout will break.

### Roll back round21-courier-labels.sql

```sql
begin;

-- Restore round20's manual "mark as shipped" (without the Shiprocket guard)
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
  where id = p_order_id and status = 'paid' and payment_status = 'paid';
  if not found then
    raise exception 'order is not waiting to ship';
  end if;
end
$$;

drop index if exists public.orders_tracking_number_idx;
alter table public.orders drop constraint if exists orders_courier_provider_check;
alter table public.orders
  drop column if exists courier_provider,
  drop column if exists courier_order_id,
  drop column if exists courier_shipment_id,
  drop column if exists label_url,
  drop column if exists courier_status;

drop table if exists public.spotted_seller_pickup;  -- also drops its trigger and policies
drop function if exists public.spotted_seller_pickup_guard();

commit;
```

### Roll back round20-shipping-fulfilment.sql (after round21's rollback)

```sql
begin;

drop function if exists public.mark_order_shipped(uuid, text, text);
drop function if exists public.mark_order_received(uuid);

drop policy if exists "orders_select_seller" on public.orders;
drop policy if exists "order_items_select_seller" on public.order_items;
drop function if exists public.is_order_seller(uuid);

alter table public.payments
  drop column if exists seller_id,
  drop column if exists ship_to,
  drop column if exists shipping_inr,
  drop column if exists buyer_fee_inr;

alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders drop constraint if exists orders_charges_nonnegative;
alter table public.orders
  drop column if exists seller_id,
  drop column if exists ship_to,
  drop column if exists shipping_inr,
  drop column if exists buyer_fee_inr,
  drop column if exists status,
  drop column if exists courier,
  drop column if exists tracking_number,
  drop column if exists shipped_at,
  drop column if exists delivered_at;

drop table if exists public.spotted_addresses;  -- also drops its policies and index

commit;
```

The Razorpay Edge Functions from PR #59 write these columns. If the
Razorpay or Shiprocket functions were deployed, redeploy the earlier versions
or unset `RAZORPAY_ENABLED` / `SHIPROCKET_ENABLED` before rolling back.

### Roll back round19-moderation-queue.sql

```sql
begin;

drop function if exists public.set_report_status(uuid, text);
drop function if exists public.moderation_blocked_handles();
drop function if exists public.moderation_reports(text);
drop function if exists public.is_moderator();
drop table if exists public.moderators;

commit;
```

### Roll back round17-reports-and-blocks.sql (after round19's rollback)

```sql
begin;

drop table if exists public.blocks;   -- also drops its policies
drop table if exists public.reports;  -- also drops its policies and indexes

commit;
```
