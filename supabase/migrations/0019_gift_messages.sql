-- Sunset: подарок в чате отправляется как карточка (тип вложения «gift»).
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
  check (attachment_type is null or attachment_type in ('image', 'file', 'voice', 'sticker', 'gif', 'gift'));

notify pgrst, 'reload schema';
