-- Sunset: очистка истории и удаление чата (личный чат убирается из списка, пока не придёт новое сообщение).

alter table public.chat_members add column if not exists cleared_at timestamptz;
alter table public.chat_members add column if not exists hidden_at timestamptz;

create or replace function public.clear_chat_history(p_chat uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.chat_members set cleared_at = now(), last_read_at = now()
   where chat_id = p_chat and user_id = auth.uid();
  if not found then raise exception 'not a member'; end if;
end $$;

-- Удалить личный чат у себя. p_for_all = true: сообщения помечаются удалёнными и у собеседника тоже.
create or replace function public.delete_chat(p_chat uuid, p_for_all boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_kind text;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.chat_members where chat_id = p_chat and user_id = v_me) then
    raise exception 'not a member';
  end if;
  select kind into v_kind from public.chats where id = p_chat;
  if v_kind is distinct from 'direct' then raise exception 'direct only'; end if;

  if p_for_all then
    update public.messages set deleted_at = now() where chat_id = p_chat and deleted_at is null;
    update public.chat_members set cleared_at = now(), hidden_at = now(), last_read_at = now() where chat_id = p_chat;
  else
    update public.chat_members set cleared_at = now(), hidden_at = now(), last_read_at = now()
     where chat_id = p_chat and user_id = v_me;
  end if;
end $$;

revoke all on function public.clear_chat_history(uuid) from public, anon;
revoke all on function public.delete_chat(uuid, boolean) from public, anon;
grant execute on function public.clear_chat_history(uuid) to authenticated;
grant execute on function public.delete_chat(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
