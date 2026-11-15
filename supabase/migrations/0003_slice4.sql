-- SUNSET slice 4: "Избранное" chat per user + last message previews.
alter table public.chats drop constraint if exists chats_kind_check;
alter table public.chats add constraint chats_kind_check check (kind in ('direct', 'group', 'saved'));
create unique index if not exists chats_one_saved_per_user on public.chats (created_by) where kind = 'saved';

create or replace function public.get_saved_chat()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_chat uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select id into v_chat from public.chats where kind = 'saved' and created_by = v_me;
  if v_chat is not null then return v_chat; end if;
  insert into public.chats (kind, title, created_by) values ('saved', 'Избранное', v_me)
    on conflict (created_by) where kind = 'saved' do nothing returning id into v_chat;
  if v_chat is null then
    select id into v_chat from public.chats where kind = 'saved' and created_by = v_me;
  else
    insert into public.chat_members (chat_id, user_id, role) values (v_chat, v_me, 'owner');
  end if;
  return v_chat;
end $$;

create or replace function public.last_messages()
returns table (chat_id uuid, body text, created_at timestamptz, sender_id uuid)
language sql stable security invoker set search_path = '' as $$
  select distinct on (m.chat_id) m.chat_id, m.body, m.created_at, m.sender_id
  from public.messages m where m.deleted_at is null
  order by m.chat_id, m.created_at desc;
$$;

revoke all on function public.get_saved_chat(), public.last_messages() from public, anon;
grant execute on function public.get_saved_chat(), public.last_messages() to authenticated;
