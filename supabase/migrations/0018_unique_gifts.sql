-- Sunset: уникальные подарки (модель + фон + узор, номер в тираже, редкость, перепродажа).

alter table public.gifts add column if not exists collection text;
alter table public.gifts add column if not exists upgrade_price bigint not null default 0 check (upgrade_price >= 0);

create table if not exists public.unique_collections (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  title text not null,
  description text not null default '',
  supply int not null check (supply > 0),
  minted int not null default 0
);

create table if not exists public.unique_traits (
  collection_id text not null references public.unique_collections(id) on delete cascade,
  kind text not null check (kind in ('model', 'backdrop', 'symbol')),
  key text not null check (key ~ '^[a-z0-9_]{1,30}$'),
  title text not null,
  weight int not null check (weight > 0),
  primary key (collection_id, kind, key)
);

create table if not exists public.unique_gifts (
  id uuid primary key default gen_random_uuid(),
  collection_id text not null references public.unique_collections(id),
  number int not null,
  model text not null,
  backdrop text not null,
  symbol text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  price bigint check (price is null or price > 0),
  shown boolean not null default true,
  created_at timestamptz not null default now(),
  unique (collection_id, number)
);
create index if not exists unique_gifts_owner_idx on public.unique_gifts (owner_id);
create index if not exists unique_gifts_sale_idx on public.unique_gifts (price) where price is not null;

create table if not exists public.unique_history (
  id uuid primary key default gen_random_uuid(),
  unique_id uuid not null references public.unique_gifts(id) on delete cascade,
  kind text not null check (kind in ('mint', 'send', 'sale')),
  from_id uuid references public.profiles(id) on delete set null,
  to_id uuid references public.profiles(id) on delete set null,
  price bigint,
  at timestamptz not null default now()
);
create index if not exists unique_history_idx on public.unique_history (unique_id, at desc);

alter table public.unique_collections enable row level security;
alter table public.unique_traits enable row level security;
alter table public.unique_gifts enable row level security;
alter table public.unique_history enable row level security;

drop policy if exists unique_coll_select on public.unique_collections;
drop policy if exists unique_traits_select on public.unique_traits;
drop policy if exists unique_gifts_select on public.unique_gifts;
drop policy if exists unique_history_select on public.unique_history;
create policy unique_coll_select on public.unique_collections for select to authenticated using (true);
create policy unique_traits_select on public.unique_traits for select to authenticated using (true);
create policy unique_gifts_select on public.unique_gifts for select to authenticated
  using (owner_id = auth.uid() or shown or price is not null);
create policy unique_history_select on public.unique_history for select to authenticated
  using (exists (select 1 from public.unique_gifts u where u.id = unique_id));

revoke all on public.unique_collections, public.unique_traits, public.unique_gifts, public.unique_history from anon, authenticated;
grant select on public.unique_collections, public.unique_traits, public.unique_gifts, public.unique_history to authenticated;

-- Случайный признак с учётом веса (чем больше вес, тем чаще выпадает).
create or replace function public.pick_trait(p_coll text, p_kind text) returns text
language sql volatile security definer set search_path = '' as $$
  select key from public.unique_traits where collection_id = p_coll and kind = p_kind
  order by -ln(1 - random()) / weight limit 1
$$;
revoke all on function public.pick_trait(text, text) from public, anon, authenticated;

-- Улучшение обычного подарка до уникального.
create or replace function public.upgrade_gift(p_ug uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); ug public.user_gifts%rowtype; g public.gifts%rowtype; c public.unique_collections%rowtype;
        v_id uuid; v_num int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select * into ug from public.user_gifts where id = p_ug and owner_id = v_me for update;
  if not found then raise exception 'not your gift'; end if;
  select * into g from public.gifts where id = ug.gift_id;
  if g.collection is null then raise exception 'not upgradable'; end if;
  select * into c from public.unique_collections where id = g.collection for update;
  if not found or c.minted >= c.supply then raise exception 'sold out'; end if;
  if g.upgrade_price > 0 then
    update public.wallets set stars = stars - g.upgrade_price where user_id = v_me and stars >= g.upgrade_price;
    if not found then raise exception 'not enough stars'; end if;
  end if;
  v_num := c.minted + 1;
  insert into public.unique_gifts (collection_id, number, model, backdrop, symbol, owner_id, shown)
  values (c.id, v_num, public.pick_trait(c.id, 'model'), public.pick_trait(c.id, 'backdrop'), public.pick_trait(c.id, 'symbol'), v_me, ug.shown)
  returning id into v_id;
  update public.unique_collections set minted = v_num where id = c.id;
  delete from public.user_gifts where id = p_ug;
  insert into public.unique_history (unique_id, kind, to_id) values (v_id, 'mint', v_me);
  return v_id;
end $$;

create or replace function public.send_unique(p_id uuid, p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = v_me or not exists (select 1 from public.profiles where id = p_to) then raise exception 'bad recipient'; end if;
  update public.unique_gifts set owner_id = p_to, price = null, shown = true where id = p_id and owner_id = v_me;
  if not found then raise exception 'not your gift'; end if;
  insert into public.unique_history (unique_id, kind, from_id, to_id) values (p_id, 'send', v_me, p_to);
end $$;

create or replace function public.set_unique_shown(p_id uuid, p_shown boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.unique_gifts set shown = coalesce(p_shown, false) where id = p_id and owner_id = auth.uid();
  if not found then raise exception 'not your gift'; end if;
end $$;

create or replace function public.list_unique(p_id uuid, p_price bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_price is not null and (p_price < 1 or p_price > 1000000000) then raise exception 'bad price'; end if;
  update public.unique_gifts set price = p_price where id = p_id and owner_id = auth.uid();
  if not found then raise exception 'not your gift'; end if;
end $$;

create or replace function public.buy_unique(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); u public.unique_gifts%rowtype;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select * into u from public.unique_gifts where id = p_id for update;
  if not found or u.price is null then raise exception 'item not for sale'; end if;
  if u.owner_id = v_me then raise exception 'already yours'; end if;
  update public.wallets set stars = stars - u.price where user_id = v_me and stars >= u.price;
  if not found then raise exception 'not enough stars'; end if;
  insert into public.wallets as w (user_id, stars) values (u.owner_id, u.price)
    on conflict (user_id) do update set stars = w.stars + excluded.stars;
  update public.unique_gifts set owner_id = v_me, price = null, shown = true where id = p_id;
  insert into public.unique_history (unique_id, kind, from_id, to_id, price) values (p_id, 'sale', u.owner_id, v_me, u.price);
end $$;

revoke all on function public.upgrade_gift(uuid), public.send_unique(uuid, uuid), public.set_unique_shown(uuid, boolean),
  public.list_unique(uuid, bigint), public.buy_unique(uuid) from public, anon;
grant execute on function public.upgrade_gift(uuid), public.send_unique(uuid, uuid), public.set_unique_shown(uuid, boolean),
  public.list_unique(uuid, bigint), public.buy_unique(uuid) to authenticated;

-- Первая коллекция: «Закатные часы». Ключи признаков связаны с рисунками в приложении (UniqueArt.tsx).
insert into public.unique_collections (id, title, description, supply)
values ('sunset_watch', 'Закатные часы', 'Коллекционные часы Sunset: у каждых своя модель, фон и узор.', 10000)
on conflict (id) do nothing;

insert into public.unique_traits (collection_id, kind, key, title, weight) values
  ('sunset_watch', 'model', 'pixel', 'Пиксель', 40),
  ('sunset_watch', 'model', 'classic', 'Классика', 30),
  ('sunset_watch', 'model', 'neon', 'Неон', 20),
  ('sunset_watch', 'model', 'gold', 'Золото', 10),
  ('sunset_watch', 'backdrop', 'ash', 'Пепельный', 20),
  ('sunset_watch', 'backdrop', 'moss', 'Мох', 15),
  ('sunset_watch', 'backdrop', 'sand', 'Песок', 15),
  ('sunset_watch', 'backdrop', 'ocean', 'Океан', 14),
  ('sunset_watch', 'backdrop', 'rose', 'Роза', 12),
  ('sunset_watch', 'backdrop', 'plum', 'Слива', 10),
  ('sunset_watch', 'backdrop', 'sunset', 'Закатный', 8),
  ('sunset_watch', 'backdrop', 'midnight', 'Полночь', 6),
  ('sunset_watch', 'symbol', 'star', 'Звезда', 24),
  ('sunset_watch', 'symbol', 'moon', 'Луна', 20),
  ('sunset_watch', 'symbol', 'heart', 'Сердце', 18),
  ('sunset_watch', 'symbol', 'diamond', 'Ромб', 14),
  ('sunset_watch', 'symbol', 'leaf', 'Лист', 10),
  ('sunset_watch', 'symbol', 'bolt', 'Молния', 8),
  ('sunset_watch', 'symbol', 'sun', 'Солнце', 6)
on conflict do nothing;

-- Обычный подарок «Часы»: купить, потом улучшить до уникального (цену можно менять через update public.gifts).
insert into public.gifts (id, title, description, image_url, price, collection, upgrade_price)
values ('sunset_watch', 'Часы', 'Обычный подарок. Его можно улучшить до уникальных часов с редкой моделью, фоном и узором.', '', 100, 'sunset_watch', 50)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
