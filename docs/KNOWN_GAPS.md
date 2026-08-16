# Known gaps

Edge cases and deferred decisions found while building, recorded so they are
picked up deliberately rather than rediscovered. Each entry says what is wrong,
why it was not fixed at the time, and what closing it involves.

This is not the same as `docs/launch/BLOCKERS.md`, which is an older launch
tracker from a previous iteration and is now stale in places.

Last updated: 2026-08-17

---

## Auth and accounts

### Guardian consent is captured but never actually obtained
`guardian_email` is collected when someone enters a date of birth under 18, and
`guardian_consent_at` can only be written by the service role (round 12). But
**nothing emails the guardian**, so that timestamp will never be populated — and
nothing currently reads it before allowing a minor to use the app.

The DPDP Act requires *verifiable* parental consent. As it stands the app
collects an address and does nothing with it, which is not consent.

To close: an Edge Function that emails the guardian a confirmation link via
Resend, a route that records the timestamp when they follow it, and a check that
gates minor accounts until it is set.

### OAuth signups have no date of birth
Google sign-in provides no date of birth, so the profile row is created with
null. `is_adult()` treats null as an adult, which means **an OAuth account is
never subject to the minor restrictions**.

Email signup now requires the date, so this is specific to social sign-in.

To close: an onboarding step after first OAuth sign-in that asks for it before
the account can be used.

### `is_adult()` treats unknown as adult by design
Profiles created before the column existed have no date of birth. Treating
unknown as minor would have stopped current sellers listing, so the function
errs the other way. This is deliberate but it is a hole: any account without a
date is unrestricted.

Closes naturally once every account has a date — see the two entries above.

---

## Schema and policies

### Duplicate permissive policies on `listings`
The table carried two INSERT policies covering the same ground: *"Users can
create their own listings"* from the baseline migration and `listings_insert_own`
from round 2. Postgres ORs permissive policies together, so restricting one
while the other allowed a bare owner check left the restriction **completely
ineffective while appearing to work**. Round 11 consolidated the INSERT pair.

**The same duplication still exists on UPDATE** — `listings_update_own` and
*"Users can update their own listings"*. Harmless today because both say the
same thing, but the next person to tighten one will hit exactly the bug round 11
had to fix.

### Legacy handles containing periods
`prudhvi.pallempati` and `spotted.demo` in production, and any others predating
round 8, do not match the current handle rules. The constraint is `NOT VALID`, so
they are grandfathered and keep working.

Deliberate: renaming a live seller breaks the `/shop/:handle` URLs buyers use to
find them. The chosen path is that people rename themselves on the Account
details screen. Normalising them centrally would need redirects.

### `name` is not derived from first/last name
Round 10 added `first_name` and `last_name` alongside the existing `name`, which
is what the marketplace displays. Nothing keeps them in step — someone can set a
first and last name and have a display name that says something else entirely.

Decide whether `name` should be a separate display name (as now) or derived.

---

## Environments

### Production is missing rounds 7 to 12
Every migration in this work has been applied to **staging only**. Production has
none of: account deletion, the handle rules, the username change limit, the
profile fields, the minor restrictions, or the guardian consent protection.

Production also **never had `round6-razorpay-checkout.sql`** — `payments` and
`razorpay_webhook_events` do not exist there, while the Razorpay Edge Functions
reference both. Checkout would fail against production today.

### Staging and production are in different regions
Production is `ap-south-1` (Mumbai), staging is `ap-northeast-1` (Tokyo). Nothing
breaks, but staging will not reflect production latency.

### Leaked-password protection is off
Supabase's HaveIBeenPwned check is a Pro feature and the projects are on Free.
Of the available password controls it is worth the most, since most account
compromises come from credential reuse rather than weak passwords. Revisit if
the plan changes before launch.

---

## Product and legal

### Terms and Privacy are not written
Both appear as bold text on the Welcome screen with nothing behind them. Needed
for App Store review, and required in substance given the app collects real
personal data from users in India under the DPDP Act.

### Apple sign-in is parked, not abandoned
Scaffolding exists on the **`parked/apple-signin`** branch: the `AppleMark`
artwork, `'apple'` added to `OAuthProvider`, and `ENABLED_OAUTH_PROVIDERS`
generalised to validate against a known-provider list rather than hardcoded
comparisons. The buttons were never wired into Welcome or Login.

Blocked on a paid **Apple Developer Program membership (~$99/year)** — unlike
Google and Facebook there is no free tier, and without it the Services ID,
Team ID and signing key that Supabase requires cannot be created.

To close: take the membership, create the App ID and Services ID, generate the
key, enable Apple in Supabase (the provider is already listed in the dashboard),
rebase `parked/apple-signin`, wire the buttons, then add `apple` to
`VITE_OAUTH_PROVIDERS` on the relevant Netlify site.

Worth doing before any App Store submission: Apple requires Sign in with Apple
to be offered by apps that offer other third-party sign-in options.

### Facebook sign-in is unavailable
Disabled in both Supabase projects. The button is hidden by
`VITE_OAUTH_PROVIDERS` rather than shown broken — before that gating existed it
was live on production and failed for every user who tapped it.

To close: create a Facebook developer app, add both Supabase callback URLs, and
enable the provider. Development mode is enough for staging, since the app admin
can sign in; production needs the app switched to Live, which requires a privacy
policy URL and possibly business verification.

### Bio length differs from the reference
Spotted allows 500 characters; the reference app appears to cap far lower. Not a
bug, but worth a deliberate choice rather than an inherited default.

---

## Housekeeping

### Test accounts in staging
Several `manasa.pallempati+…@gmail.com` accounts were created while verifying
signup, login and the minor restrictions. Harmless, but they are not real users
and should be cleared before staging is used for anything resembling a demo.

### GitHub Pages site is still enabled
`deploy.yml` and `public/CNAME` are deleted and the domain is on Netlify, but the
Pages site itself and the `gh-pages` branch still exist. They serve nothing and
rebuild nothing; removing them is tidiness only.
