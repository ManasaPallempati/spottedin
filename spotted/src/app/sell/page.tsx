"use client";

import Link from "next/link";
import { useState } from "react";
import { Countdown } from "@/components/Countdown";
import type { Listing } from "@/data/types";
import { useStore } from "@/state/store";

const SIZES = ["XS", "S", "M", "L", "XL"];
const CONDITIONS = ["LIKE NEW", "GREAT", "GOOD", "WORN"];
const CATEGORIES: Listing["category"][] = ["OUTERWEAR", "TOPS", "BOTTOMS", "SHOES", "BAGS"];
const SPEEDS: { key: Listing["dropRate"]; note: string }[] = [
  { key: "CHILL", note: "−$1/DAY" },
  { key: "STANDARD", note: "−$1/HR" },
  { key: "TURBO", note: "−$2/HR" },
];

const inputCls =
  "w-full rounded-[12px] border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-3.5 py-3 text-[13px] font-medium text-[var(--ink)] outline-none";

export default function SellPage() {
  const { createListing } = useStore();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("M");
  const [condition, setCondition] = useState("GREAT");
  const [category, setCategory] = useState<Listing["category"]>("TOPS");
  const [startPrice, setStartPrice] = useState("46");
  const [floor, setFloor] = useState("30");
  const [speed, setSpeed] = useState<Listing["dropRate"]>("STANDARD");
  const [listed, setListed] = useState<Listing | null>(null);
  const [shared, setShared] = useState(false);

  // 0% seller fees forever: earnings equal the live price, derived from state.
  const startNum = Number(startPrice) || 0;
  const floorNum = Number(floor) || 0;
  const priceValid = startNum > 0 && floorNum > 0 && floorNum <= startNum;
  const displayTitle = (title.trim() || "KNIT ZIP CARDIGAN").toUpperCase();

  function addPhoto(i: number, file?: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos((prev) => {
      const copy = [...prev];
      copy[i] = url;
      return copy.filter(Boolean);
    });
  }

  async function startTheDrop() {
    const listing = await createListing({
      title: displayTitle,
      brand: brand.trim() || "VINTAGE",
      size,
      condition,
      category,
      startPrice: startNum,
      floorPrice: floorNum,
      dropRate: speed,
      photoAlts: photos.length ? photos.map((_, i) => `${displayTitle} photo ${i + 1}`) : [],
    });
    setListed(listing);
    setStep(3);
  }

  async function shareFitCard() {
    const text = `${displayTitle} — $${startNum}, drops hourly on SPOTTED`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setShared(false);
    }
  }

  return (
    <main className="screen px-4 pb-10 pt-5">
      {step < 3 && (
        <header>
          <div className="flex items-center justify-between">
            <h1 className="display text-[20px]">LIST IT</h1>
            <div className="flex gap-1" aria-label={`Step ${step + 1} of 3`}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-1 w-[18px] rounded-full"
                  style={{ background: i <= step ? "var(--acc)" : "rgba(237,235,228,.15)" }}
                />
              ))}
            </div>
          </div>
          <p className="mono mt-1 text-[9px] tracking-[.4px] text-[rgba(237,235,228,.42)]">
            under 60 seconds · 0% seller fees, forever
          </p>
        </header>
      )}

      {step === 0 && (
        <section className="screen mt-3">
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <label
                key={i}
                className="relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-[14px] border-[1.5px] border-dashed"
                style={{
                  borderColor: photos[i] ? "transparent" : "rgba(237,235,228,.2)",
                }}
              >
                {photos[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photos[i]}
                    alt={`listing photo ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[rgba(237,235,228,.4)]">
                    <span className="text-[15px]">+</span>
                    <span className="mono text-[8.5px]">{i === 0 ? "add cover" : "add photo"}</span>
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => addPhoto(i, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>
          <p className="mono mt-3 text-[8.5px] leading-[1.7] text-[rgba(237,235,228,.35)]">
            first photo = cover. natural light wins.
            <br />
            AI removes the background + tags brand/era for you.
          </p>
          <button type="button" onClick={() => setStep(1)} className="pill-primary mt-4 w-full">
            NEXT — DETAILS
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="screen mt-3">
          <label className="meta block text-[8.5px] text-[rgba(237,235,228,.35)]" htmlFor="s-title">
            TITLE
          </label>
          <input
            id="s-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. KNIT ZIP CARDIGAN"
            className={`${inputCls} mt-1.5`}
          />
          <label
            className="meta mt-3.5 block text-[8.5px] text-[rgba(237,235,228,.35)]"
            htmlFor="s-brand"
          >
            BRAND
          </label>
          <input
            id="s-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="AI guessed: VINTAGE — tap to edit"
            className={`${inputCls} mt-1.5`}
          />
          <p className="meta mt-3.5 text-[8.5px] text-[rgba(237,235,228,.35)]">SIZE</p>
          <div className="mt-1.5 flex gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={`chip flex-1 rounded-[10px] text-center ${size === s ? "chip-on" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="meta mt-3.5 text-[8.5px] text-[rgba(237,235,228,.35)]">CONDITION</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={condition === c}
                onClick={() => setCondition(c)}
                className={`chip ${condition === c ? "chip-on" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="meta mt-3.5 text-[8.5px] text-[rgba(237,235,228,.35)]">CATEGORY</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? "chip-on" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setStep(0)} className="pill-outline flex-1">
              BACK
            </button>
            <button type="button" onClick={() => setStep(2)} className="pill-primary flex-[2]">
              NEXT — PRICE
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="screen mt-3">
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label
                className="meta block text-[8.5px] text-[rgba(237,235,228,.35)]"
                htmlFor="s-price"
              >
                START PRICE
              </label>
              <div className="mt-1.5 flex items-center rounded-[12px] border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-3.5">
                <span className="display text-[16px] text-[rgba(237,235,228,.5)]">$</span>
                <input
                  id="s-price"
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="display w-full bg-transparent px-2 py-3 text-[18px] text-[var(--ink)] outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label
                className="meta block text-[8.5px] text-[rgba(237,235,228,.35)]"
                htmlFor="s-floor"
              >
                FLOOR
              </label>
              <div className="mt-1.5 flex items-center rounded-[12px] border border-[rgba(237,235,228,.14)] bg-[var(--card)] px-3.5">
                <span className="display text-[16px] text-[rgba(237,235,228,.5)]">$</span>
                <input
                  id="s-floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="display w-full bg-transparent px-2 py-3 text-[18px] text-[var(--ink)] outline-none"
                />
              </div>
            </div>
          </div>
          <p className="mono mt-2 text-[8.5px] text-[rgba(237,235,228,.38)]">
            similar pieces sold $38–$52 · price never falls below your floor
          </p>
          <p className="meta mt-4 text-[8.5px] text-[rgba(237,235,228,.35)]">DROP SPEED</p>
          <div className="mt-1.5 flex gap-2">
            {SPEEDS.map((s) => {
              const on = speed === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSpeed(s.key)}
                  className="flex-1 rounded-[12px] border px-1.5 py-2.5 text-center"
                  style={{
                    borderColor: on ? "var(--acc)" : "rgba(237,235,228,.16)",
                    background: on ? "var(--acc)" : "transparent",
                    color: on ? "var(--acc-ink)" : "rgba(237,235,228,.65)",
                  }}
                >
                  <span className="mono block text-[10px] font-bold tracking-[.8px]">{s.key}</span>
                  <span className="mono mt-0.5 block text-[8px] opacity-70">{s.note}</span>
                </button>
              );
            })}
          </div>
          <div
            className="mt-4 flex items-center justify-between rounded-[13px] px-4 py-3"
            style={{
              background: "color-mix(in oklab, var(--acc) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--acc) 35%, transparent)",
            }}
          >
            <span>
              <span className="meta block text-[8.5px] tracking-[1.2px] text-[rgba(237,235,228,.5)]">
                YOU EARN
              </span>
              <span className="display tnum mt-0.5 block text-[24px]">${startNum}</span>
            </span>
            <span className="mono text-right text-[9px] font-bold leading-[1.6] text-[var(--acc)]">
              0% SELLER FEES
              <br />
              FOREVER
            </span>
          </div>
          {!priceValid && (
            <p className="mono mt-2 text-[8.5px] text-[rgba(237,235,228,.45)]">
              floor must be above $0 and at or below start price
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="pill-outline flex-1">
              BACK
            </button>
            <button
              type="button"
              onClick={startTheDrop}
              disabled={!priceValid}
              className="pill-primary flex-[2] disabled:opacity-50"
            >
              START THE DROP
            </button>
          </div>
        </section>
      )}

      {step === 3 && listed && (
        <section className="screen pt-10 text-center">
          <span className="pop-in mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[var(--acc)] text-[24px] font-bold text-[var(--acc-ink)]">
            ✓
          </span>
          <h1 className="display mt-3.5 text-[26px]">YOU&apos;RE LIVE.</h1>
          <p className="mono mt-2 text-[9.5px] leading-[1.7] text-[rgba(237,235,228,.45)]">
            {listed.title} hits the rack now.
            <br />
            first drop in <Countdown className="text-[9.5px] text-[var(--acc)]" />
          </p>
          <div className="mx-auto mt-4 w-[150px] overflow-hidden rounded-[14px] border border-[rgba(237,235,228,.14)] text-left">
            <div
              className="relative h-[120px]"
              style={{
                background: photos[0]
                  ? undefined
                  : `linear-gradient(160deg, ${listed.photos[0].c1}, ${listed.photos[0].c2})`,
              }}
            >
              {photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[0]}
                  alt={`${listed.title} cover`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <span className="mono absolute left-2 top-2 text-[7.5px] font-bold">SPOTTED●</span>
            </div>
            <div className="bg-[var(--card)] px-2.5 py-2">
              <p className="display truncate text-[11px]">{listed.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="mono text-[10px] font-bold text-[var(--acc)]">${startNum}</span>
                <span className="mono text-[7.5px] text-[rgba(237,235,228,.4)]">DROPS HOURLY</span>
              </p>
            </div>
          </div>
          <p className="mono mt-2 text-[8px] text-[rgba(237,235,228,.35)]">
            FIT CARD — auto-sized for stories
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={shareFitCard} className="pill-primary flex-1 text-[10px]">
              {shared ? "COPIED ✓" : "SHARE FIT CARD"}
            </button>
            <Link href="/closet" className="pill-outline flex-1 text-[10px]">
              VIEW CLOSET
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setPhotos([]);
              setTitle("");
              setBrand("");
              setListed(null);
              setShared(false);
            }}
            className="mono mt-3.5 text-[9px] text-[rgba(237,235,228,.45)] underline"
          >
            sell another
          </button>
        </section>
      )}
    </main>
  );
}
