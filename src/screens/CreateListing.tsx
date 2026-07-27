import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { createListing, getUser, subscribe } from '../data/store';
import type { Category, Condition } from '../data/types';
import './CreateListing.css';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'home', label: 'Home' },
  { value: 'vintage', label: 'Vintage' },
];

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

// Fallback "drop card" visual when no photo is uploaded — matches the seeded
// gradient + emoji aesthetic so freshly created listings still feel native.
const GRADIENTS: [string, string][] = [
  ['#7C3AED', '#EC4899'],
  ['#D6336C', '#F7C948'],
  ['#0F766E', '#FACC15'],
  ['#1D4ED8', '#F97316'],
  ['#B91C1C', '#111827'],
  ['#16A34A', '#F0FDF4'],
];

const EMOJIS = ['🛍️', '👕', '👗', '👟', '📷', '🎮', '🧣', '🪔', '⌨️', '🧥'];

export default function CreateListing() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('women');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState<Condition>('good');
  const [price, setPrice] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [gradient, setGradient] = useState<[string, string]>(GRADIENTS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => subscribe(() => setUser(getUser())), []);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const priceNum = Number(price);
    if (!title.trim()) {
      setError('Give your item a title');
      return;
    }
    if (!priceNum || priceNum <= 0) {
      setError('Enter a valid price');
      return;
    }
    setError('');

    try {
      const listing = createListing({
        title: title.trim(),
        description: description.trim(),
        priceINR: priceNum,
        category,
        size: size.trim() || undefined,
        condition,
        gradient,
        emoji,
        photoDataUrl,
      });

      setShowToast(true);
      window.setTimeout(() => {
        navigate(`/listing/${listing.id}`);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list this item');
    }
  }

  if (!user) return null;

  return (
    <div className="create-listing">
      <TopBar title="Sell an item" />

      <form className="create-listing__form" onSubmit={handleSubmit}>
        <div>
          <span className="field-label">Photo</span>
          <label className="create-listing__photo-picker">
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Listing preview" className="create-listing__photo-preview" />
            ) : (
              <div
                className="create-listing__photo-fallback"
                style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
              >
                <span aria-hidden="true">{emoji}</span>
              </div>
            )}
            <span className="create-listing__photo-cta">
              {photoDataUrl ? 'Change photo' : 'Add a photo'}
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </label>

          {!photoDataUrl && (
            <div className="create-listing__picker-rows">
              <div className="create-listing__gradient-row">
                {GRADIENTS.map((g, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`create-listing__swatch${g === gradient ? ' is-selected' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                    aria-label={`Gradient ${i + 1}`}
                    onClick={() => setGradient(g)}
                  />
                ))}
              </div>
              <div className="create-listing__emoji-row">
                {EMOJIS.map((em) => (
                  <button
                    type="button"
                    key={em}
                    className={`create-listing__emoji-btn${em === emoji ? ' is-selected' : ''}`}
                    onClick={() => setEmoji(em)}
                    aria-label={`Use emoji ${em}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="title">Title</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Banarasi Silk Saree"
            maxLength={80}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition details, sizing, why you're selling…"
            maxLength={500}
          />
        </div>

        <div className="create-listing__row">
          <div>
            <label className="field-label" htmlFor="category">Category</label>
            <select
              id="category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="size">Size (optional)</label>
            <input
              id="size"
              className="input"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="M, UK9, Free…"
              maxLength={12}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="condition">Condition</label>
          <select
            id="condition"
            className="select"
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="price">Price</label>
          <div className="create-listing__price-row">
            <span className="create-listing__rupee">₹</span>
            <input
              id="price"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="999"
            />
          </div>
        </div>

        {error && <p className="create-listing__error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block">List item</button>
      </form>

      {showToast && (
        <div className="create-listing__toast" role="status">
          ✅ Listed! Taking you to your item…
        </div>
      )}
    </div>
  );
}
