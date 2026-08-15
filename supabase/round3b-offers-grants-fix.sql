-- The original schema scopes grants per-column rather than table-wide (see
-- `listings`), and that scoping does NOT auto-extend to columns added later
-- via ALTER TABLE — round3-offers.sql's new columns (seller_id, seller_handle,
-- status) had RLS policies but no underlying GRANT, which blocks every
-- insert/update/select touching them regardless of RLS. Grant matching the
-- existing per-column convention.
grant select (seller_id, seller_handle), insert (seller_id, seller_handle) on public.offers to authenticated;
grant select (status), update (status) on public.offers to authenticated;
