alter table public.app_opens add column session_id text not null default '';

alter table public.app_opens
  add constraint app_opens_session_length check (char_length(session_id) <= 40);

create index app_opens_session_created_at_idx
  on public.app_opens (session_id, created_at);

grant insert (ua, path, session_id) on table public.app_opens to anon, authenticated;
