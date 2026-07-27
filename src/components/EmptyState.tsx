interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ emoji = '🗒️', title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__emoji" aria-hidden="true">{emoji}</div>
      <p className="empty-state__title">{title}</p>
      {subtitle && <p className="empty-state__subtitle">{subtitle}</p>}
    </div>
  );
}
