-- Round 8 — bring handle rules in line with Depop's.
--
-- Depop allows letters, numbers and the underscore only, with a three-character
-- minimum. Spotted also allowed periods, which makes impersonation easy:
-- manasa.pallempati and manasapallempati are hard to tell apart at a glance, and
-- a handle is a seller's shop identity. Depop's narrower rule is very likely a
-- deliberate anti-impersonation measure rather than an oversight.
--
-- NOT VALID is essential here, not a shortcut. Existing handles contain periods
-- in both environments — prudhvi.pallempati and spotted.demo in production,
-- manasa.pallempati in staging. A normal ADD CONSTRAINT validates every existing
-- row and would fail outright, and rewriting a live seller's handle would break
-- the /shop/:handle URLs that buyers use to find them. NOT VALID applies the rule
-- to every insert and update from now on while leaving those rows alone, so the
-- constraint tightens without a destructive migration.
--
-- Should those handles ever need normalising, that is a separate decision with
-- redirects to plan, not something to bury in a constraint change.

alter table public.profiles
  drop constraint if exists profiles_handle_format;

-- Optional leading '@' is retained from round2c: it is not stored by the app but
-- one Round 1 demo row still carries it.
alter table public.profiles
  add constraint profiles_handle_format
  check (handle ~ '^@?[a-z0-9][a-z0-9_]{2,29}$')
  not valid;

comment on constraint profiles_handle_format on public.profiles is
  'Depop-compatible handles: 3-30 chars, letters/numbers/underscore only, must start alphanumeric. NOT VALID so that pre-existing handles containing periods keep working.';
