import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useAuth } from '../lib/auth'
import { REPORT_REASONS, isBlocked, setBlocked, submitReport, type ReportReason, type ReportTarget } from '../lib/safety'
import './SafetyMenu.css'

type Props = {
  targetType: ReportTarget
  targetId: string
  /** The account behind the target; enables Block. Omitted for your own content. */
  handle?: string
  label?: string
}

// "Report / Block" entry point used on listings, shops and chat threads.
export default function SafetyMenu({ targetType, targetId, handle, label = 'Report or block' }: Props) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const uid = session?.user.id
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlockedState] = useState(false)

  const isSelf = !!handle && profile?.handle === handle

  useEffect(() => {
    if (!open || !uid || !handle) return
    let cancelled = false
    isBlocked(uid, handle).then((b) => !cancelled && setBlockedState(b))
    return () => {
      cancelled = true
    }
  }, [open, uid, handle])

  if (isSelf) return null

  function openSheet() {
    if (!uid) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    setReason(null)
    setDetails('')
    setDone(null)
    setError(null)
    setOpen(true)
  }

  async function sendReport() {
    if (!uid || !reason) return
    setBusy(true)
    const { error: e } = await submitReport({ reporterId: uid, targetType, targetId, targetHandle: handle, reason, details })
    setBusy(false)
    if (e) setError(e)
    else setDone('Thanks — our team will review this. Reports are anonymous.')
  }

  async function toggleBlock() {
    if (!uid || !handle) return
    setBusy(true)
    const { error: e } = await setBlocked(uid, handle, !blocked)
    setBusy(false)
    if (e) setError(e)
    else {
      setBlockedState(!blocked)
      setDone(!blocked ? `@${handle} is blocked. They can't message you or make offers.` : `@${handle} is unblocked.`)
    }
  }

  return (
    <>
      <button type="button" className="safety-trigger" onClick={openSheet} aria-label={label}>
        <Flag size={16} />
        <span>Report</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={done ? 'Done' : 'Report or block'}>
        {done ? (
          <div className="safety-done">
            <p>{done}</p>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        ) : (
          <div className="safety-body">
            <p className="safety-hint">Why are you reporting this {targetType === 'thread' ? 'chat' : targetType}?</p>
            <div className="safety-reasons" role="radiogroup">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  className={'safety-reason' + (reason === r.value ? ' is-selected' : '')}
                  onClick={() => setReason(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reason && (
              <textarea
                className="safety-details"
                rows={3}
                maxLength={1000}
                placeholder="Anything else we should know? (optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            )}
            {error && (
              <p className="safety-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn btn-primary" disabled={!reason || busy} onClick={sendReport}>
              Send report
            </button>
            {handle && (
              <button type="button" className="btn btn-outline safety-block" disabled={busy} onClick={toggleBlock}>
                {blocked ? `Unblock @${handle}` : `Block @${handle}`}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
