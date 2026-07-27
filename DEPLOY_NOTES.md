# Deploy notes — Maanster Market

Live now: https://palle017.github.io/maanster-market/ (GitHub Pages, auto-deploys on every
push to main via Actions).

Site is password-gated (src/gate/Gate.tsx). Only the SHA-256 of the passphrase lives in
this repo; the passphrase itself is known to the owner and must never be committed.

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

## Phase 2 (not started)

Supabase backend (store.ts is shaped to swap in the Supabase client), Razorpay real
integration, Shiprocket, then the Expo iOS app per Downloads/resalemarketplaceiosplan.md.
