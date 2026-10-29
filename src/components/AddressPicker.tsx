import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { EMPTY_ADDRESS, formatAddress, useAddresses, validateAddress, type Address, type AddressDraft } from '../lib/addresses'
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

// "Ships to" row for the checkout sheets. Collapsed it shows the chosen
// address; expanded it lists saved addresses and an inline form to add one.
export default function AddressPicker({
  selected,
  onSelect,
  label = 'Ships to',
  autoSelect = true,
  selectedId = null,
  onClear,
}: AddressPickerProps) {
  const { addresses, loading, addAddress, removeAddress } = useAddresses()
  const [expanded, setExpanded] = useState(false)
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
      closeForm()
      setExpanded(false)
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

  function startEdit(a: Address) {
    const { id, ...fields } = a
    setDraft(fields)
    setEditingId(id)
    setAdding(false)
    setError(null)
  }

  async function handleRemove(a: Address) {
    if (!window.confirm(`Remove ${a.name}, ${formatAddress(a)}?`)) return
    setError(null)
    try {
      await removeAddress(a.id)
      if (editingId === a.id) closeForm()
      if (selected?.id === a.id) onClear?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this address.')
    }
  }

  const showForm = adding || editingId !== null || (!loading && addresses.length === 0 && expanded)

  return (
    <div className="checkout-ships-to">
      <button
        type="button"
        className="checkout-row-btn"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="checkout-row-text">
          <span className="checkout-row-label">{label}</span>
          <span className={'checkout-row-value' + (selected ? '' : ' checkout-row-value-strong')}>
            {loading
              ? 'Loading addresses…'
              : selected
                ? `${selected.name}, ${formatAddress(selected)}`
                : addresses.length > 0
                  ? 'Choose an address'
                  : 'Add new address'}
          </span>
        </span>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div className="checkout-address-panel">
          {addresses.map((a) => (
            <div key={a.id} className="checkout-address-item">
              <label className="checkout-address-option">
                <input
                  type="radio"
                  name={label}
                  checked={selected?.id === a.id}
                  onChange={() => {
                    onSelect(a)
                    setExpanded(false)
                  }}
                />
                <span>
                  <span className="checkout-address-name">{a.name}</span>
                  <span className="checkout-address-line">{formatAddress(a)}</span>
                  <span className="checkout-address-line">{a.phone}</span>
                </span>
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

          {error && !showForm && (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          )}

          {showForm ? (
            <form className="checkout-address-form" onSubmit={handleSave} noValidate>
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
              <div className="checkout-address-form-actions">
                {addresses.length > 0 && (
                  <button type="button" className="btn btn-outline" onClick={closeForm}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save address'}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="checkout-add-address" onClick={() => setAdding(true)}>
              <Plus size={18} />
              Add new address
            </button>
          )}
        </div>
      )}
    </div>
  )
}
