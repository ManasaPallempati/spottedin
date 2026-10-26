import { supabase } from './supabase'
import { REPORT_REASONS, type ReportReason, type ReportTarget } from './safety'

// Moderation queue — backed by supabase/round19-moderation-queue.sql. Every
// call goes through a security-definer function that checks the caller is in
// public.moderators, so a non-moderator gets nothing back.
export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed'

export type QueueReport = {
  id: string
  createdAt: string
  status: ReportStatus
  targetType: ReportTarget
  targetId: string
  targetHandle: string | null
  reason: ReportReason
  details: string | null
  reporterHandle: string | null
  reportsOnTarget: number
  blocksOnHandle: number
}

export type BlockedHandle = { handle: string; blockCount: number; lastBlockedAt: string }

// 'missing' when round 19 has not been run on this database yet.
export type ModeratorCheck = 'yes' | 'no' | 'missing'

type ReportRow = {
  id: string
  created_at: string
  status: ReportStatus
  target_type: ReportTarget
  target_id: string
  target_handle: string | null
  reason: ReportReason
  details: string | null
  reporter_handle: string | null
  reports_on_target: number
  blocks_on_handle: number
}

type BlockedRow = { blocked_handle: string; block_count: number; last_blocked_at: string }

function isMissingFunction(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202'
}

export function reasonLabel(reason: ReportReason): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason
}

export async function checkModerator(): Promise<ModeratorCheck> {
  const { data, error } = await supabase.rpc('is_moderator')
  if (isMissingFunction(error)) return 'missing'
  if (error) console.warn(error)
  return data === true ? 'yes' : 'no'
}

export async function fetchReports(status: ReportStatus | null): Promise<{ reports: QueueReport[]; error: string | null }> {
  const { data, error } = await supabase.rpc('moderation_reports', { p_status: status })
  if (error) {
    console.warn(error)
    return { reports: [], error: 'Could not load reports.' }
  }
  const reports = ((data ?? []) as ReportRow[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    targetType: r.target_type,
    targetId: r.target_id,
    targetHandle: r.target_handle,
    reason: r.reason,
    details: r.details,
    reporterHandle: r.reporter_handle,
    reportsOnTarget: Number(r.reports_on_target),
    blocksOnHandle: Number(r.blocks_on_handle),
  }))
  return { reports, error: null }
}

export async function fetchBlockedHandles(): Promise<BlockedHandle[]> {
  const { data, error } = await supabase.rpc('moderation_blocked_handles')
  if (error) {
    console.warn(error)
    return []
  }
  return ((data ?? []) as BlockedRow[]).map((r) => ({
    handle: r.blocked_handle,
    blockCount: Number(r.block_count),
    lastBlockedAt: r.last_blocked_at,
  }))
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_report_status', { p_report_id: id, p_status: status })
  if (!error) return { error: null }
  console.warn(error)
  // Reopening collides with a newer open report from the same person on the same target.
  if (error.code === '23505') return { error: 'This person already has an open report on the same thing.' }
  return { error: 'Could not update this report. Try again.' }
}
