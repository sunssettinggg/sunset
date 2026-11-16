-- SUNSET slice 7: groups & channels (public/private), profile channel, chat images.

-- ===== chats: new kind + fields =====
alter table public.chats drop constraint if exists chats_kind_check;
alter table public.chats add constraint chats_kind_check check (kind in ('direct', 'group', 'channel', 'saved'));
alter table public.chats add column if not exists description text check (char_length(description) <= 300);
alter table public.chats add column if not exists is_public boolean not null default false;
alter table public.chats add column if not exists handle text check (handle ~ '^[a-z0-9_]{3,30}$');
alter table public.chats add column if not exists invite_code text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
create unique index if not exists chats_handle_unique on public.chats (lower(handle)) where handle is not null;
create unique index if not exists chats_invite_unique on public.chats (invite_code);

-- invite codes must not be readable by ordinary members: expose columns explicitly
revoke select on public.chats from authenticated;
grant select (id, kind, title, avatar_url, created_by, created_at, description, is_public, handle) on public.chats to authenticated;

alter table public.profiles add column if not exists channel_id uuid references public.chats(id) on delete set null;

-- ===== permissions =====
create or replace function public.is_chat_admin(p_chat uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_members cm join public.chats c on c.id = cm.chat_id
    where cm.chat_id = p_chat and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin') and c.kind in ('group', 'channel'));
$$;

create or replace function public.can_post(p_chat uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_members cm join public.chats c on c.id = cm.chat_id
    where cm.chat_id = p_chat and cm.user_id = auth.uid()
      and (c.kind <> 'channel' or cm.role in ('owner', 'admin')));
$$;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_post(chat_id));

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_post(((storage.foldername(name))[1])::uuid));

-- ===== create / join =====
create or replace function public.create_chat(p_kind text, p_title text, p_description text, p_public boolean, p_handle text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_chat uuid; v_handle text := nullif(lower(trim(coalesce(p_handle, ''))), '');
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('group', 'channel') then raise exception 'bad kind'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 80 then raise exception 'bad title'; end if;
  if p_description is not null and char_length(p_description) > 300 then raise exception 'bad description'; end if;
  if p_public then
    if v_handle is null or v_handle !~ '^[a-z0-9_]{3,30}$' then raise exception 'bad handle'; end if;
    if exists (select 1 from public.chats where lower(handle) = v_handle) then raise exception 'handle taken'; end if;
  else
    v_handle := null;
  end if;
  insert into public.chats (kind, title, description, is_public, handle, created_by)
  values (p_kind, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), coalesce(p_public, false), v_handle, v_me)
  returning id into v_chat;
  insert into public.chat_members (chat_id, user_id, role) values (v_chat, v_me, 'owner');
  return v_chat;
end $$;

create or replace function public.join_chat(p_chat uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.chats%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into c from public.chats where id = p_chat;
  if not found or c.kind not in ('group', 'channel') or not c.is_public then raise exception 'not joinable'; end if;
  insert into public.chat_members (chat_id, user_id) values (p_chat, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.join_by_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_chat uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into v_chat from public.chats where invite_code = trim(p_code) and kind in ('group', 'channel');
  if v_chat is null then raise exception 'invalid invite'; end if;
  insert into public.chat_members (chat_id, user_id) values (v_chat, auth.uid()) on conflict do nothing;
  return v_chat;
end $$;

create or replace function public.get_invite_code(p_chat uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when public.is_chat_admin(p_chat) then (select invite_code from public.chats where id = p_chat) end;
$$;

create or replace function public.search_public_chats(p_query text)
returns table (id uuid, kind text, title text, description text, handle text, avatar_url text, members bigint, joined boolean)
language sql stable security definer set search_path = '' as $$
  with q as (select '%' || replace(replace(replace(lower(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat)
  select c.id, c.kind, c.title, c.description, c.handle, c.avatar_url,
         (select count(*) from public.chat_members m where m.chat_id = c.id),
         exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = auth.uid())
  from public.chats c, q
  where c.is_public and c.kind in ('group', 'channel') and char_length(p_query) between 1 and 30
    and (lower(c.title) like q.pat or lower(c.handle) like q.pat)
  order by c.title limit 8;
$$;

-- ===== channel in profile =====
create or replace function public.set_profile_channel(p_chat uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if p_chat is null then
    update public.profiles set channel_id = null where id = v_me;
    return;
  end if;
  if not exists (select 1 from public.chats c join public.chat_members m on m.chat_id = c.id
                 where c.id = p_chat and c.kind = 'channel' and m.user_id = v_me and m.role = 'owner') then
    raise exception 'not your channel';
  end if;
  update public.profiles set channel_id = p_chat where id = v_me;
end $$;

create or replace function public.profile_channel(p_user uuid)
returns table (id uuid, title text, is_public boolean, members bigint, joined boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.is_public,
         (select count(*) from public.chat_members m where m.chat_id = c.id),
         exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = auth.uid())
  from public.profiles p join public.chats c on c.id = p.channel_id
  where p.id = p_user and c.kind = 'channel';
$$;

revoke all on function public.create_chat(text, text, text, boolean, text), public.join_chat(uuid), public.join_by_invite(text),
  public.get_invite_code(uuid), public.search_public_chats(text), public.set_profile_channel(uuid), public.profile_channel(uuid)
  from public, anon;
grant execute on function public.create_chat(text, text, text, boolean, text), public.join_chat(uuid), public.join_by_invite(text),
  public.get_invite_code(uuid), public.search_public_chats(text), public.set_profile_channel(uuid), public.profile_channel(uuid)
  to authenticated;
