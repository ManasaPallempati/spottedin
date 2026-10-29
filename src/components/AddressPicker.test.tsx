import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import type { Address } from '../lib/addresses'

const HOME: Address = { id: 'a1', name: 'Asha Rao', phone: '9876543210', line1: '12 Lake Rd', line2: '', city: 'Pune', state: 'MH', pincode: '411001' }
const WORK: Address = { id: 'a2', name: 'Asha Rao', phone: '9876543210', line1: '4 MG Rd', line2: '', city: 'Pune', state: 'MH', pincode: '411002' }

const store = { addresses: [] as Address[] }
const addAddress = vi.fn(async (d: Omit<Address, 'id'>) => {
  const saved = { ...d, id: `new-${store.addresses.length}` }
  store.addresses = [saved, ...store.addresses]
  return saved
})
const removeAddress = vi.fn(async (id: string) => {
  store.addresses = store.addresses.filter((a) => a.id !== id)
})

vi.mock('../lib/addresses', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/addresses')>()
  return { ...actual, useAddresses: () => ({ addresses: store.addresses, loading: false, addAddress, removeAddress }) }
})

const { default: AddressPicker } = await import('./AddressPicker')

function Harness() {
  const [selected, setSelected] = useState<Address | null>(null)
  return (
    <>
      <AddressPicker selected={selected} onSelect={setSelected} onClear={() => setSelected(null)} />
      <p data-testid="selected">{selected?.id ?? 'none'}</p>
    </>
  )
}

describe('AddressPicker', () => {
  beforeEach(() => {
    store.addresses = [HOME, WORK]
    addAddress.mockClear()
    removeAddress.mockClear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('removes the selected address and falls back to the next saved one', async () => {
    render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('a1'))
    fireEvent.click(screen.getByRole('button', { name: /Ships to/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    await waitFor(() => expect(removeAddress).toHaveBeenCalledWith('a1'))
    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('a2'))
  })

  it('edits an address by saving the new one and removing the old one', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Ships to/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    const street = screen.getByLabelText('House no., building, street') as HTMLInputElement
    expect(street.value).toBe('4 MG Rd')
    fireEvent.change(street, { target: { value: '9 MG Rd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }))
    await waitFor(() => expect(removeAddress).toHaveBeenCalledWith('a2'))
    expect(addAddress).toHaveBeenCalledWith(expect.objectContaining({ line1: '9 MG Rd', pincode: '411002' }))
    expect(screen.getByTestId('selected').textContent).toMatch(/^new-/)
  })
})
