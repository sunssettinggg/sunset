-- SUNSET: история покупки коллекционных номеров/юзернеймов, карточка «кто владелец», поиск по номеру.

alter table public.market_items add column if not exists acquired_at timestamptz;
alter table public.market_items add column if not exists acquired_price bigint;

-- market_buy теперь запоминает, когда и за сколько куплен предмет
create or replace function public.market_buy(p_item uuid) returns void
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
      update public.profiles set handles = array_remove(handles, it.value) where id = it.owner_id;
    end if;
  end if;
  update public.market_items
     set owner_id = v_me, price = null, acquired_at = now(), acquired_price = it.price
   where id = p_item;
end $$;

-- Карточка предмета: только для того, что владелец сейчас показывает в профиле
create or replace function public.collectible_info(p_kind text, p_value text)
returns table (owner_name text, owner_username text, acquired_at timestamptz, acquired_price bigint)
language sql stable security definer set search_path = '' as $$
  select p.display_name, p.username, mi.acquired_at, mi.acquired_price
  from public.market_items mi
  join public.profiles p on p.id = mi.owner_id
  where auth.uid() is not null and mi.kind = p_kind and mi.value = p_value
    and ((mi.kind = 'username' and mi.value = any (p.handles))
      or (mi.kind = 'number' and p.showcase_number = mi.value))
  limit 1;
$$;
revoke all on function public.collectible_info(text, text) from public, anon;
grant execute on function public.collectible_info(text, text) to authenticated;

-- поиск: основной юзернейм, коллекционный юзернейм ИЛИ номер (по цифрам)
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
          and regexp_replace(coalesce(p.showcase_number, ''), '\D', '', 'g') like '%' || q.digits || '%'))
  order by p.username
  limit 8;
$$;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;
