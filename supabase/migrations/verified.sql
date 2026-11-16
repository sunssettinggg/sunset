-- SUNSET: галочка «официальный аккаунт». Выполни в Supabase SQL Editor ДО деплоя кода.
alter table public.profiles
  add column if not exists verified boolean not null default false;

-- Клиент не может выдать галочку себе: значение меняется только из SQL Editor
-- или service_role (там auth.uid() is null).
create or replace function public.profiles_protect_verified()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.verified := false;
    else
      new.verified := old.verified;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_verified on public.profiles;
create trigger profiles_protect_verified
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_verified();

-- Выдать или снять галочку (только из SQL Editor):
--   select public.set_verified('username');
--   select public.set_verified('username', false);
create or replace function public.set_verified(p_username text, p_value boolean default true)
returns void language sql security invoker set search_path = '' as $$
  update public.profiles set verified = p_value where username = p_username;
$$;
revoke all on function public.set_verified(text, boolean) from public, anon, authenticated;
