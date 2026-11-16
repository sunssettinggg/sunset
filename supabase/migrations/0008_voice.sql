-- SUNSET: превью голосовых в списке чатов (attachment_type в last_messages)

create or replace function public.last_messages()
returns table (
  chat_id uuid,
  body text,
  created_at timestamptz,
  sender_id uuid,
  attachment_type text
)
language sql stable security invoker set search_path = '' as $$
  select distinct on (m.chat_id)
    m.chat_id,
    m.body,
    m.created_at,
    m.sender_id,
    m.attachment_type
  from public.messages m
  where m.deleted_at is null
  order by m.chat_id, m.created_at desc;
$$;

revoke all on function public.last_messages() from public, anon;
grant execute on function public.last_messages() to authenticated;
