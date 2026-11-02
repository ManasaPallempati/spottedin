// Round 18: private profile columns (date of birth, guardian email, legal name)
// are not selectable from profiles by anyone. The app reads its own row through
// my_profile() and never asks a write to return the row.
import { describe, expect, it } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import App from '../App'
import { db, inserts, makeSession, selects, setRpcMissing, setSession, supabase } from './fakeSupabase'

const PRIVATE_COLUMNS = ['date_of_birth', 'guardian_email', 'guardian_consent_at', 'first_name', 'last_name', 'deletion_reason']

function visit(path: string) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

function directPrivateReads() {
  return selects.filter(
    (s) => s.table === 'profiles' && PRIVATE_COLUMNS.some((column) => s.columns.split(',').includes(column)),
  )
}

describe('own profile', () => {
  it('is read through my_profile(), never by selecting private columns from profiles', async () => {
    setSession(makeSession('asha@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    visit('/home')

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('my_profile'))
    expect(window.location.pathname).toBe('/home')
    expect(directPrivateReads()).toEqual([])
  })

  it('is created on first sign-in without asking the insert to return private columns', async () => {
    setSession(makeSession('new@example.com', 'user-2'))
    db.profiles = []
    visit('/home')

    // The row exists and was read back: with no date of birth, the birthday
    // gate (which needs a loaded profile) takes over.
    await waitFor(() => expect(window.location.pathname).toBe('/onboarding/birthday'))
    expect(inserts.filter((i) => i.table === 'profiles')).toHaveLength(1)
    expect(directPrivateReads()).toEqual([])
  })

  it('still loads on a project where my_profile() is not deployed yet', async () => {
    setRpcMissing('my_profile')
    setSession(makeSession('asha@example.com', 'user-1'))
    db.profiles = [{ id: 'user-1', handle: 'asha', name: 'Asha', date_of_birth: '1995-04-12' }]
    visit('/home')

    await waitFor(() => expect(directPrivateReads().length).toBeGreaterThan(0))
    expect(window.location.pathname).toBe('/home')
  })
})
