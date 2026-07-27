// Seed content — 12 sellers, 24 India-flavored listings, 4 DM threads.
// This module is read-only source data; src/data/store.ts is the only place
// that bootstraps it into localStorage and mutates it at runtime.

import type { Listing, Seller, Thread } from './types';

export const sellers: Seller[] = [
  { id: 's1', handle: '@meera.threads', name: 'Meera Iyer', avatarEmoji: '👩🏽', bio: 'Curating pre-loved ethnic wear from Chennai', city: 'Chennai', rating: 4.8, sales: 132 },
  { id: 's2', handle: '@rohan.kicks', name: 'Rohan Verma', avatarEmoji: '🧑🏻', bio: 'Sneakerhead flipping grails since 2019', city: 'Delhi', rating: 4.6, sales: 89 },
  { id: 's3', handle: '@priya.vintage', name: 'Priya Nair', avatarEmoji: '👩🏻', bio: 'Vintage cameras & retro finds', city: 'Bengaluru', rating: 4.9, sales: 54 },
  { id: 's4', handle: '@arjun.tech', name: 'Arjun Mehta', avatarEmoji: '🧑🏽', bio: 'Gadgets, gaming gear, good deals', city: 'Pune', rating: 4.5, sales: 210 },
  { id: 's5', handle: '@ananya.closet', name: 'Ananya Rao', avatarEmoji: '👩🏾', bio: 'Decluttering my closet, one drop at a time', city: 'Hyderabad', rating: 4.7, sales: 76 },
  { id: 's6', handle: '@vikram.sports', name: 'Vikram Singh', avatarEmoji: '🧑🏻', bio: 'Cricket gear & sportswear reseller', city: 'Mumbai', rating: 4.4, sales: 63 },
  { id: 's7', handle: '@sana.home', name: 'Sana Sheikh', avatarEmoji: '👩🏽', bio: 'Home decor treasures, Jaipur sourced', city: 'Jaipur', rating: 4.8, sales: 45 },
  { id: 's8', handle: '@dev.streetwear', name: 'Dev Kapoor', avatarEmoji: '🧑🏾', bio: 'Denim, jackets, streetwear staples', city: 'Delhi', rating: 4.3, sales: 98 },
  { id: 's9', handle: '@kavya.ethnic', name: 'Kavya Reddy', avatarEmoji: '👩🏻', bio: 'Handpicked ethnic wear, sustainably resold', city: 'Hyderabad', rating: 4.9, sales: 121 },
  { id: 's10', handle: '@imran.gear', name: 'Imran Sheikh', avatarEmoji: '🧑🏻', bio: 'Sneakers & gaming gear collector', city: 'Bengaluru', rating: 4.6, sales: 87 },
  { id: 's11', handle: '@leela.antiques', name: 'Leela Menon', avatarEmoji: '👵🏽', bio: 'Family antiques finding new homes', city: 'Kochi', rating: 5.0, sales: 31 },
  { id: 's12', handle: '@siddharth.kurta', name: 'Siddharth Rao', avatarEmoji: '🧑🏽', bio: "Men's ethnic wear specialist", city: 'Lucknow', rating: 4.5, sales: 68 },
];

export const listings: Listing[] = [
  { id: 'l1', sellerId: 's1', title: 'Banarasi Silk Saree', description: 'Handwoven Banarasi silk saree with gold zari border. Worn once for a wedding, dry-cleaned and stored with care.', priceINR: 4999, category: 'women', size: 'Free', condition: 'like-new', imageKind: 'gradient', gradient: ['#D6336C', '#F7C948'], emoji: '🥻', likes: 34, status: 'live', createdAgo: '2h' },
  { id: 'l2', sellerId: 's6', title: 'Team India Cricket Jersey', description: 'Official replica ODI jersey, 2023 edition. Worn a handful of times, no fading.', priceINR: 1299, category: 'men', size: 'L', condition: 'good', imageKind: 'gradient', gradient: ['#1D4ED8', '#F97316'], emoji: '🏏', likes: 21, status: 'live', createdAgo: '5h' },
  { id: 'l3', sellerId: 's2', title: 'Air Jordan 1 Retro High', description: 'Chicago colourway, authentic with box and extra laces. Light creasing on toe box.', priceINR: 8999, category: 'sneakers', size: 'UK9', condition: 'like-new', imageKind: 'gradient', gradient: ['#B91C1C', '#111827'], emoji: '👟', likes: 58, status: 'sold', createdAgo: '1d' },
  { id: 'l4', sellerId: 's9', title: 'Bridal Lehenga Set', description: 'Heavy embroidered bridal lehenga with dupatta and matching blouse. One function only.', priceINR: 15999, category: 'women', size: 'M', condition: 'good', imageKind: 'gradient', gradient: ['#EC4899', '#7C3AED'], emoji: '👗', likes: 47, status: 'live', createdAgo: '3h' },
  { id: 'l5', sellerId: 's3', title: 'Vintage Yashica Film Camera', description: '1970s Yashica 35mm rangefinder, fully functional, light meter works. A collector’s piece.', priceINR: 3499, category: 'vintage', condition: 'fair', imageKind: 'gradient', gradient: ['#92400E', '#FDE68A'], emoji: '📷', likes: 29, status: 'live', createdAgo: '2d' },
  { id: 'l6', sellerId: 's12', title: "Men's Kurta Set", description: 'Cotton kurta-pyjama set, unstitched tags still on. Festive occasion wear.', priceINR: 899, category: 'men', size: 'L', condition: 'new', imageKind: 'gradient', gradient: ['#0F766E', '#FACC15'], emoji: '👘', likes: 12, status: 'live', createdAgo: '6h' },
  { id: 'l7', sellerId: 's4', title: 'Sony PS5 DualSense Controller', description: 'Barely used, no stick drift, comes with original box and cable.', priceINR: 3999, category: 'electronics', condition: 'like-new', imageKind: 'gradient', gradient: ['#4338CA', '#0F172A'], emoji: '🎮', likes: 41, status: 'live', createdAgo: '1d' },
  { id: 'l8', sellerId: 's7', title: 'Brass Diya Set (Set of 6)', description: 'Handcrafted brass diyas, intricate engraving, perfect for Diwali. Unused, in original packaging.', priceINR: 599, category: 'home', condition: 'new', imageKind: 'gradient', gradient: ['#B45309', '#7F1D1D'], emoji: '🪔', likes: 18, status: 'live', createdAgo: '4d' },
  { id: 'l9', sellerId: 's8', title: "Levi's Denim Jacket", description: 'Classic trucker jacket, medium wash, broken in perfectly. No rips or stains.', priceINR: 1799, category: 'men', size: 'M', condition: 'good', imageKind: 'gradient', gradient: ['#1E3A8A', '#93C5FD'], emoji: '🧥', likes: 33, status: 'live', createdAgo: '8h' },
  { id: 'l10', sellerId: 's4', title: 'Akko Mechanical Keyboard', description: 'Hot-swappable mechanical keyboard with tactile browns, RGB backlight, barely used.', priceINR: 4499, category: 'electronics', condition: 'like-new', imageKind: 'gradient', gradient: ['#6D28D9', '#111827'], emoji: '⌨️', likes: 26, status: 'live', createdAgo: '1d' },
  { id: 'l11', sellerId: 's1', title: 'Chanderi Silk Dupatta', description: 'Lightweight Chanderi silk dupatta with gold border, unused with tags.', priceINR: 799, category: 'women', condition: 'new', imageKind: 'gradient', gradient: ['#0D9488', '#FDE047'], emoji: '🧣', likes: 15, status: 'live', createdAgo: '3d' },
  { id: 'l12', sellerId: 's10', title: 'Nike Air Max Sneakers', description: 'Air Max 90, worn a few times, minor sole wear, otherwise clean.', priceINR: 5499, category: 'sneakers', size: 'UK8', condition: 'good', imageKind: 'gradient', gradient: ['#16A34A', '#F0FDF4'], emoji: '👟', likes: 22, status: 'live', createdAgo: '2d' },
  { id: 'l13', sellerId: 's7', title: 'Rajasthani Puppet Wall Decor', description: 'Handpainted Kathputli wall hanging, vibrant colours, great statement piece.', priceINR: 449, category: 'home', condition: 'good', imageKind: 'gradient', gradient: ['#C2410C', '#FDE68A'], emoji: '🖼️', likes: 9, status: 'live', createdAgo: '5d' },
  { id: 'l14', sellerId: 's5', title: "Women's Palazzo Set", description: 'Printed palazzo co-ord set, breathable rayon fabric, worn twice.', priceINR: 1099, category: 'women', size: 'S', condition: 'new', imageKind: 'gradient', gradient: ['#F97316', '#FFF7ED'], emoji: '👚', likes: 17, status: 'live', createdAgo: '7h' },
  { id: 'l15', sellerId: 's11', title: 'Vintage Vinyl Record Player', description: "Fully working turntable from the 1980s, belonged to my father, well maintained.", priceINR: 6999, category: 'vintage', condition: 'fair', imageKind: 'gradient', gradient: ['#7C2D12', '#FBBF24'], emoji: '💿', likes: 24, status: 'live', createdAgo: '4d' },
  { id: 'l16', sellerId: 's12', title: "Men's Nehru Jacket", description: 'Maroon Nehru jacket, festive wear, dry-cleaned, worn once.', priceINR: 1499, category: 'men', size: 'L', condition: 'like-new', imageKind: 'gradient', gradient: ['#7F1D1D', '#FACC15'], emoji: '🧥', likes: 14, status: 'live', createdAgo: '1d' },
  { id: 'l17', sellerId: 's3', title: 'Canon DSLR Camera + Bag Combo', description: 'Canon 1500D with 18-55mm kit lens, camera bag and 32GB card included.', priceINR: 12999, category: 'electronics', condition: 'good', imageKind: 'gradient', gradient: ['#111827', '#6B7280'], emoji: '📸', likes: 37, status: 'live', createdAgo: '2d' },
  { id: 'l18', sellerId: 's7', title: 'Handwoven Jute Rug', description: 'Natural jute area rug, 5x7 ft, handwoven, great for living rooms.', priceINR: 1299, category: 'home', condition: 'new', imageKind: 'gradient', gradient: ['#A16207', '#FEF3C7'], emoji: '🪢', likes: 11, status: 'live', createdAgo: '6d' },
  { id: 'l19', sellerId: 's2', title: 'Adidas Ultraboost Sneakers', description: 'Ultraboost 21, worn a handful of runs, boost cushioning still springy.', priceINR: 6499, category: 'sneakers', size: 'UK10', condition: 'like-new', imageKind: 'gradient', gradient: ['#F8FAFC', '#111827'], emoji: '👟', likes: 44, status: 'sold', createdAgo: '3d' },
  { id: 'l20', sellerId: 's3', title: 'Vintage Polaroid Camera', description: 'Working Polaroid 600 series camera, tested with fresh film pack.', priceINR: 2999, category: 'vintage', condition: 'good', imageKind: 'gradient', gradient: ['#EA580C', '#78350F'], emoji: '🎞️', likes: 19, status: 'live', createdAgo: '5h' },
  { id: 'l21', sellerId: 's9', title: 'Ethnic Anarkali Suit', description: 'Floor-length Anarkali suit with dupatta, worn once at a family function.', priceINR: 2499, category: 'women', size: 'M', condition: 'like-new', imageKind: 'gradient', gradient: ['#BE185D', '#FACC15'], emoji: '👗', likes: 31, status: 'live', createdAgo: '1d' },
  { id: 'l22', sellerId: 's10', title: 'Logitech Gaming Mouse', description: 'Logitech G302, unused, still sealed, extra weight kit included.', priceINR: 1999, category: 'electronics', condition: 'new', imageKind: 'gradient', gradient: ['#111827', '#22C55E'], emoji: '🖱️', likes: 16, status: 'live', createdAgo: '9h' },
  { id: 'l23', sellerId: 's11', title: 'Antique Brass Wall Clock', description: 'Vintage brass wall clock, working condition, beautiful patina.', priceINR: 1899, category: 'vintage', condition: 'fair', imageKind: 'gradient', gradient: ['#92400E', '#FEF3C7'], emoji: '🕰️', likes: 13, status: 'live', createdAgo: '1w' },
  { id: 'l24', sellerId: 's12', title: 'Ethnic Nehru Kurta', description: 'Navy blue Nehru-collar kurta, festive fabric, brand new with tags.', priceINR: 1199, category: 'men', size: 'XL', condition: 'new', imageKind: 'gradient', gradient: ['#1E293B', '#EAB308'], emoji: '🥻', likes: 8, status: 'live', createdAgo: '2d' },
];

export const threads: Thread[] = [
  {
    id: 't1',
    listingId: 'l3',
    peerId: 's2',
    messages: [
      { from: 'peer', text: 'Hey! Thanks for checking out the Jordans 👟', timeAgo: '2d' },
      { from: 'me', text: 'Hi, are these still available?', timeAgo: '2d' },
      { from: 'peer', text: 'Sold already, sorry! Got more grails dropping soon though.', timeAgo: '1d' },
      { from: 'me', text: 'Ah no worries, keep me posted!', timeAgo: '1d' },
      { from: 'peer', text: 'Will do 🙌', timeAgo: '1d' },
    ],
  },
  {
    id: 't2',
    listingId: 'l1',
    peerId: 's1',
    messages: [
      { from: 'me', text: 'Hi, is the saree pure silk?', timeAgo: '3h' },
      { from: 'peer', text: 'Yes, handwoven Banarasi silk, worn once for a wedding', timeAgo: '3h' },
      { from: 'me', text: 'Beautiful! Any flexibility on price?', timeAgo: '2h' },
      { from: 'peer', text: 'Can do ₹4599 if you pick up in Chennai', timeAgo: '2h' },
      { from: 'me', text: "Deal, I'll message my address", timeAgo: '1h' },
      { from: 'peer', text: 'Perfect, looking forward to it 😊', timeAgo: '1h' },
    ],
  },
  {
    id: 't3',
    listingId: 'l7',
    peerId: 's4',
    messages: [
      { from: 'me', text: 'Does the controller drift at all?', timeAgo: '1d' },
      { from: 'peer', text: 'Nope, barely used, works perfectly', timeAgo: '1d' },
      { from: 'me', text: "Great, I'll take it", timeAgo: '20h' },
      { from: 'peer', text: "Awesome, I'll mark it aside for you", timeAgo: '19h' },
    ],
  },
  {
    id: 't4',
    listingId: 'l15',
    peerId: 's11',
    messages: [
      { from: 'me', text: 'Is this still working? Vintage stuff can be tricky', timeAgo: '5d' },
      { from: 'peer', text: 'Fully functional, belonged to my father, well maintained', timeAgo: '5d' },
      { from: 'me', text: 'That’s lovely. Does it come with the original speakers?', timeAgo: '4d' },
    ],
  },
];
