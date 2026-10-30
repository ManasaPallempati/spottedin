import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { EMPTY_ADDRESS, formatAddress, useAddresses, validateAddress, type Address, type AddressDraft } from '../lib/addresses'
import FullScreenPanel from './FullScreenPanel'
import './checkout.css'

type AddressPickerProps = {
  selected: Address | null
  onSelect: (address: Address) => void
  // Called when the selected address is removed, so the parent can drop it.
  onClear?: () => void
  label?: string
  // Pick the most recent saved address automatically (checkout). Off where
  // choosing is a deliberate save, like a seller's pickup address.
  autoSelect?: boolean
  // Resolve a saved address id (e.g. a stored pickup address) to its row.
  selectedId?: string | null
}

const FIELDS: { key: keyof AddressDraft; label: string; inputMode?: 'numeric' | 'tel'; optional?: boolean }[] = [
  { key: 'name', label: 'Full name' },
  { key: 'phone', label: 'Mobile number', inputMode: 'tel' },
  { key: 'line1', label: 'House no., building, street' },
  { key: 'line2', label: 'Area, landmark', optional: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'PIN code', inputMode: 'numeric' },
]

// "Ships to" row for the checkout sheets. It shows the chosen address; tapping
// it opens a "Select address" screen (pick, edit, remove, add) like Depop's.
export default function AddressPicker({
  selected,
  onSelect,
  label = 'Ships to',
  autoSelect = true,
  selectedId = null,
  onClear,
}: AddressPickerProps) {
  const { addresses, loading, addAddress, removeAddress } = useAddresses()
  // The address list screen, and the id ticked on it (applied on Continue).
  const [listOpen, setListOpen] = useState(false)
  const [choice, setChoice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  // There is no update policy on spotted_addresses: an edit saves a new row
  // and removes the old one. Orders keep their own copy of the address.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Preselect the stored address, or the most recent one, once they load.
  useEffect(() => {
    if (selected || addresses.length === 0) return
    const stored = selectedId ? addresses.find((a) => a.id === selectedId) : undefined
    if (stored) onSelect(stored)
    else if (autoSelect) onSelect(addresses[0])
  }, [addresses, selected, selectedId, autoSelect, onSelect])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const problem = validateAddress(draft)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await addAddress(draft)
      if (editingId) await removeAddress(editingId)
      onSelect(saved)
      setChoice(saved.id)
      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this address.')
    } finally {
      setSaving(false)
    }
  }

  function closeForm() {
    setDraft(EMPTY_ADDRESS)
    setAdding(false)
    setEditingId(null)
    setError(null)
  }

  function startAdd() {
    setDraft(EMPTY_ADDRESS)
    setEditingId(null)
    setAdding(true)
    setError(null)
  }

  function startEdit(a: Address) {
    const { id, ...fields } = a
    setDraft(fields)
    setEditingId(id)
    setAdding(false)
    setError(null)
  }

  function openPicker() {
    if (loading) return
    setError(null)
    if (addresses.length === 0) {
      startAdd()
      return
    }
    setChoice(selected?.id ?? null)
    setListOpen(true)
  }

  function confirmChoice() {
    const picked = addresses.find((a) => a.id === choice)
    if (picked) onSelect(picked)
    setListOpen(false)
  }

  async function handleRemove(a: Address) {
    if (!window.confirm(`Remove ${a.name}, ${formatAddress(a)}?`)) return
    setError(null)
    try {
      await removeAddress(a.id)
      if (choice === a.id) setChoice(null)
      if (selected?.id === a.id) onClear?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this address.')
    }
  }

  const formOpen = adding || editingId !== null
  const listTitle = autoSelect ? 'Select address' : 'Pickup address'

  return (
    <div className="checkout-ships-to">
      <p className="checkout-section-heading">{label}</p>
      <button type="button" className="checkout-row-btn" aria-haspopup="dialog" onClick={openPicker}>
        <span className="checkout-row-text">
          {selected && <span className="checkout-row-label">{selected.name}</span>}
          <span className={'checkout-row-value' + (selected ? '' : ' checkout-row-value-strong')}>
            {loading
              ? 'Loading addresses…'
              : selected
                ? formatAddress(selected)
                : addresses.length > 0
                  ? 'Choose an address'
                  : 'Add new address'}
          </span>
        </span>
        <ChevronRight size={20} />
      </button>

      <FullScreenPanel
        open={listOpen}
        onClose={() => setListOpen(false)}
        title={listTitle}
        headerAction={
          <button type="button" className="icon-btn" aria-label="Add new address" onClick={startAdd}>
            <Plus size={22} />
          </button>
        }
        footer={
          <button type="button" className="btn btn-primary" disabled={!choice} onClick={confirmChoice}>
            Continue
          </button>
        }
      >
        <div className="checkout-address-list">
          {addresses.map((a) => (
            <div key={a.id} className="checkout-address-item">
              <label className="checkout-address-option">
                <span>
                  <span className="checkout-address-name">{a.name}</span>
                  <span className="checkout-address-line">{formatAddress(a)}</span>
                  <span className="checkout-address-line">{a.phone}</span>
                </span>
                <input type="radio" name={label} checked={choice === a.id} onChange={() => setChoice(a.id)} />
              </label>
              <div className="checkout-address-actions">
                <button type="button" onClick={() => startEdit(a)}>
                  Edit
                </button>
                <button type="button" onClick={() => void handleRemove(a)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          {addresses.length === 0 && <p className="checkout-row-value">No saved addresses yet. Tap + to add one.</p>}
          {error && !formOpen && (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </FullScreenPanel>

      <FullScreenPanel
        open={formOpen}
        onClose={closeForm}
        closeIcon={listOpen ? 'back' : 'close'}
        title={editingId ? 'Edit address' : 'Add address'}
        footer={
          <button type="submit" form={`address-form-${label}`} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </button>
        }
      >
        <form id={`address-form-${label}`} className="checkout-address-form" onSubmit={handleSave} noValidate>
          {FIELDS.map((f) => (
            <label key={f.key} className="checkout-field">
              <span>
                {f.label}
                {f.optional ? ' (optional)' : ''}
              </span>
              <input
                value={draft[f.key]}
                inputMode={f.inputMode}
                maxLength={f.key === 'pincode' ? 6 : f.key === 'phone' ? 10 : 120}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          {error && (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </FullScreenPanel>
    </div>
  )
}
