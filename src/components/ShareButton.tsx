import { useEffect, useRef, useState } from 'react'
import { Copy, MessageCircle, Share2 } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { buildWhatsAppUrl } from '../lib/whatsappShare'
import './ShareButton.css'

type ShareButtonProps = {
  /** Title handed to the OS share sheet. */
  title: string
  /** Canonical URL to share — build it with canonicalUrl() from lib/seo. */
  url: string
  /** Accessible name for the icon-only button, e.g. "Share this listing". */
  label: string
  /** Message shown above the link in WhatsApp / the share sheet. When set, tapping
   *  opens a small sheet (WhatsApp, share sheet, copy link) instead of sharing
   *  straight away. */
  text?: string
  /** Extra class(es) for positioning within the host page. */
  className?: string
}

export default function ShareButton({ title, url, label, text, className }: ShareButtonProps) {
  const [toast, setToast] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current)
    }
  }, [])

  function showToast(message: string) {
    setToast(message)
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(''), 1800)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied')
    } catch {
      // Clipboard access denied or unavailable (e.g. insecure context).
      showToast("Couldn't copy the link")
    }
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(text ? { title, text, url } : { title, url })
        return // The OS share sheet is its own feedback — no toast.
      } catch (err) {
        // User dismissed the sheet: not a failure, and a toast would be noise.
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Anything else (data unsupported, transient failure): fall through to copy.
      }
    }
    await copyLink()
  }

  async function sheetShare() {
    setSheetOpen(false)
    await handleShare()
  }

  async function sheetCopy() {
    setSheetOpen(false)
    await copyLink()
  }

  return (
    <>
      <button
        type="button"
        className={'share-btn' + (className ? ` ${className}` : '')}
        aria-label={label}
        onClick={text ? () => setSheetOpen(true) : handleShare}
      >
        <Share2 size={20} aria-hidden="true" />
      </button>
      {text && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Share">
          <div className="share-options">
            <a
              className="btn btn-outline share-option"
              href={buildWhatsAppUrl(text, url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSheetOpen(false)}
            >
              <MessageCircle size={18} aria-hidden="true" />
              Share on WhatsApp
            </a>
            {typeof navigator.share === 'function' && (
              <button type="button" className="btn btn-outline share-option" onClick={sheetShare}>
                <Share2 size={18} aria-hidden="true" />
                More apps…
              </button>
            )}
            <button type="button" className="btn btn-outline share-option" onClick={sheetCopy}>
              <Copy size={18} aria-hidden="true" />
              Copy link
            </button>
          </div>
        </BottomSheet>
      )}
      {/* Screen readers only announce changes inside a live region that already
          exists, so this stays mounted and only its text comes and goes. The
          visible styling is the shared .toast (styles/motion.css). */}
      <span aria-live="polite" className={'share-live' + (toast ? ' toast' : '')}>
        {toast}
      </span>
    </>
  )
}
