import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  checkModerator,
  fetchBlockedHandles,
  fetchReports,
  reasonLabel,
  setReportStatus,
  type BlockedHandle,
  type ModeratorCheck,
  type QueueReport,
  type ReportStatus,
} from '../lib/moderation'
import NotFound from './NotFound'
import './admin.css'

const FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
]

// Next steps offered for a report in each status.
const ACTIONS: Record<ReportStatus, { status: ReportStatus; label: string }[]> = {
  open: [
    { status: 'reviewing', label: 'Start review' },
    { status: 'dismissed', label: 'Dismiss' },
  ],
  reviewing: [
    { status: 'actioned', label: 'Mark actioned' },
    { status: 'dismissed', label: 'Dismiss' },
  ],
  actioned: [{ status: 'open', label: 'Reopen' }],
  dismissed: [{ status: 'open', label: 'Reopen' }],
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function targetLink(r: QueueReport): { to: string; label: string } {
  if (r.targetType === 'listing') return { to: `/listing/${encodeURIComponent(r.targetId)}`, label: 'Listing' }
  const handle = r.targetHandle ?? r.targetId
  // Moderators can't read other people's chats; the shop is the closest view.
  return { to: `/shop/${encodeURIComponent(handle)}`, label: r.targetType === 'thread' ? `Chat with @${handle}` : `@${handle}` }
}

function ReportCard({ report, onChanged }: { report: QueueReport; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const target = targetLink(report)

  async function move(status: ReportStatus) {
    setBusy(true)
    setError(null)
    const { error: updateError } = await setReportStatus(report.id, status)
    setBusy(false)
    if (updateError) setError(updateError)
    else onChanged()
  }

  return (
    <li className="admin-report">
      <div className="admin-report-head">
        <span className="admin-reason">{reasonLabel(report.reason)}</span>
        <span className="admin-when">{formatWhen(report.createdAt)}</span>
      </div>
      <p className="admin-target">
        <Link to={target.to}>{target.label}</Link>
        {report.targetType === 'listing' && report.targetHandle && <span> by @{report.targetHandle}</span>}
      </p>
      {report.details && <p className="admin-details">“{report.details}”</p>}
      <p className="admin-meta">
        Reported by {report.reporterHandle ? `@${report.reporterHandle}` : 'a deleted account'}
        {' · '}
        {report.reportsOnTarget} report{report.reportsOnTarget === 1 ? '' : 's'} on this
        {report.targetHandle && (
          <>
            {' · '}blocked by {report.blocksOnHandle}
          </>
        )}
      </p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-actions">
        {ACTIONS[report.status].map((a) => (
          <button key={a.status} type="button" className="btn btn-outline" disabled={busy} onClick={() => move(a.status)}>
            {a.label}
          </button>
        ))}
      </div>
    </li>
  )
}

// /admin/reports — the moderators' queue. Anyone else gets the normal 404 page,
// so the route doesn't advertise itself.
export default function AdminReports() {
  const navigate = useNavigate()
  const { isAuthed, loading: authLoading } = useAuth()
  const [moderator, setModerator] = useState<ModeratorCheck | null>(null)
  const [filter, setFilter] = useState<ReportStatus>('open')
  const [reports, setReports] = useState<QueueReport[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BlockedHandle[]>([])

  useEffect(() => {
    if (authLoading || !isAuthed) return
    let cancelled = false
    checkModerator().then((result) => {
      if (!cancelled) setModerator(result)
    })
    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthed])

  const load = useCallback(async () => {
    const [{ reports: rows, error }, blockedRows] = await Promise.all([fetchReports(filter), fetchBlockedHandles()])
    setReports(rows)
    setLoadError(error)
    setBlocked(blockedRows)
  }, [filter])

  useEffect(() => {
    if (moderator !== 'yes') return
    setReports(null)
    void load()
  }, [moderator, load])

  if (!authLoading && !isAuthed) return <Navigate to="/login?next=%2Fadmin%2Freports" replace />
  if (moderator === 'no') return <NotFound />

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h1 className="admin-title">Reports</h1>
      </header>

      {moderator === null && <p className="admin-empty">Loading…</p>}

      {moderator === 'missing' && (
        <p className="admin-empty" role="alert">
          The moderation queue isn&apos;t set up on this database yet. Run supabase/round19-moderation-queue.sql.
        </p>
      )}

      {moderator === 'yes' && (
        <>
          <div className="admin-filters" role="tablist" aria-label="Report status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                className={'admin-filter' + (filter === f.value ? ' active' : '')}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loadError && (
            <p className="admin-error" role="alert">
              {loadError}
            </p>
          )}
          {reports === null ? (
            <p className="admin-empty">Loading reports…</p>
          ) : reports.length === 0 ? (
            <p className="admin-empty">No {filter} reports.</p>
          ) : (
            <ul className="admin-list">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} onChanged={load} />
              ))}
            </ul>
          )}

          <h2 className="admin-section">Most blocked accounts</h2>
          {blocked.length === 0 ? (
            <p className="admin-empty">Nobody has been blocked yet.</p>
          ) : (
            <ul className="admin-blocked">
              {blocked.map((b) => (
                <li key={b.handle}>
                  <Link to={`/shop/${encodeURIComponent(b.handle)}`}>@{b.handle}</Link>
                  <span>
                    blocked by {b.blockCount} · last {formatWhen(b.lastBlockedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
