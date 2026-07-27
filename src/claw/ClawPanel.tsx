import { useEffect, useState } from 'react';

// Injects the RBOT embed widget (self-contained IIFE, brings its own Shadow-DOM UI)
// once the visibility gate passes. No iframe, no local styling — the embed owns it.
const RBOT_EMBED_URL = 'https://tonystool.taild5f39d.ts.net/tardbot/embed.js';
const CLAW_KEY = 'maanster-claw-9481';
const STORAGE_KEY = 'maanster.claw';
const EMBED_SCRIPT_ID = 'rbot-embed-script';

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

  useEffect(() => {
    if (!unlocked) return;
    if (document.getElementById(EMBED_SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = EMBED_SCRIPT_ID;
    script.src = RBOT_EMBED_URL;
    script.defer = true;
    document.body.appendChild(script);
  }, [unlocked]);

  return null;
}
