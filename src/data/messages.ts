import { fetchProfile } from './profiles';
import { loadListing } from './listings';
import { requireSupabase } from './supabase';
import type { Msg, Thread } from './types';

const CONVERSATION_COLUMNS = 'id,listing_id,created_by,created_at,updated_at';
const MESSAGE_COLUMNS = 'id,conversation_id,sender_id,body,created_at';

export interface ConversationRow {
  id: string;
  listing_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

function formatTimeAgo(createdAt: string, now = Date.now()): string {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 'recently';
  const seconds = Math.max(0, Math.floor((now - created) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(createdAt).toLocaleDateString();
}

export function messageRowToMessage(
  row: MessageRow,
  currentUserId: string,
  now?: number,
): Msg {
  return {
    from: row.sender_id === currentUserId ? 'me' : 'peer',
    text: row.body,
    timeAgo: formatTimeAgo(row.created_at, now),
  };
}

async function hydrateThreads(
  conversations: ConversationRow[],
  currentUserId: string,
): Promise<Thread[]> {
  if (conversations.length === 0) return [];

  const client = requireSupabase();
  const ids = conversations.map((conversation) => conversation.id);
  const { data, error } = await client
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .in('conversation_id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const messages = data as MessageRow[];
  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messages) {
    const rows = messagesByConversation.get(message.conversation_id) ?? [];
    rows.push(message);
    messagesByConversation.set(message.conversation_id, rows);
  }

  return Promise.all(conversations.map(async (conversation) => {
    const listing = await loadListing(conversation.listing_id);
    if (!listing) {
      throw new Error('A conversation references a listing that is unavailable');
    }
    const peerId = conversation.created_by === currentUserId
      ? listing.sellerId
      : conversation.created_by;
    await fetchProfile(peerId);
    return {
      id: conversation.id,
      listingId: conversation.listing_id,
      peerId,
      messages: (messagesByConversation.get(conversation.id) ?? [])
        .map((message) => messageRowToMessage(message, currentUserId)),
    };
  }));
}

export async function loadMarketplaceThreads(currentUserId: string): Promise<Thread[]> {
  const { data, error } = await requireSupabase()
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return hydrateThreads(data as ConversationRow[], currentUserId);
}

export async function loadMarketplaceThread(
  conversationId: string,
  currentUserId: string,
): Promise<Thread | undefined> {
  const { data, error } = await requireSupabase()
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const [thread] = await hydrateThreads([data as ConversationRow], currentUserId);
  return thread;
}

export async function startMarketplaceConversation(
  listingId: string,
  currentUserId: string,
): Promise<Thread> {
  const { data, error } = await requireSupabase()
    .rpc('start_conversation', { target_listing_id: listingId });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Conversation creation returned no ID');
  const thread = await loadMarketplaceThread(data, currentUserId);
  if (!thread) throw new Error('Conversation was created but could not be loaded');
  return thread;
}

export async function sendMarketplaceMessage(
  conversationId: string,
  currentUserId: string,
  text: string,
): Promise<Msg> {
  const body = text.trim();
  if (!body) throw new Error('Enter a message');
  if (body.length > 2000) throw new Error('Messages must be 2,000 characters or shorter');

  const { data, error } = await requireSupabase()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw error;
  return messageRowToMessage(data as MessageRow, currentUserId);
}
