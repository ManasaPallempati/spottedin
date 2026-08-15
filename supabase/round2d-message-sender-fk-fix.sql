-- spotted_messages.sender_id had no ON DELETE behavior (defaulted to RESTRICT),
-- which permanently blocks deleting any profile/auth user that has ever sent a
-- message — a real account-deletion dead-end. A message is co-owned by both
-- thread participants, so it should survive the sender's deletion (unlike
-- purely-owned rows such as orders/likes, which correctly cascade); null out
-- the sender instead, consistent with how canned counterparty replies already
-- represent "no attributable sender" via sender_id is null.
alter table public.spotted_messages drop constraint if exists spotted_messages_sender_id_fkey;
alter table public.spotted_messages add constraint spotted_messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;
