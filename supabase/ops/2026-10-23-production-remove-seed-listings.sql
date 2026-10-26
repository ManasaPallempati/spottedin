-- =====================================================================
-- Remove the 12 seed listings from PRODUCTION
-- (supabase/ops/2026-10-23-production-remove-seed-listings.sql)
-- =====================================================================
--
-- STATUS: NOT RUN. Written for Manasa to review and run by hand in the
-- PRODUCTION project's SQL editor (ref masdygvcssrtwseopfmj). No agent has
-- database credentials; nothing here has been executed.
--
-- WHAT IT REMOVES, AND WHY THESE ROWS ARE KNOWN TO BE SAMPLE DATA
--   Exactly the 12 listings owned by the profile handle 'spotted.demo'
--   (display name 'Spotted Demo', id 23f6f5d7-e824-4891-acb8-b1e0f15e8d97).
--   All 12 were inserted in one statement at 2026-07-29 21:17:10 UTC, have no
--   photo, and carry invented like counts (5 to 59). HANDOFF-spotted-buildout.md
--   records them as the "12 seed listings" baseline. Found by a read-only
--   audit on 2026-10-23 with the public anon key (what any visitor can read).
--
-- WHAT IT DOES NOT TOUCH
--   * cf1b5474-efc8-4bd4-bb72-337c2990db50 'My soul and gumption' (seller
--     prudhvi.pallempati, 2026-09-06). Not verified as test data: its owner
--     decides.
--   * The 'spotted.demo' profile and auth user themselves. With no listings
--     they are invisible to buyers. Delete the user from Authentication ->
--     Users afterwards if wanted (that cascades to the profile).
--   * Any offer or order. If any offer or order line references a seed
--     listing, the script STOPS: that is buyer history and needs a decision.
--
-- SAFETY
--   * One transaction. Every check raises an exception, which rolls back.
--   * Project check: the 12 ids only exist in production, so on any other
--     project the count check fails before anything changes.
--   * Backups go to schema ops_backup, which PostgREST does not expose.
--   * likes/bag_items/offers/order_items reference listings by text id with
--     no foreign key, so nothing cascades; dependent likes and bag rows are
--     backed up and removed explicitly so no orphans are left.
--
-- HOW TO RUN
--   1. Supabase dashboard -> project masdygvcssrtwseopfmj -> SQL editor.
--   2. Paste this whole file, Run. Expect "removed 12 seed listings".
--   3. Check https://www.spottedin.co shows no seed items. Only the one
--      unverified listing above will remain. The live build (main) has no
--      empty-state message, so the feed looks sparse until TEST2026.02 with
--      #53 ("No listings yet / Start selling") is promoted.
--
-- ROLLBACK: see the commented block at the bottom.
-- =====================================================================

begin;

create schema if not exists ops_backup;
revoke all on schema ops_backup from public, anon, authenticated;

do $$
declare
  seed_seller constant uuid := '23f6f5d7-e824-4891-acb8-b1e0f15e8d97';
  seed_ids constant uuid[] := array[
    '0493f05e-4706-4c5f-9e14-b99fe027e9f0',
    '89c90ce3-481b-4371-93dd-ec7bec8dc85e',
    '5fa610f5-7e51-422e-a851-294cebc1eb01',
    'd5427f0f-4a66-449e-bd5c-6f5df8776ce4',
    '5f3d72f8-1e01-42c0-abca-a9ac09abace5',
    'c50fad6e-2e58-4cdb-8353-07d7d88cc179',
    'd861c6c9-dc1a-4895-9d37-cb87e72ac55b',
    '2c512865-30a3-434f-ba59-aa7b0cb387d1',
    'e7ec4f93-25cd-4d7d-928c-6055d77b6efd',
    'c0ec6d45-20cb-4594-86a4-794b10da4c18',
    '2b3b9004-d270-4ca7-975f-35dd8101a407',
    '9825cd19-a8f7-4bb0-9802-2db55f0383cb'
  ]::uuid[];
  seed_text_ids text[];
  n int;
begin
  seed_text_ids := array(select unnest(seed_ids)::text);

  -- 1. Right project, right rows.
  select count(*) into n
    from public.listings
   where id = any(seed_ids) and seller_id = seed_seller;
  if n <> 12 then
    raise exception 'expected 12 seed listings owned by spotted.demo, found %. Wrong project, or already removed. Nothing changed.', n;
  end if;

  if not exists (
    select 1 from public.profiles
     where id = seed_seller and ltrim(handle, '@') = 'spotted.demo'
  ) then
    raise exception 'profile % is not spotted.demo. Nothing changed.', seed_seller;
  end if;

  select count(*) into n from public.listings where seller_id = seed_seller;
  if n <> 12 then
    raise exception 'spotted.demo owns % listings, not the 12 audited ones. Re-audit first. Nothing changed.', n;
  end if;

  -- 2. Never touch buyer history.
  if to_regclass('public.order_items') is not null then
    execute 'select count(*) from public.order_items where listing_id = any($1)' into n using seed_text_ids;
    if n > 0 then
      raise exception '% order line(s) reference seed listings. Decide what to do with those orders first. Nothing changed.', n;
    end if;
  end if;
  if to_regclass('public.offers') is not null then
    execute 'select count(*) from public.offers where listing_id = any($1)' into n using seed_text_ids;
    if n > 0 then
      raise exception '% offer(s) reference seed listings. Decide what to do with them first. Nothing changed.', n;
    end if;
  end if;

  -- 3. Back up, then remove dependants and the listings.
  create table ops_backup.listings_seed_20261023 as
    select * from public.listings where id = any(seed_ids);

  if to_regclass('public.likes') is not null then
    execute 'create table ops_backup.likes_seed_20261023 as select * from public.likes where listing_id = any($1)' using seed_text_ids;
    execute 'delete from public.likes where listing_id = any($1)' using seed_text_ids;
  end if;
  if to_regclass('public.bag_items') is not null then
    execute 'create table ops_backup.bag_items_seed_20261023 as select * from public.bag_items where listing_id = any($1)' using seed_text_ids;
    execute 'delete from public.bag_items where listing_id = any($1)' using seed_text_ids;
  end if;

  delete from public.listings where id = any(seed_ids);
  get diagnostics n = row_count;
  if n <> 12 then
    raise exception 'deleted % rows instead of 12. Rolled back.', n;
  end if;

  raise notice 'removed 12 seed listings; backups in ops_backup.*_seed_20261023';
end
$$;

commit;

-- =====================================================================
-- ROLLBACK (only if needed). Restores exactly what was removed.
-- ---------------------------------------------------------------------
-- begin;
-- insert into public.listings select * from ops_backup.listings_seed_20261023;
-- insert into public.likes select * from ops_backup.likes_seed_20261023;          -- if it exists
-- insert into public.bag_items select * from ops_backup.bag_items_seed_20261023;  -- if it exists
-- commit;
--
-- Once the removal is confirmed and no longer needed:
-- drop table ops_backup.listings_seed_20261023, ops_backup.likes_seed_20261023, ops_backup.bag_items_seed_20261023;
-- =====================================================================
