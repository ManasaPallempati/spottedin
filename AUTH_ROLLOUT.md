# Supabase authentication rollout

Status: the local email/password foundation plus Supabase-backed profiles,
listings, listing-image storage, favorites, and basic messaging are implemented. Production remains
blocked on the staging, CAPTCHA, SMTP, and database-test gates below. Nothing
in this document authorizes a push, deployment, paid message, DNS change, or
external project creation.

## Verified baseline

- Branch baseline: `01d9743015afd99ab54414c8919245572c70c024`
- Live site: `https://palle017.github.io/maanster-market/`
- Existing browser-local accounts cannot be centrally recovered or transparently
  migrated. They must re-register once Supabase auth ships. Never upload their
  browser-local password hashes.
- In a configured Supabase build, profiles, marketplace listings, listing
  photos, favorites, and basic conversations/messages are cloud-backed.
  Checkout and orders remain browser-local prototype behavior and are not
  production-secure.
- In an unconfigured local build, all marketplace data remains browser-local
  demo data. Chats and orders are namespaced by authenticated user ID so
  accounts sharing one browser do not read each other's local data.

## What this branch contains

- Public configuration via `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`). The client refuses
  `sb_secret_*` keys and legacy service-role JWTs at startup.
- An async `AuthProvider` (`src/auth/AuthProvider.tsx`) with explicit
  `initializing / authenticated / unconfirmed / signed_out / error` states,
  driven by `getSession()` plus `onAuthStateChange`. When Supabase is
  configured, no synchronous localStorage read ever decides identity, and the
  app never falls back to local auth after a network or auth error.
- Full auth UI: signup with confirmation email, verified login, resend
  confirmation, password recovery request, `/reset-password` update screen,
  and signout. Phone / mobile-password login is removed from the UI and
  deferred to the paid, TRAI-gated phone OTP phase (the phone validation
  helpers in `src/auth/validation.ts` are retained for it).
- HashRouter-safe callbacks: `token_hash`/`type` (or a PKCE `code`) arrive as
  query parameters on the base URL, are verified on startup, scrubbed from
  browser history, and recovery lands on `/#/reset-password`.
- The Supabase auth user UUID is the canonical user and seller identity.
  Because confirmed signups have no session at signup time, profile fields are
  carried as non-authoritative user metadata and the user-owned `profiles` row
  is created/claimed under RLS after the first verified session — no
  `auth.users` trigger that could block signup. Handle collisions surface a
  claim-handle recovery screen on the profile tab.
- `returnTo` redirects are constrained to a whitelist of internal routes
  (`src/auth/returnTo.ts`), and `RequireAuth` blocks rendering until the auth
  and profile states are known, so gated routes neither flash, open-redirect,
  nor create marketplace data before profile onboarding succeeds. Password
  updates also require a verified recovery event.
- Unconfigured local builds fall back to an unmistakably labeled browser-local
  demo mode (registration + login only; no email flows). The GitHub Pages
  workflow fails closed if either production Supabase variable is absent.
- `public.listings` stores marketplace listing data and uses the authenticated
  profile UUID as `seller_id`. Public visitors can read live listings; owners
  can create, edit, delete, and read their own sold listings. Column grants
  prevent browser clients from setting `likes`, transferring ownership, or
  creating a listing as already sold.
- The public `listing-images` Storage bucket accepts JPEG, PNG, WebP, HEIC, and
  HEIF files up to 8 MB. Authenticated users can write only under their own
  UUID folder. Public read access is intentional because listing photos appear
  in the public marketplace feed.
- The visible cloud round trip is wired through
  `src/data/listings.ts`: Feed queries live rows, Listing Detail fetches the
  row and seller profile, Sell uploads an optional photo then inserts the row,
  and Seller Profile queries that seller's rows. If database insertion fails
  after an upload, the client makes a best-effort cleanup of the orphan image.
- `public.favorites` persists each user's saved listings under owner-only RLS.
  A database trigger maintains the public listing favorite count without
  granting clients direct write access to `listings.likes`; the web client
  includes a protected Saved screen.
- `public.conversations`, `conversation_members`, and `messages` provide basic
  two-party listing chat. A security-definer RPC creates exactly the buyer and
  listing seller memberships, messages are immutable, and non-members cannot
  read or send them. The web client refreshes inboxes on focus and open chats
  every five seconds; Supabase Realtime is not enabled yet.

## Local verification

- `npm test` — unit tests for validation, callback parsing/planning, redirect
  whitelisting, key-shape rejection, listing mapping, and image validation.
- `npm run build` — type-check + production bundle.
- `supabase test db` — pgTAP suite in `supabase/tests/database/` covering
  grants, profile/listing/storage/favorite/messaging RLS, spoofed inserts,
  cross-user reads and writes, protected columns, constraints, triggers, and
  auth-user cascade. Requires a
  linked staging project or local `supabase start`; not run in this repo.

This branch is not production-ready until the database suite and real email
journeys pass on staging, Turnstile tokens are wired into signup/resend/recovery,
and rate-limit/error UX is completed.

## Email callback design

This app uses `HashRouter`, so Supabase auth tokens must not be placed in the
URL fragment. Configure the email templates (Dashboard → Auth → Email
Templates) to link to the allowlisted redirect target with query parameters.
Set Site URL to the deployed base and allow the exact production, staging, and
localhost callback bases:

- Confirm signup: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup`
- Reset password: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
- Change email (if enabled): `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email_change`

The base URL must also be in the auth redirect allow-list. Startup code
verifies the token, removes those parameters from browser history, and then
navigates to the appropriate hash route.

Do not enable production email until confirmation and recovery have both passed
on staging in a clean browser.

## Staging checklist (external — none executed)

1. Create the staging Supabase project (org, region, plan per the approval
   gates below). Install the Supabase CLI, authenticate it, then from this
   repository run `supabase link --project-ref <staging-project-ref>`,
   `supabase db push`, and `supabase test db`. The ordered migrations create
   profiles first, then listings and the `listing-images` bucket.
2. Auth settings: enable the email provider with "Confirm email" required and
   a minimum password length of 8; leave the phone provider disabled.
3. Set Site URL, redirect allow-list, and the three email templates above.
4. Set the repository **variables** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` for the staging frontend (this repository
   currently deploys only `main`, so the staging frontend location is itself a
   gate). CI runs `npm test` and refuses to deploy if either variable is absent.
5. In a clean browser: signup → confirm → login; wrong password; login before
   confirming (resend path); recovery end-to-end; profile edit; a forced
   handle collision; create a listing with and without a photo; reload Feed;
   open Listing Detail; verify it appears on Seller Profile; verify a second
   account cannot modify it.
6. SMTP: Supabase's built-in sender is rate-limited and dev-only. Production
   email requires a custom SMTP provider, sending domain, SPF/DKIM DNS
   records, and a budget decision.
7. Add Turnstile to signup, resend, and recovery; test success, expiry, and
   rejection before making the auth endpoints public.
8. Production: a separate production project, the same checklist, then
   production repository variables — only after staging passes.

## Minimum cloud attachment

The frontend needs only two public build variables:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use the publishable key from Supabase Project Settings. Never put a secret key,
service-role key, database password, SMTP credential, or management token in a
`VITE_*` variable. RLS is the backend authorization boundary; the publishable
key is expected to be visible in the browser.

For a local prototype, copy `.env.example` to `.env.local`, replace only those
two values, apply the migrations to a disposable staging project, and run
`npm run dev`. For a hosted prototype, set the same two names as GitHub Actions
repository variables. The deployment workflow intentionally fails if either
one is missing.

## External approval gates

1. Supabase organization, region, plan, and staging project owner.
2. What happens to existing browser-local demo accounts and profiles.
3. Staging frontend location; this repository currently deploys only `main`.
4. SMTP provider, sending domain, DNS records, and budget.
5. Turnstile site creation and allowed domains.
6. Production project creation and production deployment.
7. SMS provider, monthly ceiling, and completed TRAI DLT registration.

Recommended order: staging project, email-only auth, security tests, production
email release, then phone OTP as a separate paid/compliance-gated phase.
