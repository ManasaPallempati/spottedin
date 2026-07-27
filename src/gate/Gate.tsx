import { FormEvent, ReactNode, useEffect, useState } from 'react';
import './gate.css';

// Private-preview gate. Only the SHA-256 of the passphrase ships in the bundle;
// the plaintext must never appear in this repo.
const HASH = 'c089d2675c3c38d361f19f064adbaacf98702b8ce744b790b1f583240a01f28f';
const KEY = 'maanster.gate';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Gate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) === HASH);
    setChecked(true);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if ((await sha256(pw)) === HASH) {
      localStorage.setItem(KEY, HASH);
      setOpen(true);
    } else {
      setErr('Not it — try again.');
    }
  }

  if (!checked) return null;
  if (open) return <>{children}</>;

  return (
    <div className="gate-wrap">
      <div className="gate-card">
        <div className="gate-logo">🛍️</div>
        <h1>Maanster Market</h1>
        <div className="gate-tag">Pre-loved. Re-loved.</div>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Enter password"
            value={pw}
            autoFocus
            onChange={(e) => { setPw(e.target.value); setErr(''); }}
          />
          <button type="submit">Unlock</button>
          <div className="gate-err">{err}</div>
        </form>
      </div>
    </div>
  );
}
