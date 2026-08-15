# TOKENS_FINAL — the authoritative token sheet for spottedin-b

This file supersedes Section 4 of `SPOTTED_B_PLAN.md` **on color and surface only**. It already has
the owner's light-first override folded in, so build agents read THIS and never reconcile anything
themselves. All geometry, radii, type, motion and component measurements from the plan's Section 4
are unchanged and restated here verbatim where relevant.

Reason for the divergence from the original design handoff: this is a photo-forward resale
marketplace. Seller photos arrive with uncontrolled backgrounds; on a near-black canvas the
light-background shots blow out and the grid reads as a wall of holes. Browsing surfaces go light so
the merchandise carries; immersive and transactional surfaces stay dark. That contrast is the "pop."

---

## Palette

```css
:root {
  /* accent — unchanged from spec; single-variable swap preserved */
  --acc:      #D9FF3D;            /* alt preview #53E9FF via NEXT_PUBLIC_ACCENT=cyan */
  --on-acc:   #0C0C0E;

  /* light shell — browsing surfaces */
  --page:     #F2F0EA;            /* desktop page bg behind the phone shell */
  --screen:   #FAF9F6;            /* app canvas — warm off-white, NEVER pure #FFF */
  --card:     #FFFFFF;
  --raised:   #FFFFFF;            /* elevated = shadow, not a lighter fill */
  --chip:     #F0EEE8;            /* avatar chip / inert chip fill */
  --hairline: rgba(19,19,21,.08);
  --txt:      #131315;
  --muted:    rgba(19,19,21,.55);
  --dim:      rgba(19,19,21,.38);

  /* inverted surfaces — immersive + transactional moments */
  --ink-surface:  #0E0E11;
  --ink-card:     #17171B;
  --ink-raised:   #1D1D22;
  --ink-chip:     #26262C;
  --ink-txt:      #EDEBE4;
  --ink-muted:    rgba(237,235,228,.5);
  --ink-dim:      rgba(237,235,228,.35);
  --ink-hairline: rgba(237,235,228,.09);

  /* elevation — layered and near-transparent, never one hard drop */
  --sh-1: 0 1px 2px rgba(0,0,0,.04);
  --sh-2: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);
  --sh-3: 0 2px 4px rgba(0,0,0,.05), 0 18px 44px rgba(0,0,0,.10);
}
```

### Where each mode applies — not negotiable, this is the whole design idea

**LIGHT** (`--screen` canvas, `--card` surfaces, `--txt` ink):
`/` The Rack · `/search` · `/closet` · `/inbox` · `/inbox/[thread]` · `/orders/[id]` · `/sell` ·
the non-media parts of `/item/[id]` · TabBar.

**DARK** (`--ink-surface` canvas, `--ink-txt` ink, accent pops):
- The **DropTicker bar** — full-bleed `--ink-surface`, lime countdown. Brand moment, sits directly
  under the wordmark on `/`.
- **`/deck`** — entire screen. Single hero cards want dark.
- **`/fits`** — entire screen. Video feed.
- **`/irl`** — the viewfinder surface (results list returns to light).
- The **sticky buy/offer bar** on `/item/[id]`.
- The **DROP BOX** on `/item/[id]`.
- The **Wrapped card** on `/closet`.
- **`/landing`** — full-width, `--ink-surface`, as the plan already specifies.

Inside a DARK region, use the `--ink-*` ramp for every surface/text decision. Do not mix ramps
within one region.

### Accent discipline

`--acc` at scale on a light ground vibrates and reads cheap. Permitted uses only:
primary action pills · the live drop-tick dot and countdown · the `−N%` steal chip · active nav
state · the `/closet` avatar ring · timeline "done" dots. Everything else that the original spec
wanted as a large accent fill becomes an **inverted dark panel with lime text** instead.

Accent tints (`color-mix(in oklab, var(--acc) N%, transparent)` at N = 5,6,7,10,16,25,32,35,45,50)
ship as precomputed `rgba(217,255,61,.NN)` utilities `.acc-5 … .acc-50`, with the `color-mix`
versions inside `@supports (color: color-mix(in oklab, red, blue))`.

### Dark mode

Ship it, driven by `prefers-color-scheme: dark`: the light ramp swaps to the `--ink-*` values, the
already-dark regions stay as they are, and `--acc` is unchanged. One media block in `globals.css`.

---

## Unchanged from plan Section 4 — restated so this file is self-sufficient

**Radii ladder (do NOT round to a 4pt scale):** 999px all pills/dots/buttons/chips · 22px
bottom-sheet top corners only · 20px deck card · 18px IRL viewfinder · 16px wrapped card · 14px grid
tile / list row / cards / images · 13px chat bubble · 12px inputs / ticker bar · then 11/10/8/6px
nested chips.

**Type:** Display **Archivo Black** 400 (every price and screen title; 34/30/24/20/17/15/11px, +0.5
tracking on titles) · UI **Space Grotesk** 300–700 (11–13px; 11.5px tile titles, 13px captions) ·
Meta **Space Mono** 400/700 (ALL micro-copy/chips/timers/stats, UPPERCASE, letter-spacing 0.3–2px,
7.5–12px; the single most repeated element is Mono 8.5px — on light use `var(--dim)`, on dark use
`var(--ink-dim)`). All via `next/font/google`; zero external font links.

**Motion:** fadeUp screen enter 300ms `cubic-bezier(.16,1,.3,1)` · sheetUp 320ms · pulse 1.4–1.6s ·
outL/outR deck fly-out translate ±130% rotate ±10deg 300ms · pop · vprog 8s (photo stand-ins only).
Global `@media (prefers-reduced-motion: reduce)` disables pulse/vprog/KenBurns/fly-outs.
Added by the override: grid tiles enter staggered ~20ms; the price digit rolls on tick.

**Pricing** — unchanged, see plan Section 4 § Pricing. Server truth, client counts down only,
`floorPrice` never leaves the server.

**Component measurements** — unchanged from plan Section 4 § Key component measurements, with these
color substitutions applied:

- **Ticker bar**: now sits on `--ink-surface` full-bleed rather than as a tinted card. Radius 12px
  → the bar becomes a full-bleed band with 12px radius only on its bottom corners. 6px pulsing
  accent dot + `GLOBAL DROP −$1` Mono 700 9.5px ls 1.2px in `var(--acc)`; right = MM:SS Mono 700
  12px ls 1px, tabular-nums, reserved width; below = 3px track `rgba(237,235,228,.14)` with accent
  fill = elapsed fraction of hour.
- **Card grid tile**: width `calc(50% - 5px)`; image **aspect-ratio 4/5** (override: taller than the
  plan's 3/4, better for garments), radius 14px, `object-fit: cover`, plus a `1px` inset hairline
  `inset 0 0 0 1px rgba(19,19,21,.06)` so white-background photos still read as bounded objects, and
  a `--chip` placeholder that cross-fades on load. Spot-dot top-right 27px circle
  `rgba(255,255,255,.72)` + `backdrop-blur(6px)` around a 9px dot (accent when spotted). Steal chip
  bottom-left inset 8px, accent bg, `var(--on-acc)` ink, Mono 700 9.5px, padding 3px 8px, radius
  999px. Below: Archivo 15px `$price` + Mono 9px struck `$retail` in `var(--dim)` + `↓$1/hr`
  (`↓$2/hr` TURBO, `AT FLOOR` clamped) pushed right via `margin-left:auto`; Grotesk 11.5px title;
  Mono 8.5px `var(--dim)` `brand · size · N SPOTS`.
- **Deck** (dark region): unchanged verbatim — margin `4px 22px 12px`; next card absolute inset
  `14px 10px -6px` opacity .45 `scale(.95) translateY(10px)`; top card inset 0 radius 20px shadow
  `0 18px 44px rgba(0,0,0,.45)`; scrim `linear-gradient(transparent, rgba(10,10,12,.88))` padding
  `40px 16px 16px`.
- **Tab bar** (light): bg `rgba(250,249,246,.94)` + `backdrop-blur(12px)`; top border
  `var(--hairline)`; padding `9px 10px 24px`. Active state is a **dark pill** behind the icon with
  `--ink-txt` glyph, not a lime glyph. Center 47px accent FAB `margin-top:-16px` with a soft accent
  glow, links `/sell`. Labels Mono 700 7.5px ls 1.5px. Pure-CSS icons per plan. Active map: `/`,
  `/search`, `/item/*`, `/checkout`, `/orders/*`, `/irl` → RACK; `/inbox/*` → inbox.
- **Chips, 3 variants only**: (1) filter/trending pill — radius 999, Mono 700 9px ls 1px, padding
  6px 12px; selected = accent bg + `var(--on-acc)` ink; unselected = 1px `rgba(19,19,21,.14)` border
  + `var(--muted)` text. (2) option card — radius 10–12px on `--card` with `--sh-1`, value line +
  caption at `var(--muted)`; selected gets a 1.5px accent border, not an accent fill. (3)
  shop-the-look — radius 10px, 26×32 thumb + price stack, horizontal overflow-x row.
- **Buttons**: primary = accent pill, Mono 700 11px tracked, `var(--on-acc)` ink; secondary = 1.5px
  outline pill (`rgba(19,19,21,.18)` on light, `rgba(237,235,228,.24)` on dark).
- **Brand**: no emoji anywhere; the only mark is the char `●` as in `SPOTTED●`. `★` allowed for
  ratings, `✕` for the deck DROP glyph. Copy voice lowercase-cool and terse.

**Craft bar (override additions, enforced at review):** every image in a fixed aspect box with no
layout shift · geometry-matched skeletons, never spinners · optical spacing on a 4px base ·
`:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }` · hit targets ≥44px · every
icon-only control has an `aria-label`.
