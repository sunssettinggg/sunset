-- Sunset: свои стикеры и GIF (панель эмодзи / стикеров / GIF в чате).

-- 1. Хранилище файлов. Публичное чтение по случайным ссылкам; загружать можно только в свою папку.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 8388608, array['image/png', 'image/webp', 'image/gif', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/png', 'image/webp', 'image/gif', 'image/jpeg'];

drop policy if exists stickers_upload_own on storage.objects;
create policy stickers_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists stickers_delete_own on storage.objects;
create policy stickers_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Коллекция пользователя.
create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('sticker', 'gif')),
  path text not null check (path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  created_at timestamptz not null default now(),
  unique (user_id, kind, path)
);
create index if not exists user_stickers_user_idx on public.user_stickers (user_id, kind, created_at desc);

alter table public.user_stickers enable row level security;
drop policy if exists user_stickers_select on public.user_stickers;
drop policy if exists user_stickers_insert on public.user_stickers;
drop policy if exists user_stickers_delete on public.user_stickers;
create policy user_stickers_select on public.user_stickers for select to authenticated using (user_id = auth.uid());
create policy user_stickers_insert on public.user_stickers for insert to authenticated with check (user_id = auth.uid());
create policy user_stickers_delete on public.user_stickers for delete to authenticated using (user_id = auth.uid());
revoke all on public.user_stickers from anon;
grant select, insert, delete on public.user_stickers to authenticated;

-- Не больше 300 штук каждого вида на человека.
create or replace function public.user_stickers_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.user_stickers where user_id = new.user_id and kind = new.kind) >= 300 then
    raise exception 'sticker limit';
  end if;
  return new;
end $$;
drop trigger if exists user_stickers_limit on public.user_stickers;
create trigger user_stickers_limit before insert on public.user_stickers for each row execute function public.user_stickers_limit();

-- 3. В сообщениях появляются типы вложений «sticker» и «gif».
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'public.messages'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%attachment_type%'
  loop
    execute format('alter table public.messages drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.messages add constraint messages_attachment_type_chk
  check (attachment_type is null or attachment_type in ('image', 'file', 'voice', 'sticker', 'gif'));

notify pgrst, 'reload schema';
