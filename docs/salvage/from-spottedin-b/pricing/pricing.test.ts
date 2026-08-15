import { describe, it, expect } from 'vitest';
import { currentPrice, stealPct, nextDropEpoch, secondsToNextDrop, atFloor } from './pricing';

const HOUR = 3600000;
const listedAt = Date.UTC(2000, 0, 1, 0, 0, 0); // Y2K, fixed instant

describe('currentPrice', () => {
  it('Y2K MOTO, STANDARD: start 88 / floor 58 / retail 260', () => {
    expect(currentPrice('STANDARD', 88, 58, listedAt, listedAt + 0 * HOUR)).toBe(88);
    expect(currentPrice('STANDARD', 88, 58, listedAt, listedAt + 5 * HOUR)).toBe(83);
    expect(currentPrice('STANDARD', 88, 58, listedAt, listedAt + 30 * HOUR)).toBe(58);
    expect(currentPrice('STANDARD', 88, 58, listedAt, listedAt + 31 * HOUR)).toBe(58);
    expect(stealPct(83, 260)).toBe(68);
  });

  it('CHILL, start 100 / floor 90', () => {
    expect(currentPrice('CHILL', 100, 90, listedAt, listedAt + 23 * HOUR)).toBe(100);
    expect(currentPrice('CHILL', 100, 90, listedAt, listedAt + 24 * HOUR)).toBe(99);
    expect(currentPrice('CHILL', 100, 90, listedAt, listedAt + 240 * HOUR)).toBe(90);
  });

  it('TURBO, start 50 / floor 20', () => {
    expect(currentPrice('TURBO', 50, 20, listedAt, listedAt + 10 * HOUR)).toBe(30);
    expect(currentPrice('TURBO', 50, 20, listedAt, listedAt + 20 * HOUR)).toBe(20);
    expect(currentPrice('TURBO', 50, 20, listedAt, listedAt + 25 * HOUR)).toBe(20);
  });
});

describe('secondsToNextDrop', () => {
  it('is 30 at XX:59:30', () => {
    const now = Date.UTC(2026, 5, 15, 13, 59, 30);
    expect(secondsToNextDrop(now)).toBe(30);
  });

  it('is a full 3600 exactly at an hour boundary (not 0)', () => {
    const now = Date.UTC(2026, 5, 15, 14, 0, 0);
    expect(secondsToNextDrop(now)).toBe(3600);
  });
});

describe('stealPct', () => {
  it('is never negative when price <= retail', () => {
    expect(stealPct(260, 260)).toBeGreaterThanOrEqual(0);
    expect(stealPct(58, 260)).toBeGreaterThanOrEqual(0);
    expect(stealPct(1, 260)).toBeGreaterThanOrEqual(0);
    expect(stealPct(0, 260)).toBeGreaterThanOrEqual(0);
  });
});

describe('nextDropEpoch', () => {
  it('matches ceil(now / hour) * hour for arbitrary non-boundary instants', () => {
    const instants = [
      Date.UTC(2026, 0, 1, 3, 12, 45),
      Date.UTC(2026, 5, 15, 13, 59, 59),
      Date.UTC(1999, 11, 31, 23, 0, 1),
      Date.UTC(2030, 6, 4, 0, 0, 1),
    ];
    for (const now of instants) {
      expect(nextDropEpoch(now)).toBe(Math.ceil(now / HOUR) * HOUR);
    }
  });
});

describe('atFloor', () => {
  it('is true once price has clamped to the floor', () => {
    expect(atFloor('STANDARD', 88, 58, listedAt, listedAt + 30 * HOUR)).toBe(true);
    expect(atFloor('STANDARD', 88, 58, listedAt, listedAt + 5 * HOUR)).toBe(false);
  });
});
