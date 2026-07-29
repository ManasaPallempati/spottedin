-- The public listings policy checks conversation membership so buyers can
-- continue seeing a sold listing from an existing conversation. PostgreSQL
-- may evaluate that branch for anonymous requests even when the listing is
-- live, so anon needs table-level SELECT privileges for the policy query.
--
-- No messaging SELECT policies target anon. RLS therefore still returns zero
-- conversations, memberships, and messages to anonymous clients.
grant select on table public.conversations to anon;
grant select on table public.conversation_members to anon;
grant select on table public.messages to anon;
