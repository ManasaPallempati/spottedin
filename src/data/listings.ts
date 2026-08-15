export type Listing = {
  id: string
  brand: string
  description?: string
  size: string
  price: number
  originalPrice?: number
  category?: string
  likes: number
  img: string
  sellerId?: string
  sellerHandle?: string
  sellerName?: string
  sellerBio?: string
  sellerRating?: number | null
  sellerSales?: number | null
  status?: 'live' | 'sold'
}
