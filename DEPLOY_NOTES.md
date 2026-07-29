# Deploy notes — Maanster Market

Live now: https://palle017.github.io/maanster-market/ (GitHub Pages, auto-deploys on every
push to main via Actions).

The former site-wide password gate has been removed. RBOT's browser-local
visibility key only hides its launcher; because it ships in public frontend
code, it is not an authorization boundary.

## Flip to maanster.fixingfortmyers.com (one manual DNS step)

1. In Google Cloud DNS (fixingfortmyers.com zone) add:
   `maanster  CNAME  palle017.github.io.`  (TTL 300)
2. Then run from this folder:

```bash
gh api repos/Palle017/maanster-market/pages -X PUT -f cname=maanster.fixingfortmyers.com
```

3. Change `base` in vite.config.ts from `'/maanster-market/'` to `'/'`, update the hub
   card link in rajindustries-site to https://maanster.fixingfortmyers.com, commit + push
   both repos. (Ask Claude to "flip maanster to the custom domain" — steps 2–3 are
   scripted work.)

## OpenClaw / TardBot sidebar

Hidden from normal visitors. Open it with:
https://palle017.github.io/maanster-market/?claw=maanster-claw-9481
(then it stays enabled in that browser). It embeds your local gateway
http://127.0.0.1:18789 — full OpenClaw Control UI, gateway auth still applies. On any
machine that isn't yours the iframe points at the viewer's own localhost, so the public
gets nothing.

## Phase 2

Supabase email/password authentication, durable profiles, listings,
listing-image storage, favorites, and basic messaging are implemented locally on
`codex/supabase-auth-rollout`; see `AUTH_ROLLOUT.md` for the migration, staging,
SMTP, email-template, and production gates. CI runs `npm test` before every
Pages build and refuses a production deploy if the public repository variables
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are absent. No Supabase
project, production auth deployment, paid SMS, Razorpay, or Shiprocket
integration has been activated.
