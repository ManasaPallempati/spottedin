import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import CategoryPicker from '../components/CategoryPicker'
import { useCategories, categoryPath, legacyCategoryFor } from '../lib/categories'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { listingPath } from '../lib/listingUrls'
import { CONDITIONS } from '../data/sellers'
import './sellnew.css'

const MAX_PHOTOS = 8
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
// Categories now come from the database (round 14) via the picker, so the old
// four-value list is gone. The legacy listings.category column is still written,
// derived from the chosen department by legacyCategoryFor.
//
// Condition remains a fixed vocabulary fixed by a CHECK constraint.
const CONDITION_DB: Record<string, string> = {
  'Brand new': 'new',
  'Like new': 'like-new',
  'Used – excellent': 'good',
  'Used – good': 'fair',
}

// Text/select values only — photos are storage uploads and object URLs, far too
// big (and too stateful) for localStorage, so they are deliberately not drafted.
const DRAFT_KEY = 'spotted_sell_draft'

type SellDraft = {
  title?: string
  price?: string
  size?: string
  categoryId?: string | null
  condition?: string
  description?: string
}

function readDraft(): SellDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as SellDraft
  } catch {
    // Corrupt JSON or storage unavailable — treat as no draft.
    return null
  }
}

export default function SellNew() {
  const navigate = useNavigate()
  const { isAuthed, loading: authLoading, session } = useAuth()
  const uid = session?.user.id

  const { categories, loading: categoriesLoading } = useCategories()
  const [listingId] = useState(() => crypto.randomUUID())
  // Read once on mount; field states are seeded from it below.
  const [draft] = useState(readDraft)
  // Recomputed from the tree rather than stored alongside the id, so the label
  // cannot go stale if a category is renamed.
  const [title, setTitle] = useState(typeof draft?.title === 'string' ? draft.title : '')
  const [price, setPrice] = useState(typeof draft?.price === 'string' ? draft.price : '')
  const [size, setSize] = useState(
    draft?.size && SIZES.includes(draft.size) ? draft.size : SIZES[0],
  )
  const [categoryId, setCategoryId] = useState<string | null>(
    typeof draft?.categoryId === 'string' ? draft.categoryId : null,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const selectedPath = categoryPath(categories, categoryId)
  const [condition, setCondition] = useState<string>(
    draft?.condition && (CONDITIONS as readonly string[]).includes(draft.condition)
      ? draft.condition
      : CONDITIONS[0],
  )
  const [description, setDescription] = useState(
    typeof draft?.description === 'string' ? draft.description : '',
  )
  // One bar carries both the "Draft restored" announcement and the discard
  // action; dismissing it keeps the draft, discarding deletes it.
  const [draftNoticeOpen, setDraftNoticeOpen] = useState(draft !== null)
  // One entry per photo, in display order. `path` is the storage key that goes
  // into listing_images; `preview` is a local object URL shown until the listing
  // exists. Position in this array is the position in the gallery, so removing
  // one renumbers the rest rather than leaving a gap the unique index rejects.
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthed) {
      navigate('/login?next=%2Fsell%2Fnew', { replace: true })
    }
  }, [authLoading, isAuthed, navigate])

  // Revoked on unmount only. A dependency on `photos` would revoke the previous
  // array's URLs on every add, breaking the thumbnails still on screen.
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.preview)
    }
  }, [])

  // Debounced autosave. The hasContent guard keeps an untouched form from
  // writing a default-valued draft (which would show "Draft restored" on the
  // next visit for nothing), and removes the draft again if the seller clears
  // every field by hand. A pending timer is dropped on unmount, so a save can
  // never land after publish has cleared the draft.
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent = title !== '' || price !== '' || description !== '' || categoryId !== null
      try {
        if (hasContent) {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ title, price, size, categoryId, condition, description }),
          )
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      } catch {
        // Storage full or unavailable — autosave is best-effort.
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [title, price, size, categoryId, condition, description])

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
    setTitle('')
    setPrice('')
    setSize(SIZES[0])
    setCategoryId(null)
    setCondition(CONDITIONS[0])
    setDescription('')
    setDraftNoticeOpen(false)
  }

  if (authLoading || !isAuthed) {
    return <div className="sellnew-page" />
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Clearing the input lets the same file be picked again after removing it;
    // without this the change event never fires a second time.
    e.target.value = ''
    if (files.length === 0 || !uid) return

    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`)
      return
    }
    const accepted = files.slice(0, room)
    if (files.length > room) {
      setError(`Only the first ${room} of those were added — the limit is ${MAX_PHOTOS} photos.`)
    } else {
      setError(null)
    }

    setUploading(true)
    for (const file of accepted) {
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`"${file.name}" is over 8MB and was skipped.`)
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      // The storage policy and the listing_images owner-path trigger both
      // require the seller's own uuid folder. crypto.randomUUID keeps repeat
      // uploads of the same filename from overwriting each other.
      const path = `${uid}/${listingId}-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { upsert: true })
      if (uploadError) {
        console.warn(uploadError)
        setError('One of those photos could not be uploaded.')
        continue
      }
      setPhotos((current) => [...current, { path, preview: URL.createObjectURL(file) }])
    }
    setUploading(false)
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const next = [...current]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isAuthed || !uid) {
      navigate('/login?next=%2Fsell%2Fnew')
      return
    }

    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!categoryId) {
      setError('Please choose a category.')
      return
    }
    const priceNum = Number.parseInt(price, 10)
    if (!Number.isFinite(priceNum) || priceNum <= 0 || String(priceNum) !== price.trim()) {
      setError('Enter a valid price.')
      return
    }

    setError(null)
    setSubmitting(true)

    // status/likes are intentionally omitted: the authenticated role only has
    // INSERT grant on the columns below (not status/likes), and both columns
    // default correctly (status='live', likes=0) so this still works.
    const { error: insertError } = await supabase.from('listings').insert({
      id: listingId,
      seller_id: uid,
      title: title.trim(),
      description: description.trim(),
      price_inr: priceNum,
      // Both columns are written: category_id is the real one, and the legacy
      // category column is NOT NULL and still read by the feed and filters, so
      // it is derived from the chosen department rather than left to drift.
      category: legacyCategoryFor(categories, categoryId),
      category_id: categoryId,
      size,
      condition: CONDITION_DB[condition] ?? 'good',
      // Position 0 is written here as well as into listing_images so the row is
      // never briefly without a thumbnail; the sync trigger keeps it correct
      // from then on.
      image_path: photos[0]?.path ?? null,
    })

    if (insertError) {
      setSubmitting(false)
      console.warn(insertError)
      setError(insertError.message)
      return
    }

    // After the listing, because listing_images references it. A failure here
    // leaves a listing with fewer photos rather than no listing, which is the
    // better of the two — the seller can add the rest by editing.
    if (photos.length > 0) {
      const { error: imagesError } = await supabase.from('listing_images').insert(
        photos.map((photo, index) => ({
          listing_id: listingId,
          path: photo.path,
          position: index,
        })),
      )
      if (imagesError) {
        console.warn(imagesError)
        setError('Your listing was created, but some photos could not be attached.')
      }
    }

    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
    setSubmitting(false)
    navigate(listingPath(listingId, title))
  }

  return (
    <div className="sellnew-page">
      <div className="sellnew-topbar">
        <h1 className="sellnew-title">List an item</h1>
        <button className="sellnew-close" aria-label="Close" onClick={() => navigate('/sell')}>
          <X size={22} />
        </button>
      </div>

      <form className="sellnew-form" onSubmit={handleSubmit}>
        {draftNoticeOpen && (
          <div className="sellnew-draft-notice" aria-live="polite">
            <span className="sellnew-draft-text">Draft restored</span>
            <button type="button" className="sellnew-draft-discard" onClick={discardDraft}>
              Discard draft
            </button>
            <button
              type="button"
              className="sellnew-draft-dismiss"
              aria-label="Dismiss"
              onClick={() => setDraftNoticeOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="sellnew-photos-head">
          <span className="sellnew-photos-title">Add photos</span>
          <span className="sellnew-hint">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </div>

        <div className="sellnew-photo-grid">
          {photos.map((photo, index) => (
            <div key={photo.path} className="sellnew-photo-tile">
              <img className="sellnew-photo-preview" src={photo.preview} alt="" />
              {index === 0 && <span className="sellnew-photo-badge">Cover</span>}
              <button
                type="button"
                className="sellnew-photo-remove"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => removePhoto(index)}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label className="sellnew-photo-add" htmlFor="sellnew-photo">
              <span aria-hidden="true">+</span>
              <span className="sellnew-photo-add-text">Add</span>
            </label>
          )}
        </div>

        <input
          id="sellnew-photo"
          type="file"
          accept="image/*"
          multiple
          className="sellnew-photo-input"
          onChange={handlePhotoChange}
        />
        <p className="sellnew-hint">
          The first photo is the cover buyers see. Show the label, the fabric and any flaws.
        </p>
        {uploading && <p className="sellnew-hint">Uploading…</p>}

        <div className="sellnew-field">
          <label htmlFor="sellnew-title">Title</label>
          <input
            id="sellnew-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Levi's denim jacket"
            required
          />
        </div>

        <div className="sellnew-field">
          <label htmlFor="sellnew-price">Price</label>
          <div className="sellnew-price-wrap">
            <span className="sellnew-price-prefix">₹</span>
            <input
              id="sellnew-price"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
            />
          </div>
        </div>

        <div className="sellnew-row">
          <div className="sellnew-field">
            <label htmlFor="sellnew-size">Size</label>
            <select id="sellnew-size" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="sellnew-field">
            <label htmlFor="sellnew-category">Category</label>
            <button
              type="button"
              id="sellnew-category"
              className="sellnew-picker-button"
              onClick={() => setPickerOpen(true)}
              disabled={categoriesLoading}
            >
              {selectedPath.length > 0 ? (
                <span className="sellnew-picker-value">
                  {selectedPath.map((c) => c.name).join(' › ')}
                </span>
              ) : (
                <span className="sellnew-picker-placeholder">
                  {categoriesLoading ? 'Loading…' : 'Choose a category'}
                </span>
              )}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="sellnew-field">
          <label htmlFor="sellnew-condition">Condition</label>
          <select id="sellnew-condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sellnew-field">
          <label htmlFor="sellnew-description">Description (optional)</label>
          <textarea
            id="sellnew-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell buyers about fit, condition, flaws…"
            rows={4}
          />
        </div>

        {error && <p className="sellnew-error">{error}</p>}

        <button type="submit" className="btn btn-primary sellnew-submit" disabled={submitting || uploading}>
          {submitting ? 'Listing…' : 'List item'}
        </button>
      </form>

      <CategoryPicker
        open={pickerOpen}
        categories={categories}
        onClose={() => setPickerOpen(false)}
        onSelect={(leafId) => {
          setCategoryId(leafId)
          setError(null)
        }}
      />
    </div>
  )
}
