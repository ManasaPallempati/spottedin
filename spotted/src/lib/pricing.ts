// Hourly Global Drop pricing. Server-computed, never client-trusted:
// price = max(floor, startPrice - drop(hoursSince(listedAt), rate))
// Rates: CHILL -$1/day, STANDARD -$1/hr, TURBO -$2/hr.
// Every function takes `now` explicitly so callers (and tests) inject time.

export type DropRate = "CHILL" | "STANDARD" | "TURBO";

export interface PricedListing {
  startPrice: number;
  floorPrice: number;
  dropRate: DropRate;
  listedAt: string | Date;
}

const MS_PER_HOUR = 3_600_000;

export function hoursSince(listedAt: string | Date, now: Date): number {
  const listed = typeof listedAt === "string" ? new Date(listedAt) : listedAt;
  return Math.max(0, Math.floor((now.getTime() - listed.getTime()) / MS_PER_HOUR));
}

/** Whole-dollar drop after `hours` complete hours on the rack. */
export function dropAmount(rate: DropRate, hours: number): number {
  switch (rate) {
    case "CHILL":
      return Math.floor(hours / 24);
    case "STANDARD":
      return hours;
    case "TURBO":
      return hours * 2;
  }
}

export function currentPrice(listing: PricedListing, now: Date): number {
  const dropped =
    listing.startPrice - dropAmount(listing.dropRate, hoursSince(listing.listedAt, now));
  return Math.max(listing.floorPrice, dropped);
}

/** Steal Meter: percent under retail, or null when no retail price is set. */
export function stealPercent(price: number, retailPrice: number | null | undefined): number | null {
  if (!retailPrice || retailPrice <= 0) return null;
  return Math.round((1 - price / retailPrice) * 100);
}

export function secondsToNextHour(now: Date): number {
  const seconds = now.getMinutes() * 60 + now.getSeconds();
  return seconds === 0 ? 0 : 3600 - seconds;
}

export function countdownLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function dropRateLabel(rate: DropRate): string {
  switch (rate) {
    case "CHILL":
      return "↓$1/day";
    case "STANDARD":
      return "↓$1/hr";
    case "TURBO":
      return "↓$2/hr";
  }
}
