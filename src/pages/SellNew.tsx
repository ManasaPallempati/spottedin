import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { listingPath } from '../lib/listingUrls'
import { CONDITIONS } from '../data/sellers'
import './sellnew.css'

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
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthed) {
      navigate('/login?next=%2Fsell%2Fnew', { replace: true })
    }
  }, [authLoading, isAuthed, navigate])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (authLoading || !isAuthed) {
    return <div className="sellnew-page" />
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid) {
      setImagePath(null)
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))

    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${uid}/${listingId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, file, { upsert: true })
    setUploading(false)

    if (uploadError) {
      console.warn(uploadError)
      setImagePath(null)
      return
    }
    setImagePath(path)
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
      image_path: imagePath,
    })

    setSubmitting(false)

    if (insertError) {
      console.warn(insertError)
      setError(insertError.message)
      return
    }

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
        <label className="sellnew-photo-label" htmlFor="sellnew-photo">
          {previewUrl ? (
            <img className="sellnew-photo-preview" src={previewUrl} alt="Selected item" />
          ) : (
            <span className="sellnew-photo-placeholder">Add a photo</span>
          )}
        </label>
        <input
          id="sellnew-photo"
          type="file"
          accept="image/*"
          className="sellnew-photo-input"
          onChange={handlePhotoChange}
        />
        {uploading && <p className="sellnew-hint">Uploading photo…</p>}

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
