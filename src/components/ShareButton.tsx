import { useEffect, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import './ShareButton.css'

type ShareButtonProps = {
  /** Title handed to the OS share sheet. */
  title: string
  /** Canonical URL to share — build it with canonicalUrl() from lib/seo. */
  url: string
  /** Accessible name for the icon-only button, e.g. "Share this listing". */
  label: string
  /** Extra class(es) for positioning within the host page. */
  className?: string
}

export default function ShareButton({ title, url, label, className }: ShareButtonProps) {
  const [toast, setToast] = useState('')
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
        await navigator.share({ title, url })
        return // The OS share sheet is its own feedback — no toast.
      } catch (err) {
        // User dismissed the sheet: not a failure, and a toast would be noise.
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Anything else (data unsupported, transient failure): fall through to copy.
      }
    }
    await copyLink()
  }

  return (
    <>
      <button
        type="button"
        className={'share-btn' + (className ? ` ${className}` : '')}
        aria-label={label}
        onClick={handleShare}
      >
        <Share2 size={20} aria-hidden="true" />
      </button>
      {/* Screen readers only announce changes inside a live region that already
          exists, so this stays mounted and only its text comes and goes. The
          visible styling is the shared .toast (styles/motion.css). */}
      <span aria-live="polite" className={'share-live' + (toast ? ' toast' : '')}>
        {toast}
      </span>
    </>
  )
}
