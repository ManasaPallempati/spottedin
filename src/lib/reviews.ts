import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Buyer reviews of sellers (round 23). One per delivered, paid order, written
// only through leave_review(); everyone can read them.
export type Review = {
  id: string
  orderId: string
  rating: number
  comment: string
  createdAt: number
  reviewerHandle: string | null
}

type ReviewRow = {
  id: string
  order_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: { handle: string } | null
}

const COLUMNS = 'id, order_id, rating, comment, created_at, reviewer:profiles!spotted_reviews_reviewer_id_fkey(handle)'

export const REVIEW_MAX_LENGTH = 500

function mapReview(r: ReviewRow): Review {
  return {
    id: r.id,
    orderId: r.order_id,
    rating: r.rating,
    comment: r.comment ?? '',
    createdAt: Date.parse(r.created_at),
    reviewerHandle: r.reviewer?.handle ?? null,
  }
}

export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null
  return Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
}

// leave_review() raises plain-English messages; map the ones a buyer can hit.
function reviewProblem(message: string | undefined): string {
  if (message?.includes('already reviewed')) return "You've already reviewed this order."
  if (message?.includes('delivered order')) return 'You can review once the order is marked as received.'
  return "Couldn't save your review. Try again."
}

export function useSellerReviews(sellerId: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sellerId) {
      setReviews([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('spotted_reviews')
      .select(COLUMNS)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        // Before round 23 runs the table is missing; the shop just shows no reviews.
        if (error) console.warn(error)
        setReviews(((data ?? []) as unknown as ReviewRow[]).map(mapReview))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  return { reviews, loading }
}

export function useOrderReview(orderId: string, enabled: boolean) {
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('spotted_reviews')
      .select(COLUMNS)
      .eq('order_id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.warn(error)
        setReview(data ? mapReview(data as unknown as ReviewRow) : null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, enabled])

  // Returns a message to show, or null once the review is saved.
  const leaveReview = useCallback(
    async (rating: number, comment: string): Promise<string | null> => {
      const text = comment.trim()
      const { error } = await supabase.rpc('leave_review', { p_order_id: orderId, p_rating: rating, p_comment: text })
      if (error) {
        console.warn(error)
        return reviewProblem(error.message)
      }
      setReview({ id: orderId, orderId, rating, comment: text, createdAt: Date.now(), reviewerHandle: null })
      return null
    },
    [orderId]
  )

  return { review, loading, leaveReview }
}
