-- Sunset: вторая коллекция уникальных подарков — «Закатные сигары».
insert into public.unique_collections (id, title, description, supply)
values ('sunset_cigar', 'Закатные сигары', 'Коллекционные сигары Sunset: у каждой своя модель, фон и узор.', 10000)
on conflict (id) do nothing;

insert into public.unique_traits (collection_id, kind, key, title, weight) values
  ('sunset_cigar', 'model', 'ruby', 'Рубин', 40),
  ('sunset_cigar', 'model', 'havana', 'Гавана', 30),
  ('sunset_cigar', 'model', 'maduro', 'Мадуро', 20),
  ('sunset_cigar', 'model', 'emerald', 'Изумруд', 10),
  ('sunset_cigar', 'backdrop', 'cyber', 'Киберпанк', 22),
  ('sunset_cigar', 'backdrop', 'steel', 'Сталь', 20),
  ('sunset_cigar', 'backdrop', 'jade', 'Нефрит', 16),
  ('sunset_cigar', 'backdrop', 'ocean', 'Океан', 14),
  ('sunset_cigar', 'backdrop', 'ember', 'Жар', 12),
  ('sunset_cigar', 'backdrop', 'wine', 'Вино', 10),
  ('sunset_cigar', 'backdrop', 'midnight', 'Полночь', 6),
  ('sunset_cigar', 'symbol', 'drop', 'Капля', 30),
  ('sunset_cigar', 'symbol', 'ring', 'Кольцо', 26),
  ('sunset_cigar', 'symbol', 'flame', 'Пламя', 22),
  ('sunset_cigar', 'symbol', 'crown', 'Корона', 18),
  ('sunset_cigar', 'symbol', 'cap', 'Кепка', 4)
on conflict do nothing;

insert into public.gifts (id, title, description, image_url, price, collection, upgrade_price)
values ('sunset_cigar', 'Сигара', 'Обычный подарок. Его можно улучшить до уникальной сигары с редкой моделью, фоном и узором.', '', 150, 'sunset_cigar', 75)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
