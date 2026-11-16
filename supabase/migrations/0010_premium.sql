-- SUNSET Premium: подписка за Звёзды. Цены ниже должны совпадать с PremiumPage.tsx.

alter table public.profiles add column if not exists premium_until timestamptz;

-- Клиент не может выдать премиум себе: у authenticated нет права обновлять эту колонку
-- (права на profiles уже ограничены: display_name, bio, avatar_url). Меняется только функциями ниже.

create or replace function public.buy_premium(p_months int) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_price bigint; v_base timestamptz; v_until timestamptz;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  v_price := case p_months when 1 then 300 when 12 then 2400 else null end;
  if v_price is null then raise exception 'bad plan'; end if;

  update public.wallets set stars = stars - v_price where user_id = v_me and stars >= v_price;
  if not found then raise exception 'not enough stars'; end if;

  select greatest(coalesce(premium_until, now()), now()) into v_base from public.profiles where id = v_me;
  v_until := v_base + make_interval(months => p_months);
  update public.profiles set premium_until = v_until where id = v_me;
  return v_until;
end $$;

revoke all on function public.buy_premium(int) from public, anon;
grant execute on function public.buy_premium(int) to authenticated;

-- Выдать премиум вручную (только из SQL Editor), например для проверки:
--   select public.grant_premium('sunset', 30);
create or replace function public.grant_premium(p_username text, p_days int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
     set premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => p_days)
   where username = lower(p_username);
  if not found then raise exception 'user not found'; end if;
end $$;
revoke all on function public.grant_premium(text, int) from public, anon, authenticated;
