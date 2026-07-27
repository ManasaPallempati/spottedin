import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import TopBar from '../components/TopBar';
import { getListing, getSeller, getThread, sendMessage, subscribe } from '../data/store';
import type { Thread } from '../data/types';
import './Chat.css';

export default function Chat() {
  const { id } = useParams();
  const [thread, setThread] = useState<Thread | undefined>(() => (id ? getThread(id) : undefined));
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setThread(getThread(id));
    return subscribe(() => setThread(getThread(id)));
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  if (!thread) {
    return (
      <>
        <TopBar title="Chat" />
        <EmptyState emoji="✉️" title="Chat not found" subtitle="This conversation doesn't exist." />
      </>
    );
  }

  const listing = getListing(thread.listingId);
  const seller = getSeller(thread.peerId);

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !thread) return;
    sendMessage(thread.id, trimmed);
    setDraft('');
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
        <button type="submit" className="chat__composer-send" disabled={!draft.trim()} aria-label="Send">
          ➤
        </button>
      </form>
    </div>
  );
}
