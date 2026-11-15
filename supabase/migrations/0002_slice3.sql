-- SUNSET slice 3: unread counters. Run in Supabase SQL Editor.
create or replace function public.unread_counts()
returns table (chat_id uuid, unread bigint)
language sql stable security invoker set search_path = '' as $$
  select m.chat_id, count(*)
  from public.messages m
  join public.chat_members cm on cm.chat_id = m.chat_id and cm.user_id = auth.uid()
  where m.sender_id <> auth.uid() and m.deleted_at is null and m.created_at > cm.last_read_at
  group by m.chat_id;
$$;

create or replace function public.mark_chat_read(p_chat uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.chat_members set last_read_at = now()
  where chat_id = p_chat and user_id = auth.uid();
$$;

revoke all on function public.unread_counts(), public.mark_chat_read(uuid) from public, anon;
grant execute on function public.unread_counts(), public.mark_chat_read(uuid) to authenticated;
