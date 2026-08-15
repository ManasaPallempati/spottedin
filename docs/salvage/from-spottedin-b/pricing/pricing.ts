export type DropSpeed = 'CHILL' | 'STANDARD' | 'TURBO';

const HOUR_MS = 3600000;

function elapsedHours(now: number, listedAt: number): number {
  return Math.floor((now - listedAt) / HOUR_MS);
}

function drop(speed: DropSpeed, hours: number): number {
  switch (speed) {
    case 'STANDARD':
      return hours * 1;
    case 'TURBO':
      return hours * 2;
    case 'CHILL':
      return Math.floor(hours / 24) * 1;
  }
}

export function currentPrice(
  speed: DropSpeed,
  startPrice: number,
  floorPrice: number,
  listedAt: number,
  now: number,
): number {
  const hours = elapsedHours(now, listedAt);
  const d = drop(speed, hours);
  return Math.max(floorPrice, startPrice - d);
}

export function atFloor(
  speed: DropSpeed,
  startPrice: number,
  floorPrice: number,
  listedAt: number,
  now: number,
): boolean {
  return currentPrice(speed, startPrice, floorPrice, listedAt, now) <= floorPrice;
}

export function stealPct(price: number, retailPrice: number): number {
  return Math.round((1 - price / retailPrice) * 100);
}

export function nextDropEpoch(now: number): number {
  // An exact hour boundary must resolve to the NEXT hour, not itself:
  // Math.ceil(now/HOUR_MS) leaves an exact multiple unchanged, which
  // would otherwise report 0 seconds remaining instead of a full hour.
  if (now % HOUR_MS === 0) {
    return now + HOUR_MS;
  }
  return Math.ceil(now / HOUR_MS) * HOUR_MS;
}

export function secondsToNextDrop(now: number): number {
  return (nextDropEpoch(now) - now) / 1000;
}
