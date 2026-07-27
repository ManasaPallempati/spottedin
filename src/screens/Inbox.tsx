import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { getListing, getSeller, getThreads, subscribe } from '../data/store';
import type { Thread } from '../data/types';
import './Inbox.css';

function useThreads(): Thread[] {
  const [threads, setThreads] = useState<Thread[]>(() => getThreads());

  useEffect(() => subscribe(() => setThreads(getThreads())), []);

  return threads;
}

export default function Inbox() {
  const threads = useThreads();

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
