import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../auth/AuthProvider';
import { loadMarketplaceThreads } from '../data/messages';
import { isSupabaseConfigured } from '../data/supabase';
import { getListing, getSeller, getThreads, subscribe } from '../data/store';
import type { Thread } from '../data/types';
import './Inbox.css';

function useThreads(): {
  threads: Thread[];
  loading: boolean;
  error: string;
} {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured) {
      const sync = () => {
        setThreads(getThreads());
        setLoading(false);
      };
      sync();
      return subscribe(sync);
    }

    let active = true;
    const refresh = () => {
      setError('');
      void loadMarketplaceThreads(user.id)
        .then((next) => {
          if (active) setThreads(next);
        })
        .catch((err: unknown) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load conversations');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
    };
  }, [user]);

  return { threads, loading, error };
}

export default function Inbox() {
  const { threads, loading, error } = useThreads();

  if (loading) {
    return <EmptyState emoji="⏳" title="Loading messages…" />;
  }
  if (error) {
    return <EmptyState emoji="⚠️" title="Could not load messages" subtitle={error} />;
  }
  if (threads.length === 0) {
    return <EmptyState emoji="💬" title="No messages yet" subtitle="Message a seller from a listing to start a chat." />;
  }

  return (
    <div>
      <div className="top-bar">
        <h1 className="top-bar__title">Inbox</h1>
      </div>
      <ul className="inbox-list">
        {threads.map((thread) => {
          const listing = getListing(thread.listingId);
          const seller = getSeller(thread.peerId);
          const last = thread.messages[thread.messages.length - 1];

          return (
            <li key={thread.id}>
              <Link to={`/chat/${thread.id}`} className="inbox-row">
                <div
                  className="inbox-row__thumb"
                  style={
                    listing && !listing.photoDataUrl
                      ? { background: `linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})` }
                      : undefined
                  }
                >
                  {listing?.photoDataUrl ? (
                    <img src={listing.photoDataUrl} alt="" />
                  ) : (
                    <span aria-hidden="true">{listing?.emoji ?? '🛍️'}</span>
                  )}
                </div>
                <div className="inbox-row__body">
                  <div className="inbox-row__top">
                    <span className="inbox-row__name">{seller?.name ?? 'Seller'}</span>
                    {last && <span className="inbox-row__time">{last.timeAgo}</span>}
                  </div>
                  {listing && <span className="inbox-row__listing">{listing.title}</span>}
                  <span className={`inbox-row__last${last?.from === 'peer' ? ' inbox-row__last--peer' : ''}`}>
                    {last ? (last.from === 'me' ? 'You: ' : '') + last.text : 'Say hi 👋'}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
