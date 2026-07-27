import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function TopBar({ title, onBack, right }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="top-bar">
      <button
        type="button"
        className="top-bar__back"
        aria-label="Back"
        onClick={() => (onBack ? onBack() : navigate(-1))}
      >
        ‹
      </button>
      <h1 className="top-bar__title">{title}</h1>
      {right && <div className="top-bar__right">{right}</div>}
    </header>
  );
}
