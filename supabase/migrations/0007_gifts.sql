-- SUNSET: подарки. Магазин подарков за Звёзды; купленные лежат у владельца.

create table if not exists public.gifts (
  id          text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  title       text not null,
  description text not null default '',
  image_url   text not null,
  price       bigint not null check (price > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.user_gifts (
  id         uuid primary key default gen_random_uuid(),
  gift_id    text not null references public.gifts(id),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists user_gifts_owner_idx on public.user_gifts (owner_id, created_at desc);

alter table public.gifts enable row level security;
alter table public.user_gifts enable row level security;

drop policy if exists gifts_select on public.gifts;
create policy gifts_select on public.gifts for select to authenticated using (active);
drop policy if exists user_gifts_select on public.user_gifts;
create policy user_gifts_select on public.user_gifts for select to authenticated using (owner_id = auth.uid());

-- клиент только читает; записи делает функция buy_gift
revoke all on public.gifts, public.user_gifts from anon, authenticated;
grant select on public.gifts, public.user_gifts to authenticated;

create or replace function public.buy_gift(p_gift text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); g public.gifts%rowtype;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select * into g from public.gifts where id = p_gift and active;
  if not found then raise exception 'not for sale'; end if;
  update public.wallets set stars = stars - g.price where user_id = v_me and stars >= g.price;
  if not found then raise exception 'not enough stars'; end if;
  insert into public.user_gifts (gift_id, owner_id) values (g.id, v_me);
end $$;

revoke all on function public.buy_gift(text) from public, anon;
grant execute on function public.buy_gift(text) to authenticated;

-- первый подарок (цену можно поменять: update public.gifts set price = 100 where id = 'sunset_new_year';)
insert into public.gifts (id, title, description, image_url, price)
values ('sunset_new_year', 'Закатный новогодний подарок',
        'Магическая коробка, из которой вырывается закатное небо и гирлянды.',
        '/gifts/sunset-new-year.webp', 50)
on conflict (id) do nothing;
