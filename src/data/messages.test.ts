import { describe, expect, it } from 'vitest';
import { messageRowToMessage, type MessageRow } from './messages';

const row: MessageRow = {
  id: '71111111-1111-4111-8111-111111111111',
  conversation_id: '72222222-2222-4222-8222-222222222222',
  sender_id: '73333333-3333-4333-8333-333333333333',
  body: 'Is this still available?',
  created_at: '2026-07-28T12:00:00.000Z',
};

describe('messageRowToMessage', () => {
  it('maps the current user to the local me/peer presentation shape', () => {
    expect(messageRowToMessage(
      row,
      row.sender_id,
      Date.parse('2026-07-28T12:02:00.000Z'),
    )).toEqual({
      from: 'me',
      text: row.body,
      timeAgo: '2m',
    });

    expect(messageRowToMessage(
      row,
      '74444444-4444-4444-8444-444444444444',
      Date.parse('2026-07-28T12:00:20.000Z'),
    )).toEqual({
      from: 'peer',
      text: row.body,
      timeAgo: 'just now',
    });
  });
});
