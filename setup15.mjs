// SUNSET срез 17: галочка «официальный аккаунт». Запуск: node setup17.mjs
// Что делает: колонка profiles.verified (менять может только владелец через SQL Editor),
// галочка рядом с именем в списке чатов и в правой панели, плашка с пояснением в профиле.
// Безопасность: существующие файлы патчатся точечно; если якорь не найден, ничего не записывается.
// Старые версии сохраняются в .setup-backups/setup17/

import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

if (!existsSync('package.json') || !existsSync('src')) {
  console.error('ОШИБКА: запусти этот файл внутри папки sunset-app (где лежит package.json).')
  process.exit(1)
}

// ---------- новые файлы ----------
const newFiles = {}

newFiles['supabase/migrations/verified.sql'] = `-- SUNSET: галочка «официальный аккаунт». Выполни в Supabase SQL Editor ДО деплоя кода.
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
`

newFiles['src/features/verified/VerifiedBadge.tsx'] = `interface Props { size?: number; className?: string }

export default function VerifiedBadge({ size = 14, className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="Подтверждённый аккаунт"
      className={'inline-block shrink-0 ' + className}>
      <title>Этот аккаунт подтверждён как официальный представителями Sunset.</title>
      <circle cx="12" cy="12" r="11" fill="#34d399" />
      <path d="M7 12.6l3.2 3.2L17 9" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
`

// ---------- точечные патчи существующих файлов ----------
// [файл, маркер "уже применено", [[якорь, замена], ...]]
const patches = [
  ['src/lib/types.ts', 'verified?: boolean', [
    ['export interface Profile {', 'export interface Profile {\n  verified?: boolean'],
    ['export interface ChatItem {', 'export interface ChatItem {\n  verified?: boolean'],
  ]],

  ['src/features/chat/api.ts', 'channel_id, verified', [
    ["const PROFILE_COLS = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id'",
     "const PROFILE_COLS = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id, verified'"],
    ['otherId: direct ? (other?.id ?? null) : null,',
     'otherId: direct ? (other?.id ?? null) : null,\n      verified: direct ? (other?.verified ?? false) : false,'],
  ]],

  ['src/features/chat/Sidebar.tsx', 'VerifiedBadge', [
    ["import UsernameLine from './UsernameLine'",
     "import UsernameLine from './UsernameLine'\nimport VerifiedBadge from '../verified/VerifiedBadge'"],
    ['<span className="flex-1 truncate text-sm font-medium">{c.name}</span>',
     '<span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium"><span className="truncate">{c.name}</span>{c.verified && <VerifiedBadge />}</span>'],
  ]],

  ['src/features/chat/RightPanel.tsx', 'VerifiedBadge', [
    ["import UsernameLine from './UsernameLine'",
     "import UsernameLine from './UsernameLine'\nimport VerifiedBadge from '../verified/VerifiedBadge'"],
    ['<div className="text-lg font-semibold">{chat.name}</div>',
     '<div className="flex items-center justify-center gap-1.5 text-lg font-semibold"><span>{chat.name}</span>{chat.verified && <VerifiedBadge size={18} />}</div>'],
    ['{channel && (',
     '{chat.verified && (\n        <div className="flex items-start gap-2 rounded-xl bg-surface p-4 text-sm text-muted">\n          <VerifiedBadge size={16} className="mt-0.5" />\n          <span>Этот аккаунт подтверждён как официальный представителями Sunset.</span>\n        </div>\n      )}\n\n      {channel && ('],
  ]],
]

// ---------- фаза 1: считаем всё в памяти, ничего не пишем ----------
const problems = []
const planned = [] // [path, content, isNew]

for (const [path, content] of Object.entries(newFiles)) {
  if (existsSync(path)) { console.log('уже есть, пропускаю:', path); continue }
  planned.push([path, content, true])
}

for (const [path, marker, pairs] of patches) {
  if (!existsSync(path)) { problems.push(path + ': файл не найден'); continue }
  let src = readFileSync(path, 'utf8')
  if (src.includes(marker)) { console.log('уже применено, пропускаю:', path); continue }
  let ok = true
  for (const [from, to] of pairs) {
    const count = src.split(from).length - 1
    if (count !== 1) {
      problems.push(path + ': якорь найден ' + count + ' раз (нужно 1): ' + from.slice(0, 70))
      ok = false
      break
    }
    src = src.replace(from, () => to)
  }
  if (ok) planned.push([path, src, false])
}

if (problems.length > 0) {
  console.error('\nОШИБКА: ничего не записано, потому что файлы отличаются от ожидаемых:')
  for (const p of problems) console.error(' -', p)
  console.error('\nПришли мне актуальные версии этих файлов, и я подгоню патч.')
  process.exit(1)
}

// ---------- фаза 2: бэкапы и запись ----------
const backupDir = join('.setup-backups', 'setup17')
for (const [path, content, isNew] of planned) {
  if (!isNew) {
    const b = join(backupDir, path)
    mkdirSync(dirname(b), { recursive: true })
    writeFileSync(b, readFileSync(path, 'utf8'), 'utf8')
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
  console.log(isNew ? 'создан ' : 'изменён', path)
}

if (existsSync('.gitignore') && !readFileSync('.gitignore', 'utf8').includes('.setup-backups')) {
  appendFileSync('.gitignore', '\n.setup-backups\n')
}

console.log('\nГотово. Порядок дальнейших действий:')
console.log('1) Выполни supabase/migrations/verified.sql в Supabase SQL Editor (ДО деплоя!).')
console.log("2) Выдай галочку:  select public.set_verified('username');")
console.log('3) npm run build && npm run lint, затем коммит и пуш.')
console.log('Откат: старые версии файлов лежат в .setup-backups/setup17/')
