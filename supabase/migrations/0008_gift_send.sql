-- SUNSET: дарим подарки друзьям, показываем их в профиле, можно скрыть.

alter table public.user_gifts add column if not exists from_id uuid references public.profiles(id) on delete set null;
alter table public.user_gifts add column if not exists note text check (char_length(note) <= 200);
alter table public.user_gifts add column if not exists shown boolean not null default false;
alter table public.user_gifts add column if not exists sent_at timestamptz;

-- каталог читают все (нужен и для уже полученных подарков, даже если их сняли с продажи)
drop policy if exists gifts_select on public.gifts;
create policy gifts_select on public.gifts for select to authenticated using (true);

-- свои подарки видны мне, показанные в профиле — всем
drop policy if exists user_gifts_select on public.user_gifts;
create policy user_gifts_select on public.user_gifts for select to authenticated
  using (owner_id = auth.uid() or shown);

create or replace function public.send_gift(p_ug uuid, p_to uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = v_me or not exists (select 1 from public.profiles where id = p_to) then
    raise exception 'bad recipient';
  end if;
  if p_note is not null and char_length(p_note) > 200 then raise exception 'bad note'; end if;
  update public.user_gifts
     set owner_id = p_to, from_id = v_me, note = nullif(trim(coalesce(p_note, '')), ''), shown = true, sent_at = now()
   where id = p_ug and owner_id = v_me;
  if not found then raise exception 'not your gift'; end if;
end $$;

create or replace function public.set_gift_shown(p_ug uuid, p_shown boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.user_gifts set shown = coalesce(p_shown, false) where id = p_ug and owner_id = auth.uid();
  if not found then raise exception 'not your gift'; end if;
end $$;

revoke all on function public.send_gift(uuid, uuid, text), public.set_gift_shown(uuid, boolean) from public, anon;
grant execute on function public.send_gift(uuid, uuid, text), public.set_gift_shown(uuid, boolean) to authenticated;
