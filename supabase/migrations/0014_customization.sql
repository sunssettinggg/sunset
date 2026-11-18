-- Sunset: цвет сообщений (Premium) и обои чата (Premium).

alter table public.profiles add column if not exists bubble_color text;
do $$ begin
  alter table public.profiles add constraint profiles_bubble_fmt check (bubble_color is null or bubble_color ~ '^#[0-9a-f]{6}$');
exception when duplicate_object then null; end $$;

create or replace function public.set_bubble_color(p_color text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_until timestamptz;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select premium_until into v_until from public.profiles where id = v_me;
  if v_until is null or v_until <= now() then raise exception 'premium required'; end if;
  if p_color is not null and p_color !~ '^#[0-9a-f]{6}$' then raise exception 'bad color'; end if;
  update public.profiles set bubble_color = p_color where id = v_me;
end $$;
revoke all on function public.set_bubble_color(text) from public, anon;
grant execute on function public.set_bubble_color(text) to authenticated;

-- Обои: по одной строке на зрителя чата. Читать можно только свою строку, менять только функциями.
create table if not exists public.chat_wallpapers (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value text not null check (value ~ '^(g:[a-z]{2,12}|c:#[0-9a-f]{6})$'),
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
alter table public.chat_wallpapers enable row level security;
drop policy if exists chat_wallpapers_select on public.chat_wallpapers;
create policy chat_wallpapers_select on public.chat_wallpapers for select to authenticated using (user_id = auth.uid());
revoke all on public.chat_wallpapers from anon, authenticated;
grant select on public.chat_wallpapers to authenticated;

create or replace function public.set_chat_wallpaper(p_chat uuid, p_value text, p_both boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_until timestamptz; v_kind text;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select premium_until into v_until from public.profiles where id = v_me;
  if v_until is null or v_until <= now() then raise exception 'premium required'; end if;
  if p_value is null or p_value !~ '^(g:[a-z]{2,12}|c:#[0-9a-f]{6})$' then raise exception 'bad wallpaper'; end if;
  if not exists (select 1 from public.chat_members where chat_id = p_chat and user_id = v_me) then
    raise exception 'not a member';
  end if;

  insert into public.chat_wallpapers (chat_id, user_id, value, set_by) values (p_chat, v_me, p_value, v_me)
  on conflict (chat_id, user_id) do update set value = excluded.value, set_by = excluded.set_by, updated_at = now();

  if p_both then
    select kind into v_kind from public.chats where id = p_chat;
    if v_kind is distinct from 'direct' then raise exception 'direct only'; end if;
    insert into public.chat_wallpapers (chat_id, user_id, value, set_by)
    select p_chat, m.user_id, p_value, v_me from public.chat_members m where m.chat_id = p_chat and m.user_id <> v_me
    on conflict (chat_id, user_id) do update set value = excluded.value, set_by = excluded.set_by, updated_at = now();
  end if;
end $$;
revoke all on function public.set_chat_wallpaper(uuid, text, boolean) from public, anon;
grant execute on function public.set_chat_wallpaper(uuid, text, boolean) to authenticated;

-- Убрать обои у себя может любой участник (даже без Premium).
create or replace function public.clear_chat_wallpaper(p_chat uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.chat_wallpapers where chat_id = p_chat and user_id = auth.uid();
end $$;
revoke all on function public.clear_chat_wallpaper(uuid) from public, anon;
grant execute on function public.clear_chat_wallpaper(uuid) to authenticated;

notify pgrst, 'reload schema';
