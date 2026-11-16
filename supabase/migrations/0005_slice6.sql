-- SUNSET slice 6: up to 10 collectible usernames, change main username, search by both.

alter table public.profiles add column if not exists handles text[] not null default '{}'
  check (cardinality(handles) <= 10);

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'showcase_handle') then
    update public.profiles set handles = array[showcase_handle] where showcase_handle is not null;
    alter table public.profiles drop column showcase_handle;
  end if;
end $$;

-- username is now changed only through change_username() (checks collisions with collectibles)
revoke update on public.profiles from authenticated;
grant update (display_name, bio, avatar_url) on public.profiles to authenticated;

create or replace function public.change_username(p_new text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v text := lower(trim(p_new));
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid username'; end if;
  if exists (select 1 from public.profiles where username = v and id <> v_me) then raise exception 'username taken'; end if;
  if exists (select 1 from public.market_items where kind = 'username' and value = v) then raise exception 'username taken'; end if;
  update public.profiles set username = v where id = v_me;
end $$;

-- registration may not take a collectible username either
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid username'; end if;
  if exists (select 1 from public.market_items where kind = 'username' and value = v_username) then
    raise exception 'username reserved';
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_username));
  return new;
end $$;

-- market functions, reworked for the handles array
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
  update public.market_items set owner_id = v_me, price = null where id = p_item;
end $$;

create or replace function public.market_list(p_item uuid, p_price bigint) returns void
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
    update public.profiles set handles = array_remove(handles, it.value) where id = v_me;
  end if;
end $$;

create or replace function public.market_apply(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); it public.market_items%rowtype;
begin
  select * into it from public.market_items where id = p_item and owner_id = v_me for update;
  if not found then raise exception 'not your item'; end if;
  if it.price is not null then raise exception 'unlist first'; end if;
  if it.kind = 'number' then
    update public.profiles set showcase_number = it.value where id = v_me;
  else
    if exists (select 1 from public.profiles where username = it.value) then raise exception 'username in use'; end if;
    if (select cardinality(handles) from public.profiles where id = v_me) >= 10 then raise exception 'handle limit'; end if;
    update public.profiles set handles = array_append(handles, it.value) where id = v_me and not (it.value = any(handles));
  end if;
end $$;

drop function if exists public.market_unapply(text);
create or replace function public.market_unapply(p_item uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); it public.market_items%rowtype;
begin
  select * into it from public.market_items where id = p_item and owner_id = v_me;
  if not found then return; end if;
  if it.kind = 'number' then
    update public.profiles set showcase_number = null where id = v_me and showcase_number = it.value;
  else
    update public.profiles set handles = array_remove(handles, it.value) where id = v_me;
  end if;
end $$;

-- search by main username OR any collectible username
create or replace function public.search_profiles(p_query text) returns setof public.profiles
language sql stable security invoker set search_path = '' as $$
  with q as (
    select '%' || replace(replace(replace(lower(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  )
  select p.* from public.profiles p, q
  where p.id <> auth.uid() and char_length(p_query) between 1 and 30
    and (p.username like q.pat or exists (select 1 from unnest(p.handles) h where h like q.pat))
  order by p.username
  limit 8;
$$;

revoke all on function public.change_username(text), public.market_unapply(uuid), public.search_profiles(text) from public, anon;
grant execute on function public.change_username(text), public.market_unapply(uuid), public.search_profiles(text) to authenticated;
