-- Sunset: наборы стикеров (свои + добавленные от других пользователей).

create table if not exists public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  short_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);
create index if not exists sticker_packs_owner_idx on public.sticker_packs (owner_id, created_at);

create table if not exists public.sticker_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  path text not null check (path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (pack_id, path)
);
create index if not exists sticker_pack_items_path_idx on public.sticker_pack_items (path);

create table if not exists public.sticker_pack_subs (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

alter table public.sticker_packs enable row level security;
alter table public.sticker_pack_items enable row level security;
alter table public.sticker_pack_subs enable row level security;

drop policy if exists sticker_packs_select on public.sticker_packs;
drop policy if exists sticker_packs_insert on public.sticker_packs;
drop policy if exists sticker_packs_update on public.sticker_packs;
drop policy if exists sticker_packs_delete on public.sticker_packs;
create policy sticker_packs_select on public.sticker_packs for select to authenticated
  using (owner_id = auth.uid() or exists (select 1 from public.sticker_pack_subs s where s.pack_id = id and s.user_id = auth.uid()));
create policy sticker_packs_insert on public.sticker_packs for insert to authenticated with check (owner_id = auth.uid());
create policy sticker_packs_update on public.sticker_packs for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sticker_packs_delete on public.sticker_packs for delete to authenticated using (owner_id = auth.uid());

drop policy if exists sticker_items_select on public.sticker_pack_items;
drop policy if exists sticker_items_insert on public.sticker_pack_items;
drop policy if exists sticker_items_delete on public.sticker_pack_items;
create policy sticker_items_select on public.sticker_pack_items for select to authenticated
  using (exists (select 1 from public.sticker_packs p where p.id = pack_id));
create policy sticker_items_insert on public.sticker_pack_items for insert to authenticated
  with check (exists (select 1 from public.sticker_packs p where p.id = pack_id and p.owner_id = auth.uid()));
create policy sticker_items_delete on public.sticker_pack_items for delete to authenticated
  using (exists (select 1 from public.sticker_packs p where p.id = pack_id and p.owner_id = auth.uid()));

drop policy if exists sticker_subs_select on public.sticker_pack_subs;
drop policy if exists sticker_subs_delete on public.sticker_pack_subs;
create policy sticker_subs_select on public.sticker_pack_subs for select to authenticated using (user_id = auth.uid());
create policy sticker_subs_delete on public.sticker_pack_subs for delete to authenticated using (user_id = auth.uid());

revoke all on public.sticker_packs, public.sticker_pack_items, public.sticker_pack_subs from anon;
revoke all on public.sticker_packs, public.sticker_pack_items, public.sticker_pack_subs from authenticated;
grant select, insert, delete on public.sticker_packs to authenticated;
grant update (title) on public.sticker_packs to authenticated;
grant select, insert, delete on public.sticker_pack_items to authenticated;
grant select, delete on public.sticker_pack_subs to authenticated;

-- Лимиты: 20 наборов на человека, 120 стикеров в наборе, 200 добавленных наборов.
create or replace function public.sticker_packs_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'sticker_packs' then
    if (select count(*) from public.sticker_packs where owner_id = new.owner_id) >= 20 then raise exception 'pack limit'; end if;
  elsif tg_table_name = 'sticker_pack_items' then
    if (select count(*) from public.sticker_pack_items where pack_id = new.pack_id) >= 120 then raise exception 'item limit'; end if;
  else
    if (select count(*) from public.sticker_pack_subs where user_id = new.user_id) >= 200 then raise exception 'sub limit'; end if;
  end if;
  return new;
end $$;
drop trigger if exists sticker_packs_limit on public.sticker_packs;
create trigger sticker_packs_limit before insert on public.sticker_packs for each row execute function public.sticker_packs_limits();
drop trigger if exists sticker_items_limit on public.sticker_pack_items;
create trigger sticker_items_limit before insert on public.sticker_pack_items for each row execute function public.sticker_packs_limits();
drop trigger if exists sticker_subs_limit on public.sticker_pack_subs;
create trigger sticker_subs_limit before insert on public.sticker_pack_subs for each row execute function public.sticker_packs_limits();

-- Описание набора для просмотра (внутренняя функция).
create or replace function public.pack_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'code', p.short_code,
    'owner_name', (select pr.display_name from public.profiles pr where pr.id = p.owner_id),
    'mine', p.owner_id = auth.uid(),
    'subscribed', exists (select 1 from public.sticker_pack_subs s where s.pack_id = p.id and s.user_id = auth.uid()),
    'items', coalesce((select jsonb_agg(i.path order by i.position, i.created_at) from public.sticker_pack_items i where i.pack_id = p.id), '[]'::jsonb))
  from public.sticker_packs p where p.id = p_id
$$;
revoke all on function public.pack_json(uuid) from public, anon, authenticated;

create or replace function public.pack_by_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into v from public.sticker_packs where short_code = lower(btrim(p_code));
  if v is null then return null; end if;
  return public.pack_json(v);
end $$;

create or replace function public.pack_by_path(p_path text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select pack_id into v from public.sticker_pack_items where path = p_path order by created_at limit 1;
  if v is null then return null; end if;
  return public.pack_json(v);
end $$;

create or replace function public.subscribe_pack(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v uuid; o uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id, owner_id into v, o from public.sticker_packs where short_code = lower(btrim(p_code));
  if v is null then raise exception 'pack not found'; end if;
  if o <> auth.uid() then
    insert into public.sticker_pack_subs (user_id, pack_id) values (auth.uid(), v) on conflict do nothing;
  end if;
  return public.pack_json(v);
end $$;

revoke all on function public.pack_by_code(text), public.pack_by_path(text), public.subscribe_pack(text) from public, anon;
grant execute on function public.pack_by_code(text), public.pack_by_path(text), public.subscribe_pack(text) to authenticated;

notify pgrst, 'reload schema';
