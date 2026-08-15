-- Round 2's auth flow collects and stores handles WITHOUT a leading '@'
-- (matching how handles are used everywhere in spottedin-c: routes like
-- /shop/:handle, sellerFor(), display as "@" + handle in JSX text — the '@'
-- was never meant to be stored). The original constraint required it,
-- silently failing every new-user profile insert with a 400. Loosen it to
-- accept the '@' as optional so the one pre-existing '@spotted.demo' row
-- (Round 1 demo seller) still validates alongside new bare handles.
alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format
  check (handle ~ '^@?[a-z0-9][a-z0-9._]{2,29}$');
