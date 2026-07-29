import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  currentPrice,
  dropAmount,
  hoursSince,
  secondsToNextHour,
  stealPercent,
} from "./pricing";

const listedAt = "2026-07-01T12:00:00Z";
const at = (iso: string) => new Date(iso);

const listing = (dropRate: "CHILL" | "STANDARD" | "TURBO", over: Partial<{ startPrice: number; floorPrice: number }> = {}) => ({
  startPrice: 88,
  floorPrice: 58,
  dropRate,
  listedAt,
  ...over,
});

describe("currentPrice", () => {
  it("keeps the start price before the first full hour elapses", () => {
    expect(currentPrice(listing("STANDARD"), at("2026-07-01T12:59:59Z"))).toBe(88);
    expect(currentPrice(listing("TURBO"), at("2026-07-01T12:00:00Z"))).toBe(88);
  });

  it("CHILL drops $1 per full day", () => {
    expect(currentPrice(listing("CHILL"), at("2026-07-02T11:00:00Z"))).toBe(88);
    expect(currentPrice(listing("CHILL"), at("2026-07-02T12:00:00Z"))).toBe(87);
    expect(currentPrice(listing("CHILL"), at("2026-07-04T14:00:00Z"))).toBe(85);
  });

  it("STANDARD drops $1 per hour", () => {
    expect(currentPrice(listing("STANDARD"), at("2026-07-01T17:00:00Z"))).toBe(83);
  });

  it("TURBO drops $2 per hour", () => {
    expect(currentPrice(listing("TURBO"), at("2026-07-01T17:00:00Z"))).toBe(78);
  });

  it("never falls below the seller's floor", () => {
    expect(currentPrice(listing("STANDARD"), at("2026-08-01T12:00:00Z"))).toBe(58);
    expect(currentPrice(listing("TURBO"), at("2027-07-01T12:00:00Z"))).toBe(58);
    expect(currentPrice(listing("CHILL", { floorPrice: 86 }), at("2026-07-15T12:00:00Z"))).toBe(86);
  });

  it("treats a future listedAt as zero elapsed hours", () => {
    expect(currentPrice(listing("TURBO"), at("2026-06-30T12:00:00Z"))).toBe(88);
  });
});

describe("hoursSince / dropAmount", () => {
  it("counts only complete hours", () => {
    expect(hoursSince(listedAt, at("2026-07-01T13:59:00Z"))).toBe(1);
  });

  it("computes per-rate drops", () => {
    expect(dropAmount("CHILL", 47)).toBe(1);
    expect(dropAmount("STANDARD", 47)).toBe(47);
    expect(dropAmount("TURBO", 47)).toBe(94);
  });
});

describe("stealPercent", () => {
  it("rounds percent under retail", () => {
    expect(stealPercent(88, 260)).toBe(66);
    expect(stealPercent(62, 100)).toBe(38);
  });

  it("returns null without a retail price", () => {
    expect(stealPercent(88, null)).toBeNull();
    expect(stealPercent(88, 0)).toBeNull();
  });
});

describe("countdown", () => {
  it("counts seconds to the top of the hour", () => {
    expect(secondsToNextHour(at("2026-07-01T12:58:30Z"))).toBe(90);
    expect(secondsToNextHour(at("2026-07-01T12:00:00Z"))).toBe(0);
  });

  it("formats MM:SS", () => {
    expect(countdownLabel(90)).toBe("01:30");
    expect(countdownLabel(3599)).toBe("59:59");
  });
});
