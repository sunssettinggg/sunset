-- SUNSET slice 5: pins, forwarded label, wallets + market (Stars). Run in Supabase SQL Editor.

-- ===== messages / pins =====
alter table public.messages add column if not exists forwarded_from text check (char_length(forwarded_from) <= 100);

create table public.chat_pins (
  chat_id    uuid primary key references public.chats(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by  uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.chat_pins enable row level security;
create policy pins_select on public.chat_pins for select to authenticated using (public.is_chat_member(chat_id));
create policy pins_insert on public.chat_pins for insert to authenticated
  with check (public.is_chat_member(chat_id) and pinned_by = auth.uid()
    and exists (select 1 from public.messages m where m.id = chat_pins.message_id and m.chat_id = chat_pins.chat_id));
create policy pins_update on public.chat_pins for update to authenticated
  using (public.is_chat_member(chat_id))
  with check (public.is_chat_member(chat_id) and pinned_by = auth.uid()
    and exists (select 1 from public.messages m where m.id = chat_pins.message_id and m.chat_id = chat_pins.chat_id));
create policy pins_delete on public.chat_pins for delete to authenticated using (public.is_chat_member(chat_id));
alter publication supabase_realtime add table public.chat_pins;

-- ===== profile showcase (cosmetic, set only via functions) =====
alter table public.profiles add column if not exists showcase_number text check (char_length(showcase_number) <= 30);
alter table public.profiles add column if not exists showcase_handle text check (char_length(showcase_handle) <= 30);

-- ===== wallets & market =====
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stars   bigint not null default 0 check (stars >= 0)
);
create table public.market_items (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('number', 'username')),
  value      text not null check (char_length(value) between 2 and 30),
  owner_id   uuid references public.profiles(id) on delete set null, -- null = платформа
  price      bigint check (price > 0 and price <= 1000000000),       -- null = не продаётся
  created_at timestamptz not null default now(),
  unique (kind, value)
);
alter table public.wallets enable row level security;
alter table public.market_items enable row level security;
create policy wallets_select on public.wallets for select to authenticated using (user_id = auth.uid());
create policy market_select on public.market_items for select to authenticated
  using (price is not null or owner_id = auth.uid());
-- no insert/update/delete policies: all writes go through the functions below

create function public.my_stars() returns bigint language sql stable security invoker set search_path = '' as $$
  select coalesce((select stars from public.wallets where user_id = auth.uid()), 0);
$$;

create function public.market_buy(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); it public.market_items%rowtype;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select * into it from public.market_items where id = p_item for update;
  if not found or it.price is null then raise exception 'item not for sale'; end if;
  if it.owner_id = v_me then raise exception 'already yours'; end if;

  update public.wallets set stars = stars - it.price where user_id = v_me and stars >= it.price;
  if not found then raise exception 'not enough stars'; end if;

  if it.owner_id is not null then
    insert into public.wallets as w (user_id, stars) values (it.owner_id, it.price)
      on conflict (user_id) do update set stars = w.stars + excluded.stars;
    if it.kind = 'number' then
      update public.profiles set showcase_number = null where id = it.owner_id and showcase_number = it.value;
    else
      update public.profiles set showcase_handle = null where id = it.owner_id and showcase_handle = it.value;
    end if;
  end if;
  update public.market_items set owner_id = v_me, price = null where id = p_item;
end $$;

create function public.market_list(p_item uuid, p_price bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); it public.market_items%rowtype;
begin
  select * into it from public.market_items where id = p_item and owner_id = v_me for update;
  if not found then raise exception 'not your item'; end if;
  if p_price is null or p_price < 1 or p_price > 1000000000 then raise exception 'bad price'; end if;
  update public.market_items set price = p_price where id = p_item;
  if it.kind = 'number' then
    update public.profiles set showcase_number = null where id = v_me and showcase_number = it.value;
  else
    update public.profiles set showcase_handle = null where id = v_me and showcase_handle = it.value;
  end if;
end $$;

create function public.market_unlist(p_item uuid) returns void
language sql security definer set search_path = '' as $$
  update public.market_items set price = null where id = p_item and owner_id = auth.uid();
$$;

create function public.market_apply(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); it public.market_items%rowtype;
begin
  select * into it from public.market_items where id = p_item and owner_id = v_me;
  if not found then raise exception 'not your item'; end if;
  if it.price is not null then raise exception 'unlist first'; end if;
  if it.kind = 'number' then update public.profiles set showcase_number = it.value where id = v_me;
  else update public.profiles set showcase_handle = it.value where id = v_me; end if;
end $$;

create function public.market_unapply(p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'number' then update public.profiles set showcase_number = null where id = auth.uid();
  elsif p_kind = 'username' then update public.profiles set showcase_handle = null where id = auth.uid();
  end if;
end $$;

-- admin-only helper: run it yourself in SQL Editor, clients cannot call it
create function public.grant_stars_by_username(p_username text, p_amount bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles where username = lower(p_username);
  if v_id is null then raise exception 'user not found'; end if;
  insert into public.wallets as w (user_id, stars) values (v_id, greatest(p_amount, 0))
    on conflict (user_id) do update set stars = w.stars + greatest(p_amount, 0);
end $$;

revoke all on function public.grant_stars_by_username(text, bigint) from public, anon, authenticated;
revoke all on function public.my_stars(), public.market_buy(uuid), public.market_list(uuid, bigint),
  public.market_unlist(uuid), public.market_apply(uuid), public.market_unapply(text) from public, anon;
grant execute on function public.my_stars(), public.market_buy(uuid), public.market_list(uuid, bigint),
  public.market_unlist(uuid), public.market_apply(uuid), public.market_unapply(text) to authenticated;

-- ===== starter inventory owned by the platform =====
insert into public.market_items (kind, value, price)
select 'number', '+888 ' || lpad((1000 + n * 137)::text, 4, '0') || ' ' || lpad(((n * 7919) % 10000)::text, 4, '0'), 50 + n * 25
from generate_series(1, 12) as n on conflict (kind, value) do nothing;

insert into public.market_items (kind, value, price)
select 'username', u, greatest(500 - length(u) * 80, 50)
from unnest(array['ace','nova','luna','sol','kai','zen','aura','echo','vega','neo','rex','onyx']) as u
on conflict (kind, value) do nothing;

-- test: give yourself Stars (replace the username):
-- select public.grant_stars_by_username('gandon', 1000);
