# Design direction override — owner instruction, 2026-07-29

This file OVERRIDES the color/surface section of `README.md` (the Claude Design handoff spec).
Everything else in that spec — layout, screens, mechanics, type scale, motion, the `SPOTTED●`
mark, "no emoji" — still stands.

## Owner's instruction, verbatim

> "Just make it look tasteful and kinda follow the current general trends and try to pop out,
> but in a good way, maintaining a clean, smooth interface, full of detail. Make sure that the
> color doesn't overwhelm with the black because it's gonna be a marketplace to need to be able
> to see pictures and such. Infer and do your best."

## What changes

The original spec is dark-first (`#0A0A0C` page, `#17171B` cards, acid lime `#D9FF3D` accent).
For a photo-forward resale marketplace that inverts: near-black surfaces fight the product
photography. Listing photos arrive from sellers with uncontrolled backgrounds and white balance —
against near-black, light-background product shots blow out into glowing rectangles and the grid
reads as a wall of holes rather than a wall of garments. This is why Grailed, Depop and Vinted are
all light-first.

**Decision: light-first shell, dark accents used deliberately.** Photos sit on a warm neutral so
they read as merchandise, not as light sources.

### Surfaces (replaces the spec's token block)

- Page background: `#FAF9F6` — warm off-white, not pure `#FFF`. Pure white clips against white
  product backgrounds and makes the grid edges vanish.
- Card surface: `#FFFFFF`
- Elevated / sheet surface: `#FFFFFF` with shadow, not with a lighter fill
- Hairline: `rgba(19,19,21,.08)`
- Ink primary: `#131315` · muted `rgba(19,19,21,.55)` · dim `rgba(19,19,21,.38)`
- Inverted surface (retained from spec, used sparingly — see below): `#0E0E11`

### Accent

- Keep acid lime `#D9FF3D` as `--acc`, but it is **never a large fill on light ground** — at scale
  on white it vibrates and reads cheap. Use it for: the primary action pill, the live drop-tick
  indicator, the `−N%` steal chip, and active nav state. Text on accent stays `#0C0C0E`.
- Where the spec wanted a big accent area, use the inverted dark surface `#0E0E11` with lime text
  instead. This preserves the spec's high-contrast punch while keeping total lime area small.
- Retain `#53E9FF` (cyan) as an alternate; `--acc` remains a one-line swap.

### Where black is still used — deliberately, for contrast rhythm

- The Global Drop ticker bar: full-bleed `#0E0E11` with lime countdown. It's the brand moment.
- The Spot Deck (`/deck`) and Fits (`/fits`): dark, full-screen, immersive. These are media-first
  surfaces where dark is correct — video and single hero cards want it.
- Sticky buy/offer bar on `/item/[id]`.
- Bottom nav: light with a dark active pill.

Net effect: the browsing surfaces (Rack grid, search, closet, orders, inbox) are light and let
photography carry; the immersive and transactional moments go dark. The contrast between those two
modes is the "pop," rather than a single loud color everywhere.

## Craft bar — "clean, smooth, full of detail"

Non-negotiable finish details:

- Every image gets a `4:5` aspect box, `object-fit: cover`, a `1px` inset hairline to define the
  edge against white, and a low-chroma neutral placeholder that cross-fades on load. No layout shift.
- Skeletons on every async surface, matching final geometry. Never a spinner.
- Motion per spec (`300ms cubic-bezier(.16,1,.3,1)`), applied to: grid item entrance (staggered
  ~20ms), sheet slide, price-tick number roll. Respect `prefers-reduced-motion`.
- Optical spacing, not mechanical: a strict 4px base scale, but chips/pills get tighter leading and
  hand-tuned horizontal padding.
- Shadows are near-transparent and layered (`0 1px 2px rgba(0,0,0,.04)`, `0 8px 24px rgba(0,0,0,.06)`),
  never a single hard drop shadow.
- Hit targets ≥44px even where the visual element is smaller.
- Dark mode: ship it, driven by `prefers-color-scheme`, reusing the inverted surface values above.

## Standing rule for build agents

Where this file and `README.md` disagree on color, surface, or contrast, **this file wins**. Where
they disagree on anything else, README.md wins. If a case is genuinely ambiguous, choose the option
that makes seller-uploaded photography look better.
