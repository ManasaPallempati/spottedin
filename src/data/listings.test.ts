import { describe, expect, it } from 'vitest';
import { listingRowToListing, validateListingImage, type ListingRow } from './listings';

const row: ListingRow = {
  id: '72f0bb50-582c-4ff0-bde8-101eb8ef31f5',
  seller_id: '84d594f3-e34d-4478-92e0-9d3b898820bc',
  title: 'Silk saree',
  description: 'Worn once',
  price_inr: 4500,
  category: 'women',
  size: null,
  condition: 'like-new',
  gradient_start: '#7C3AED',
  gradient_end: '#EC4899',
  emoji: '🥻',
  image_path: '84d594f3-e34d-4478-92e0-9d3b898820bc/item.webp',
  likes: 2,
  status: 'live',
  created_at: '2026-07-28T12:00:00.000Z',
};

describe('listingRowToListing', () => {
  it('maps database rows into the app listing model', () => {
    expect(listingRowToListing(row, 'https://example.test/item.webp', Date.parse('2026-07-28T14:00:00Z'))).toEqual({
      id: row.id,
      sellerId: row.seller_id,
      title: 'Silk saree',
      description: 'Worn once',
      priceINR: 4500,
      category: 'women',
      size: undefined,
      condition: 'like-new',
      imageKind: 'gradient',
      gradient: ['#7C3AED', '#EC4899'],
      emoji: '🥻',
      photoDataUrl: 'https://example.test/item.webp',
      likes: 2,
      status: 'live',
      createdAgo: '2h',
    });
  });
});

describe('validateListingImage', () => {
  it('accepts supported files and returns a controlled extension', () => {
    expect(validateListingImage({ type: 'image/webp', size: 1024 })).toBe('webp');
  });

  it('rejects unsupported or oversized files', () => {
    expect(() => validateListingImage({ type: 'image/svg+xml', size: 1024 })).toThrow(/JPEG/);
    expect(() => validateListingImage({ type: 'image/jpeg', size: 8 * 1024 * 1024 + 1 })).toThrow(/8 MB/);
  });
});
