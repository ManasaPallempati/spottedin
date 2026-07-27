import { useEffect, useRef, useState } from 'react';
import './claw.css';

// Local-only OpenClaw gateway — reachable only on Tony's machine.
const OPENCLAW_URL = 'http://127.0.0.1:18789';
const CLAW_KEY = 'maanster-claw-9481';
const STORAGE_KEY = 'maanster.claw';
const IFRAME_TIMEOUT_MS = 4000;

function isUnlocked(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (window.localStorage.getItem(STORAGE_KEY) === CLAW_KEY) return true;
  } catch {
    // localStorage unavailable — fall through to URL check.
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('claw') === CLAW_KEY) {
    try {
      window.localStorage.setItem(STORAGE_KEY, CLAW_KEY);
    } catch {
      // best-effort persistence only
    }
    params.delete('claw');
    const cleaned = params.toString();
    const url = `${window.location.pathname}${cleaned ? `?${cleaned}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
    return true;
  }

  return false;
}

export default function ClawPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setUnlocked(isUnlocked());
  }, []);

  useEffect(() => {
    if (!open) return;

    setIframeFailed(false);
    setIframeLoaded(false);

    timeoutRef.current = window.setTimeout(() => {
      setIframeFailed((failed) => failed || !iframeLoaded);
    }, IFRAME_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (iframeLoaded && timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [iframeLoaded]);

  if (!unlocked) return null;

  return (
    <>
      <button
        type="button"
        className="claw-tab"
        onClick={() => setOpen(true)}
        aria-label="Open OpenClaw panel"
      >
        🔧 TardBot
      </button>

      {open && (
        <div className="claw-overlay" onClick={() => setOpen(false)}>
          <div className="claw-panel" onClick={(e) => e.stopPropagation()}>
            <div className="claw-panel__header">
              <span className="claw-panel__title">
                OpenClaw — full instance · delegates to Claude &amp; Codex
              </span>
              <div className="claw-panel__actions">
                <a
                  className="claw-panel__icon-btn"
                  href={OPENCLAW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in new tab"
                  title="Open in new tab"
                >
                  ↗
                </a>
                <button
                  type="button"
                  className="claw-panel__icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Close panel"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="claw-panel__body">
              {!iframeFailed && (
                <iframe
                  src={OPENCLAW_URL}
                  title="OpenClaw"
                  className="claw-panel__iframe"
                  onLoad={() => setIframeLoaded(true)}
                  onError={() => setIframeFailed(true)}
                />
              )}

              {iframeFailed && (
                <div className="claw-fallback">
                  <div className="claw-fallback__emoji">🔧</div>
                  <div className="claw-fallback__title">Can't reach OpenClaw</div>
                  <div className="claw-fallback__note">
                    Gateway is local-only: reachable on Tony's machine.
                  </div>
                  <a
                    className="btn btn-primary"
                    href={OPENCLAW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
