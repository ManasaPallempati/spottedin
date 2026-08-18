import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { childrenOf, isLeaf, type Category } from '../lib/categories'
import './category-picker.css'

type Props = {
  open: boolean
  categories: Category[]
  onClose: () => void
  onSelect: (leafId: string) => void
}

// Drill-down rather than one long list: the tree is 221 types deep in places,
// and a flat list of that length is unusable on a phone. Each level replaces
// the last, with a back control, which is how the reference app does it and
// what people already expect from a category chooser.
export default function CategoryPicker({ open, categories, onClose, onSelect }: Props) {
  // Stack of the ancestors we have descended through. Empty means the
  // department level. Kept as a stack rather than a single id so Back can walk
  // up one level at a time instead of resetting to the top.
  const [stack, setStack] = useState<Category[]>([])

  // Escape dismisses the sheet like tapping the scrim — keyboard users
  // otherwise have no way out except tabbing to the close button. Sits above
  // the early return because hooks cannot be conditional.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setStack([])
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const current = stack[stack.length - 1] ?? null
  const options = childrenOf(categories, current?.id ?? null)

  function choose(category: Category) {
    if (isLeaf(categories, category.id)) {
      onSelect(category.id)
      setStack([])
      onClose()
      return
    }
    setStack((s) => [...s, category])
  }

  function close() {
    setStack([])
    onClose()
  }

  return (
    <div className="catpick-overlay" onClick={close}>
      <div
        className="catpick-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catpick-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="catpick-head">
          {stack.length > 0 ? (
            <button
              type="button"
              className="catpick-icon"
              aria-label="Back"
              onClick={() => setStack((s) => s.slice(0, -1))}
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span className="catpick-icon" />
          )}
          <h2 className="catpick-title" id="catpick-title">
            {current ? current.name : 'Category'}
          </h2>
          <button type="button" className="catpick-icon" aria-label="Close" onClick={close}>
            <X size={20} />
          </button>
        </header>

        <div className="catpick-list">
          {options.map((option) => {
            const leaf = isLeaf(categories, option.id)
            return (
              <button
                key={option.id}
                type="button"
                className="catpick-row"
                onClick={() => choose(option)}
              >
                <span>{option.name}</span>
                {!leaf && <ChevronRight size={18} />}
              </button>
            )
          })}
          {options.length === 0 && <p className="catpick-empty">Nothing here yet.</p>}
        </div>
      </div>
    </div>
  )
}
