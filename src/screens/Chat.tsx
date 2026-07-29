import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import TopBar from '../components/TopBar';
import { useAuth } from '../auth/AuthProvider';
import {
  loadMarketplaceThread,
  sendMarketplaceMessage,
} from '../data/messages';
import { isSupabaseConfigured } from '../data/supabase';
import { getListing, getSeller, getThread, sendMessage, subscribe } from '../data/store';
import type { Thread } from '../data/types';
import './Chat.css';

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | undefined>(
    () => (!isSupabaseConfigured && id ? getThread(id) : undefined),
  );
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    if (!isSupabaseConfigured) {
      setThread(getThread(id));
      setLoading(false);
      return subscribe(() => setThread(getThread(id)));
    }

    let active = true;
    const refresh = () => {
      void loadMarketplaceThread(id, user.id)
        .then((next) => {
          if (active) {
            setThread(next);
            setError('');
          }
        })
        .catch((err: unknown) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load conversation');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  if (loading && !thread) {
    return (
      <>
        <TopBar title="Chat" />
        <EmptyState emoji="⏳" title="Loading chat…" />
      </>
    );
  }

  if (!thread) {
    return (
      <>
        <TopBar title="Chat" />
        <EmptyState
          emoji={error ? '⚠️' : '✉️'}
          title={error ? 'Could not load chat' : 'Chat not found'}
          subtitle={error || "This conversation doesn't exist."}
        />
      </>
    );
  }

  const listing = getListing(thread.listingId);
  const seller = getSeller(thread.peerId);

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !thread || !user || sending) return;
    if (!isSupabaseConfigured) {
      sendMessage(thread.id, trimmed);
      setDraft('');
      return;
    }
    void (async () => {
      setSending(true);
      setError('');
      try {
        await sendMarketplaceMessage(thread.id, user.id, trimmed);
        setThread(await loadMarketplaceThread(thread.id, user.id));
        setDraft('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send message');
      } finally {
        setSending(false);
      }
    })();
  }

  function handleMakeOffer() {
    if (!listing) return;
    const offer = Math.round((listing.priceINR * 0.85) / 10) * 10;
    handleSend(`Would you take ₹${offer.toLocaleString('en-IN')} for this?`);
  }

  return (
    <div className="chat">
      <TopBar title={seller?.name ?? 'Chat'} />

      {listing && (
        <div className="chat__listing-strip">
          <div
            className="chat__listing-thumb"
            style={
              !listing.photoDataUrl
                ? { background: `linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})` }
                : undefined
            }
          >
            {listing.photoDataUrl ? (
              <img src={listing.photoDataUrl} alt="" />
            ) : (
              <span aria-hidden="true">{listing.emoji}</span>
            )}
          </div>
          <div className="chat__listing-info">
            <span className="chat__listing-title">{listing.title}</span>
            <span className="price-tag" style={{ fontSize: 13 }}>₹{listing.priceINR.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      <div className="chat__messages">
        {error && <p role="alert">{error}</p>}
        {thread.messages.length === 0 && (
          <EmptyState emoji="👋" title="Say hello" subtitle="Start the conversation about this item." />
        )}
        {thread.messages.map((msg, i) => (
          <div key={i} className={`chat__bubble-row chat__bubble-row--${msg.from}`}>
            <div className="chat__bubble">
              {msg.text}
              <span className="chat__bubble-time">{msg.timeAgo}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat__quick-actions">
        <button type="button" className="chat__quick-chip" onClick={handleMakeOffer}>
          💸 Make offer
        </button>
        <button type="button" className="chat__quick-chip" onClick={() => handleSend('Is this still available?')}>
          Still available?
        </button>
        <button type="button" className="chat__quick-chip" onClick={() => handleSend('Can you do free shipping?')}>
          Free shipping?
        </button>
      </div>

      <form
        className="chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
      >
        <input
          type="text"
          className="chat__composer-input"
          placeholder="Message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          className="chat__composer-send"
          disabled={!draft.trim() || sending}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
