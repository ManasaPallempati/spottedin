import { useEffect, useState } from 'react';

// RBOT runs as a top-level page on its authenticated edge. Opening it in a new
// tab avoids browser local-network restrictions on cross-origin subresources.
const RBOT_APP_URL = 'https://tonystool.taild5f39d.ts.net/tardbot/';
const CLAW_KEY = 'maanster-claw-9481';
const STORAGE_KEY = 'maanster.claw';

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

  useEffect(() => {
    setUnlocked(isUnlocked());
  }, []);

  if (!unlocked) return null;

  return (
    <a
      href={RBOT_APP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Open RBOT in a new tab"
      style={{
        position: 'fixed',
        top: '50%',
        right: 0,
        zIndex: 2147483000,
        transform: 'translateY(-50%)',
        padding: '16px 10px',
        borderRadius: '12px 0 0 12px',
        background: '#7C3AED',
        color: '#fff',
        boxShadow: '-2px 2px 8px rgba(0,0,0,0.25)',
        font: '600 14px/1.4 system-ui, -apple-system, Segoe UI, sans-serif',
        letterSpacing: '0.5px',
        textDecoration: 'none',
        writingMode: 'vertical-rl',
      }}
    >
      🤖 RBOT
    </a>
  );
}
