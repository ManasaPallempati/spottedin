import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, X } from 'lucide-react'
import './FullScreenPanel.css'

type FullScreenPanelProps = {
  open: boolean
  onClose: () => void
  title: string
  // 'close' shows an X (a screen opened from a row); 'back' shows an arrow (a step inside one).
  closeIcon?: 'close' | 'back'
  headerAction?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

// A full-height screen over the checkout sheet, like Depop's "Select address"
// and "Checkout summary". Rendered in a portal so it sits above the sheet.
export default function FullScreenPanel({
  open,
  onClose,
  title,
  closeIcon = 'close',
  headerAction,
  footer,
  children,
}: FullScreenPanelProps) {
  if (!open) return null

  return createPortal(
    <div className="fs-panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="fs-panel-header">
        <button type="button" className="icon-btn fs-panel-close" aria-label={closeIcon === 'back' ? 'Back' : 'Close'} onClick={onClose}>
          {closeIcon === 'back' ? <ChevronLeft size={22} /> : <X size={22} />}
        </button>
        <h2 className="fs-panel-title">{title}</h2>
        <div className="fs-panel-action">{headerAction}</div>
      </header>
      <div className="fs-panel-body">{children}</div>
      {footer && <div className="fs-panel-footer">{footer}</div>}
    </div>,
    document.body
  )
}
