// The moderators' report queue at /admin/reports, rendered as the whole app
// against the in-memory Supabase fake.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { db, makeSession, rpcResults, setRpcMissing, setSession, supabase } from './fakeSupabase'

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

// An adult with a date of birth on file, so the birthday gate (App.tsx) lets them through.
const MODERATOR = { id: 'mod-1', handle: 'manasa', name: 'Manasa', date_of_birth: '1995-04-12' }

const REPORT = {
  id: 'report-1',
  created_at: '2026-10-25T09:30:00Z',
  status: 'open',
  target_type: 'listing',
  target_id: 'listing-9',
  target_handle: 'fakeseller',
  reason: 'counterfeit',
  details: 'Logo is printed on, not woven.',
  reporter_handle: 'asha',
  reports_on_target: 3,
  blocks_on_handle: 2,
}

function signInModerator() {
  db.profiles = [MODERATOR]
  setSession(makeSession('manasa@example.com', 'mod-1'))
}

describe('admin report queue', () => {
  it('sends signed-out visitors to log in', async () => {
    visit('/admin/reports')
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(new URLSearchParams(window.location.search).get('next')).toBe('/admin/reports')
  })

  it('shows members who are not moderators the normal 404 page', async () => {
    signInModerator()
    rpcResults.is_moderator = false
    visit('/admin/reports')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
    expect(supabase.rpc).not.toHaveBeenCalledWith('moderation_reports', expect.anything())
  })

  it('says what to run when round 19 is not on the database yet', async () => {
    signInModerator()
    setRpcMissing('is_moderator')
    visit('/admin/reports')

    expect((await screen.findByRole('alert')).textContent).toContain('round19-moderation-queue.sql')
  })

  it('lists open reports with counts and the most-blocked accounts', async () => {
    signInModerator()
    rpcResults.is_moderator = true
    rpcResults.moderation_reports = [REPORT]
    rpcResults.moderation_blocked_handles = [
      { blocked_handle: 'fakeseller', block_count: 2, last_blocked_at: '2026-10-25T10:00:00Z' },
    ]
    visit('/admin/reports')

    expect(await screen.findByText('Counterfeit or fake')).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('moderation_reports', { p_status: 'open' })
    expect(screen.getByRole('link', { name: 'Listing' }).getAttribute('href')).toBe('/listing/listing-9')
    expect(screen.getByText('“Logo is printed on, not woven.”')).toBeTruthy()
    expect(screen.getByText(/Reported by @asha · 3 reports on this · blocked by 2/)).toBeTruthy()

    const blocked = screen.getByRole('heading', { name: 'Most blocked accounts' }).nextElementSibling as HTMLElement
    expect(within(blocked).getByRole('link', { name: '@fakeseller' })).toBeTruthy()
    expect(within(blocked).getByText(/blocked by 2/)).toBeTruthy()
  })

  it('moves a report to reviewing and reloads the queue', async () => {
    signInModerator()
    const store = [{ ...REPORT }]
    rpcResults.is_moderator = true
    rpcResults.moderation_reports = ({ p_status }: Record<string, unknown>) => store.filter((r) => r.status === p_status)
    rpcResults.moderation_blocked_handles = []
    rpcResults.set_report_status = ({ p_report_id, p_status }: Record<string, unknown>) => {
      const row = store.find((r) => r.id === p_report_id)
      if (row) row.status = String(p_status)
      return null
    }
    visit('/admin/reports')

    fireEvent.click(await screen.findByRole('button', { name: 'Start review' }))

    expect(await screen.findByText('No open reports.')).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('set_report_status', { p_report_id: 'report-1', p_status: 'reviewing' })

    fireEvent.click(screen.getByRole('tab', { name: 'Reviewing' }))
    expect(await screen.findByRole('button', { name: 'Mark actioned' })).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('moderation_reports', { p_status: 'reviewing' })
  })
})
