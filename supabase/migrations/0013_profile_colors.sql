-- Sunset Premium: цвета имени, юзернейма и профиля.
alter table public.profiles add column if not exists name_color text;
alter table public.profiles add column if not exists username_color text;
alter table public.profiles add column if not exists profile_color text;

do $$ begin
  alter table public.profiles add constraint profiles_colors_fmt check (
    (name_color is null or name_color ~ '^#[0-9a-f]{6}$') and
    (username_color is null or username_color ~ '^#[0-9a-f]{6}$') and
    (profile_color is null or profile_color ~ '^#[0-9a-f]{6}$'));
exception when duplicate_object then null; end $$;

-- Менять цвета можно только через функцию и только с активным Premium.
-- null = сбросить цвет.
create or replace function public.set_profile_colors(p_name text, p_username text, p_profile text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_until timestamptz;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  select premium_until into v_until from public.profiles where id = v_me;
  if v_until is null or v_until <= now() then raise exception 'premium required'; end if;
  if (p_name is not null and p_name !~ '^#[0-9a-f]{6}$')
     or (p_username is not null and p_username !~ '^#[0-9a-f]{6}$')
     or (p_profile is not null and p_profile !~ '^#[0-9a-f]{6}$') then
    raise exception 'bad color';
  end if;
  update public.profiles set name_color = p_name, username_color = p_username, profile_color = p_profile where id = v_me;
end $$;

revoke all on function public.set_profile_colors(text, text, text) from public, anon;
grant execute on function public.set_profile_colors(text, text, text) to authenticated;

notify pgrst, 'reload schema';
