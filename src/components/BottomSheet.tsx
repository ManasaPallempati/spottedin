import type { ReactNode } from 'react'
import './BottomSheet.css'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />
        {title && <h3 className="bottom-sheet-title">{title}</h3>}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </div>
  )
}
