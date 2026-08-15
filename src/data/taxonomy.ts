export type DepartmentSlug = 'women' | 'men' | 'kids' | 'accessories'

export type Department = {
  slug: DepartmentSlug
  label: string
  description: string
}

export type Category = {
  slug: string
  label: string
  department: DepartmentSlug
  queryTerms: string[]
  description: string
  legacySlugs?: string[]
  aggregate?: boolean
}

export type CategorizedListing = {
  brand: string
  category?: string
  description?: string
}

export const DEPARTMENTS: Department[] = [
  { slug: 'women', label: 'Women', description: 'Sarees, lehengas, suits, sets and separates.' },
  { slug: 'men', label: 'Men', description: 'Kurtas, sherwanis, jackets and traditional sets.' },
  { slug: 'kids', label: 'Kids', description: 'Occasion and festive outfits for girls and boys.' },
  {
    slug: 'accessories',
    label: 'Jewelry & Accessories',
    description: 'Jewelry, dupattas, footwear, bags and finishing pieces.',
  },
]

export const INDIAN_CATEGORIES: Category[] = [
  {
    slug: 'sarees',
    label: 'Sarees',
    department: 'women',
    queryTerms: ['saree', 'sari'],
    description: 'Classic, regional, contemporary and ready-to-wear sarees.',
  },
  {
    slug: 'lehengas',
    label: 'Lehengas & Chaniya Cholis',
    department: 'women',
    queryTerms: ['lehenga', 'chaniya choli', 'ghagra choli'],
    description: 'Lehenga and chaniya-choli sets for celebrations and formal events.',
  },
  {
    slug: 'salwar-kameez-punjabi-suits',
    label: 'Salwar Kameez & Punjabi Suits',
    department: 'women',
    queryTerms: ['salwar', 'kameez', 'punjabi suit', 'patiala'],
    description: 'Complete salwar-kameez, Punjabi-suit and Patiala sets.',
    legacySlugs: ['salwar-and-anarkali'],
  },
  {
    slug: 'anarkalis',
    label: 'Anarkalis',
    department: 'women',
    queryTerms: ['anarkali'],
    description: 'Floor-length and everyday Anarkali suits and sets.',
  },
  {
    slug: 'sharara-gharara-sets',
    label: 'Sharara & Gharara Sets',
    department: 'women',
    queryTerms: ['sharara', 'gharara'],
    description: 'Sharara and gharara sets for weddings and festive occasions.',
  },
  {
    slug: 'womens-kurtas-kurtis',
    label: 'Kurtas, Kurtis & Kurta Sets',
    department: 'women',
    queryTerms: ['kurta', 'kurti', 'kurta set'],
    description: 'Women’s everyday and occasion kurtas, kurtis and coordinated sets.',
  },
  {
    slug: 'womens-indo-western-gowns',
    label: 'Indo-Western, Gowns & Dresses',
    department: 'women',
    queryTerms: ['indo western', 'gown', 'dress', 'jumpsuit'],
    description: 'Contemporary Indo-Western dresses, gowns and fusion silhouettes.',
  },
  {
    slug: 'blouses-separates',
    label: 'Blouses & Separates',
    department: 'women',
    queryTerms: ['blouse', 'choli', 'skirt', 'palazzo', 'pant'],
    description: 'Blouses, cholis, skirts, pants and individual outfit pieces.',
  },
  {
    slug: 'mens-kurtas',
    label: 'Kurtas & Kurta-Pajama Sets',
    department: 'men',
    queryTerms: ['kurta', 'kurta pajama', 'kurta pyjama'],
    description: 'Men’s kurtas and complete kurta-pajama sets.',
    legacySlugs: ['kurtas'],
  },
  {
    slug: 'sherwanis',
    label: 'Sherwanis & Achkans',
    department: 'men',
    queryTerms: ['sherwani', 'achkan'],
    description: 'Sherwanis and achkans for grooms, wedding parties and guests.',
  },
  {
    slug: 'nehru-jackets-bandhgalas',
    label: 'Nehru Jackets, Bandhgalas & Jodhpuri',
    department: 'men',
    queryTerms: ['nehru jacket', 'bandhgala', 'jodhpuri'],
    description: 'Structured jackets and formal Indian menswear separates.',
  },
  {
    slug: 'dhoti-veshti-sets',
    label: 'Dhoti, Veshti & Traditional Sets',
    department: 'men',
    queryTerms: ['dhoti', 'veshti', 'mundu', 'traditional set'],
    description: 'Dhoti, veshti, mundu and coordinated traditional sets.',
  },
  {
    slug: 'mens-indo-western-suits',
    label: 'Indo-Western & Suits',
    department: 'men',
    queryTerms: ['indo western', 'suit', 'tuxedo'],
    description: 'Fusion menswear, formal suits and contemporary occasion looks.',
  },
  {
    slug: 'girls-lehenga-saree-sets',
    label: 'Girls’ Lehenga & Saree Sets',
    department: 'kids',
    queryTerms: ['girls lehenga', 'kids lehenga', 'girls saree', 'pavadai'],
    description: 'Girls’ lehenga, saree and pavadai-style occasion sets.',
  },
  {
    slug: 'girls-salwar-kurta-sets',
    label: 'Girls’ Salwar, Anarkali & Kurta Sets',
    department: 'kids',
    queryTerms: ['girls salwar', 'girls anarkali', 'girls kurta', 'kids salwar'],
    description: 'Girls’ salwar, Anarkali and kurta sets for events and festivals.',
  },
  {
    slug: 'boys-kurta-pajama-sets',
    label: 'Boys’ Kurta-Pajama Sets',
    department: 'kids',
    queryTerms: ['boys kurta', 'kids kurta', 'boy kurta pajama'],
    description: 'Boys’ kurta-pajama and waistcoat sets.',
  },
  {
    slug: 'boys-sherwani-dhoti-sets',
    label: 'Boys’ Sherwani & Dhoti Sets',
    department: 'kids',
    queryTerms: ['boys sherwani', 'kids sherwani', 'boys dhoti', 'kids dhoti'],
    description: 'Boys’ sherwani and dhoti sets for weddings and celebrations.',
  },
  {
    slug: 'jewelry',
    label: 'Jewelry',
    department: 'accessories',
    queryTerms: ['jewelry', 'jewellery', 'necklace', 'earring', 'bangle', 'maang tikka'],
    description: 'Necklaces, earrings, bangles, tikka sets and other jewelry.',
  },
  {
    slug: 'dupattas-stoles',
    label: 'Dupattas & Stoles',
    department: 'accessories',
    queryTerms: ['dupatta', 'stole', 'shawl'],
    description: 'Statement dupattas, stoles and shawls sold separately.',
  },
  {
    slug: 'juttis-mojaris',
    label: 'Juttis & Mojaris',
    department: 'accessories',
    queryTerms: ['jutti', 'mojari', 'khussa'],
    description: 'Traditional and contemporary juttis, mojaris and khussas.',
  },
  {
    slug: 'bags-potlis',
    label: 'Bags & Potlis',
    department: 'accessories',
    queryTerms: ['bag', 'potli', 'clutch'],
    description: 'Potlis, clutches and bags for Indian and fusion looks.',
  },
  {
    slug: 'other-accessories',
    label: 'Other Accessories',
    department: 'accessories',
    queryTerms: ['accessory', 'accessories', 'belt', 'brooch', 'hair'],
    description: 'Belts, brooches, hair pieces and other finishing accessories.',
  },
]

export const FEATURED_CATEGORIES: Category[] = [
  INDIAN_CATEGORIES.find((category) => category.slug === 'sarees')!,
  INDIAN_CATEGORIES.find((category) => category.slug === 'lehengas')!,
  {
    slug: 'womens-suits-sets',
    label: 'Women’s Suits & Sets',
    department: 'women',
    queryTerms: ['salwar', 'kameez', 'punjabi suit', 'anarkali', 'sharara', 'gharara', 'kurta', 'kurti'],
    description: 'Salwar, Anarkali, sharara, gharara and women’s kurta sets.',
    aggregate: true,
  },
  INDIAN_CATEGORIES.find((category) => category.slug === 'mens-kurtas')!,
  INDIAN_CATEGORIES.find((category) => category.slug === 'sherwanis')!,
  {
    slug: 'kids',
    label: 'Kidswear',
    department: 'kids',
    queryTerms: ['girls', 'boys', 'kids', 'children', 'pavadai'],
    description: 'Indian occasion and festive outfits for girls and boys.',
    aggregate: true,
  },
  {
    slug: 'accessories',
    label: 'Jewelry & Accessories',
    department: 'accessories',
    queryTerms: ['jewelry', 'jewellery', 'dupatta', 'jutti', 'mojari', 'potli', 'accessory'],
    description: 'Jewelry, dupattas, footwear, bags and finishing pieces.',
    aggregate: true,
  },
]

export function normalizeCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function departmentFromStoredCategory(value: string): DepartmentSlug | null {
  switch (normalizeCategory(value)) {
    case 'women':
    case 'womenswear':
      return 'women'
    case 'men':
    case 'menswear':
      return 'men'
    case 'kids':
    case 'kidswear':
      return 'kids'
    case 'accessories':
    case 'jewelry-accessories':
    case 'everything-else':
      return 'accessories'
    default:
      return null
  }
}

export function categoryBySlug(value: string): Category | undefined {
  const slug = normalizeCategory(value)
  return [...INDIAN_CATEGORIES, ...FEATURED_CATEGORIES].find((category) => category.slug === slug)
}

export function categoriesForDepartment(department: DepartmentSlug): Category[] {
  return INDIAN_CATEGORIES.filter((category) => category.department === department)
}

export function listingMatchesCategory(listing: CategorizedListing, category: Category): boolean {
  const storedCategory = normalizeCategory(listing.category ?? '')
  const storedDepartment = departmentFromStoredCategory(storedCategory)

  if (storedCategory === category.slug || category.legacySlugs?.includes(storedCategory)) return true
  if (storedDepartment && storedDepartment !== category.department) return false
  if (category.aggregate && storedDepartment === category.department) return true

  const haystack = normalizeCategory(
    [listing.brand, listing.description, listing.category].filter(Boolean).join(' '),
  )
  return category.queryTerms.some((term) => haystack.includes(normalizeCategory(term)))
}

export function categoryForListing(listing: CategorizedListing): Category | undefined {
  const storedCategory = normalizeCategory(listing.category ?? '')
  const direct = INDIAN_CATEGORIES.find(
    (category) => category.slug === storedCategory || category.legacySlugs?.includes(storedCategory),
  )
  return direct ?? INDIAN_CATEGORIES.find((category) => listingMatchesCategory(listing, category))
}

export function categoryLabelFor(value: string): string {
  return categoryBySlug(value)?.label ?? 'Category'
}

export function isKnownCategory(value: string): boolean {
  return Boolean(categoryBySlug(value))
}
