import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { listingPath } from '../lib/listingUrls'
import { CONDITIONS } from '../data/sellers'
import './sellnew.css'

const MAX_PHOTOS = 8
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const CATEGORIES = ['Menswear', 'Womenswear', 'Kids', 'Everything else']

// Maps this form's Spotted-facing labels to the listings table's DB-level
// category/condition columns (narrower vocabularies fixed by CHECK constraints).
const CATEGORY_DB: Record<string, string> = {
  Menswear: 'men',
  Womenswear: 'women',
  Kids: 'kids',
  'Everything else': 'everything-else',
}
const CONDITION_DB: Record<string, string> = {
  'Brand new': 'new',
  'Like new': 'like-new',
  'Used – excellent': 'good',
  'Used – good': 'fair',
}

export default function SellNew() {
  const navigate = useNavigate()
  const { isAuthed, loading: authLoading, session } = useAuth()
  const uid = session?.user.id

  const [listingId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [size, setSize] = useState(SIZES[0])
  const [category, setCategory] = useState(CATEGORIES[0])
  const [condition, setCondition] = useState<string>(CONDITIONS[0])
  const [description, setDescription] = useState('')
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
      category: CATEGORY_DB[category] ?? 'vintage',
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
            <select id="sellnew-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
    </div>
  )
}
