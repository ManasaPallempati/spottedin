import { supabase } from './supabase'

// Report and Block — backed by supabase/round17-reports-and-blocks.sql.
export type ReportTarget = 'listing' | 'profile' | 'thread'
export type ReportReason = 'prohibited_item' | 'counterfeit' | 'scam' | 'harassment' | 'inappropriate' | 'spam' | 'other'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'counterfeit', label: 'Counterfeit or fake' },
  { value: 'prohibited_item', label: 'Prohibited item' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
]

export async function submitReport(input: {
  reporterId: string
  targetType: ReportTarget
  targetId: string
  targetHandle?: string
  reason: ReportReason
  details?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    target_handle: input.targetHandle ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
  })
  if (!error) return { error: null }
  // The partial unique index rejects a second open report on the same target.
  if (error.code === '23505') return { error: null }
  console.warn(error)
  return { error: 'We could not send your report just now. Please try again.' }
}

export async function isBlocked(blockerId: string, handle: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocks')
    .select('blocked_handle')
    .eq('blocker_id', blockerId)
    .eq('blocked_handle', handle)
    .maybeSingle()
  return Boolean(data)
}

export async function setBlocked(blockerId: string, handle: string, blocked: boolean): Promise<{ error: string | null }> {
  const { error } = blocked
    ? await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_handle: handle })
    : await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_handle', handle)
  if (error && error.code !== '23505') {
    console.warn(error)
    return { error: blocked ? 'We could not block this account just now.' : 'We could not unblock this account just now.' }
  }
  return { error: null }
}
