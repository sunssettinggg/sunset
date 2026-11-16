-- SUNSET: приватность аватарки и номера, учёт устройств.

alter table public.profiles add column if not exists avatar_visibility text not null default 'everyone'
  check (avatar_visibility in ('everyone', 'contacts', 'nobody'));
alter table public.profiles add column if not exists number_visibility text not null default 'everyone'
  check (number_visibility in ('everyone', 'contacts', 'nobody'));

-- Свои настройки меняются только через функцию
create or replace function public.set_privacy(p_avatar text, p_number text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.profiles
     set avatar_visibility = coalesce(p_avatar, avatar_visibility),
         number_visibility = coalesce(p_number, number_visibility)
   where id = auth.uid();
end $$;

-- Контакт = человек, с которым есть личный чат
create or replace function public.are_contacts(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_members m1
    join public.chats c on c.id = m1.chat_id and c.kind = 'direct'
    join public.chat_members m2 on m2.chat_id = m1.chat_id and m2.user_id = p_b
    where m1.user_id = p_a
  );
$$;

create or replace function public.my_contacts() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct m2.user_id
  from public.chat_members m1
  join public.chats c on c.id = m1.chat_id and c.kind = 'direct'
  join public.chat_members m2 on m2.chat_id = m1.chat_id and m2.user_id <> m1.user_id
  where m1.user_id = auth.uid();
$$;

-- Поиск по номеру уважает настройку «кто видит номер»
create or replace function public.search_profiles(p_query text) returns setof public.profiles
language sql stable security invoker set search_path = '' as $$
  with q as (
    select '%' || replace(replace(replace(lower(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat,
           regexp_replace(p_query, '\D', '', 'g') as digits
  )
  select p.* from public.profiles p, q
  where p.id <> auth.uid() and char_length(p_query) between 1 and 30
    and (p.username like q.pat
      or exists (select 1 from unnest(p.handles) h where h like q.pat)
      or (p_query ~ '^[0-9]+$' and char_length(q.digits) >= 3
          and regexp_replace(coalesce(p.showcase_number, ''), '\D', '', 'g') like '%' || q.digits || '%'
          and (p.number_visibility = 'everyone'
               or (p.number_visibility = 'contacts' and public.are_contacts(auth.uid(), p.id)))))
  order by p.username
  limit 8;
$$;

-- ===== устройства =====
create table if not exists public.user_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  device_id  text not null check (char_length(device_id) between 8 and 64),
  label      text not null default 'Неизвестное устройство' check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  unique (user_id, device_id)
);
alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from anon, authenticated; -- только через функции ниже

create or replace function public.touch_session(p_device text, p_label text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.user_sessions (user_id, device_id, label)
  values (auth.uid(), p_device, left(coalesce(nullif(trim(p_label), ''), 'Неизвестное устройство'), 80))
  on conflict (user_id, device_id) do update set last_seen = now(), label = excluded.label;
end $$;

create or replace function public.my_sessions()
returns table (device_id text, label text, created_at timestamptz, last_seen timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.device_id, s.label, s.created_at, s.last_seen
  from public.user_sessions s
  where s.user_id = auth.uid() and s.last_seen > now() - interval '30 days'
  order by s.last_seen desc;
$$;

create or replace function public.end_session(p_device text) returns void
language sql security definer set search_path = '' as $$
  delete from public.user_sessions where user_id = auth.uid() and device_id = p_device;
$$;

create or replace function public.end_other_sessions(p_keep text) returns void
language sql security definer set search_path = '' as $$
  delete from public.user_sessions where user_id = auth.uid() and device_id <> p_keep;
$$;

revoke all on function public.set_privacy(text, text), public.are_contacts(uuid, uuid), public.my_contacts(),
  public.search_profiles(text), public.touch_session(text, text), public.my_sessions(),
  public.end_session(text), public.end_other_sessions(text) from public, anon;
grant execute on function public.set_privacy(text, text), public.my_contacts(), public.search_profiles(text),
  public.touch_session(text, text), public.my_sessions(), public.end_session(text),
  public.end_other_sessions(text) to authenticated;
-- are_contacts нужна только самой базе (search_profiles), клиенту не выдаётся
