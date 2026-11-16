// SUNSET срез 19: меню как в Telegram + до 3 аккаунтов с переключением. Запуск: node setup19.mjs
// Что делает:
//  1) кнопка настроек в NavRail теперь открывает боковое меню (аватарка, имя, список аккаунтов,
//     «Добавить аккаунт», Мой профиль, Создать группу/канал, Избранное, Настройки, Ночной режим);
//  2) прежнее окно «Настройки» открывается пунктом «Настройки»;
//  3) аккаунты хранятся в браузере (localStorage), переключение мгновенное, без перезагрузки.
// Требует, чтобы setup17 уже был применён (поле verified).
// Существующий файл (App.tsx) патчится точечно; если якорь не найден, ничего не записывается.
// Старые версии сохраняются в .setup-backups/setup19/

import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

if (!existsSync('package.json') || !existsSync('src')) {
  console.error('ОШИБКА: запусти этот файл внутри папки sunset-app (где лежит package.json).')
  process.exit(1)
}

const typesOk = existsSync('src/lib/types.ts') && readFileSync('src/lib/types.ts', 'utf8').includes('verified?: boolean')
if (!typesOk) {
  console.error('ОШИБКА: сначала нужно применить setup17.mjs (поле verified в types.ts не найдено).')
  process.exit(1)
}

// ---------- новые файлы (создаются, только если их ещё нет) ----------
const newFiles = {}

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

newFiles['src/features/auth/accounts.ts'] = `import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export const MAX_ACCOUNTS = 3
const KEY = 'sunset.accounts'
const RETURN_KEY = 'sunset.returnTo'

export interface SavedAccount {
  id: string
  access_token: string
  refresh_token: string
  display_name: string
  username: string
  avatar_url: string | null
}

export function readAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(list)) return []
    return list.filter((a): a is SavedAccount =>
      !!a && typeof a === 'object'
      && typeof (a as SavedAccount).id === 'string'
      && typeof (a as SavedAccount).refresh_token === 'string')
  } catch {
    return []
  }
}

function writeAccounts(list: SavedAccount[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

// Запоминаем (или обновляем) текущий аккаунт вместе с его сессией.
export function saveAccount(session: Session, me: Profile) {
  const entry: SavedAccount = {
    id: session.user.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    display_name: me.display_name,
    username: me.username,
    avatar_url: me.avatar_url,
  }
  const list = readAccounts()
  const i = list.findIndex((a) => a.id === entry.id)
  if (i >= 0) list[i] = entry
  else if (list.length < MAX_ACCOUNTS) list.push(entry)
  writeAccounts(list)
  try { sessionStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
}

// Токены обновляются автоматически; храним свежие, иначе старый refresh-токен станет недействительным.
function updateTokens(session: Session) {
  const list = readAccounts()
  const i = list.findIndex((a) => a.id === session.user.id)
  if (i < 0) return
  list[i] = { ...list[i], access_token: session.access_token, refresh_token: session.refresh_token }
  writeAccounts(list)
}

export function removeAccount(id: string) {
  writeAccounts(readAccounts().filter((a) => a.id !== id))
}

export function useAccountSync() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        updateTokens(session)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])
}

// Возвращает текст ошибки или null, если переключение удалось.
export async function switchAccount(id: string): Promise<string | null> {
  const acc = readAccounts().find((a) => a.id === id)
  if (!acc) return 'Аккаунт не найден.'
  const { error } = await supabase.auth.setSession({ access_token: acc.access_token, refresh_token: acc.refresh_token })
  if (error) {
    removeAccount(id)
    return 'Сессия этого аккаунта истекла. Войди в него заново.'
  }
  return null
}

// Выходим из текущего аккаунта только на этом устройстве, на экране входа можно добавить другой.
export async function addAccountFlow(currentId: string) {
  try { sessionStorage.setItem(RETURN_KEY, currentId) } catch { /* ignore */ }
  await supabase.auth.signOut({ scope: 'local' })
}

export function getReturnTo(): string | null {
  try {
    const id = sessionStorage.getItem(RETURN_KEY)
    return id && readAccounts().some((a) => a.id === id) ? id : null
  } catch {
    return null
  }
}

// Обычный выход: убираем аккаунт из списка и, если есть другой, переключаемся на него.
export async function signOutCurrent(id: string) {
  removeAccount(id)
  try { sessionStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
  await supabase.auth.signOut()
  const next = readAccounts()[0]
  if (next) await switchAccount(next.id)
}
`

newFiles['src/features/auth/AuthGate.tsx'] = `import { useState } from 'react'
import AuthPage from './AuthPage'
import { getReturnTo, switchAccount } from './accounts'

// Экран входа. Если человек пришёл из меню «Добавить аккаунт», показываем кнопку возврата.
export default function AuthGate() {
  const back = getReturnTo()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goBack(id: string) {
    setBusy(true)
    setError(null)
    void switchAccount(id).then((err) => {
      if (err) setError(err)
      setBusy(false)
    })
  }

  return (
    <>
      <AuthPage />
      {back && (
        <div className="fixed top-4 left-4 z-50 flex flex-col items-start gap-2">
          <button type="button" disabled={busy} onClick={() => goBack(back)}
            className="rounded-xl bg-surface px-4 py-2 text-sm transition hover:brightness-125 disabled:opacity-50">
            ← Вернуться в аккаунт
          </button>
          {error && <p className="text-xs text-pink">{error}</p>}
        </div>
      )}
    </>
  )
}
`

newFiles['src/features/auth/AccountMenu.tsx'] = `import { useState, type ReactNode } from 'react'
import { Bookmark, Check, ChevronDown, ChevronUp, Loader2, Megaphone, Moon, Plus, Settings, User, Users } from 'lucide-react'
import type { Profile } from '../../lib/types'
import Avatar from '../chat/Avatar'
import VerifiedBadge from '../verified/VerifiedBadge'
import { MAX_ACCOUNTS, readAccounts } from './accounts'

interface Props {
  me: Profile
  dark: boolean
  canOpenSaved: boolean
  onClose: () => void
  onProfile: () => void
  onSettings: () => void
  onNewChat: () => void
  onSaved: () => void
  onToggleTheme: () => void
  onSwitch: (id: string) => Promise<string | null>
  onAddAccount: () => void
}

interface Row { id: string; name: string; username: string; avatar: string | null }

function Item({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-surface disabled:opacity-40">
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  )
}

export default function AccountMenu({
  me, dark, canOpenSaved, onClose, onProfile, onSettings, onNewChat, onSaved, onToggleTheme, onSwitch, onAddAccount,
}: Props) {
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const stored = readAccounts().filter((a) => a.id !== me.id)
  const rows: Row[] = [
    { id: me.id, name: me.display_name, username: me.username, avatar: me.avatar_url },
    ...stored.map((a) => ({ id: a.id, name: a.display_name, username: a.username, avatar: a.avatar_url })),
  ]

  async function pick(id: string) {
    if (id === me.id || busyId) return
    setBusyId(id)
    setError(null)
    const err = await onSwitch(id)
    if (err) { setError(err); setBusyId(null) }
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-black/50" onClick={onClose}>
      <aside className="flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-bg2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-6 pb-3">
          <Avatar name={me.display_name} url={me.avatar_url} size={56} />
          <button type="button" onClick={() => setOpen(!open)} className="mt-3 flex w-full items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-base font-semibold">
                <span className="truncate">{me.display_name}</span>
                {me.verified && <VerifiedBadge size={16} />}
              </span>
              <span className="block truncate text-xs text-muted">@{me.username}</span>
            </span>
            {open ? <ChevronUp size={18} className="shrink-0 text-muted" /> : <ChevronDown size={18} className="shrink-0 text-muted" />}
          </button>
        </div>

        {open && (
          <div className="border-y border-line px-2 py-2">
            {rows.map((r) => (
              <button key={r.id} type="button" disabled={busyId !== null} onClick={() => void pick(r.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface disabled:opacity-60">
                <span className={'rounded-full ' + (r.id === me.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg2' : '')}>
                  <Avatar name={r.name} url={r.avatar} size={36} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted">@{r.username}</span>
                </span>
                {r.id === me.id && <Check size={16} className="shrink-0 text-accent" />}
                {busyId === r.id && <Loader2 size={16} className="shrink-0 animate-spin text-muted" />}
              </button>
            ))}
            {rows.length < MAX_ACCOUNTS && (
              <button type="button" onClick={onAddAccount}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent"><Plus size={18} /></span>
                Добавить аккаунт
              </button>
            )}
            {error && <p className="px-3 pt-2 text-xs text-pink">{error}</p>}
          </div>
        )}

        <nav className="px-2 py-2">
          <Item icon={<User size={20} />} label="Мой профиль" onClick={onProfile} />
          <Item icon={<Users size={20} />} label="Создать группу" onClick={onNewChat} />
          <Item icon={<Megaphone size={20} />} label="Создать канал" onClick={onNewChat} />
          <Item icon={<Bookmark size={20} />} label="Избранное" onClick={onSaved} disabled={!canOpenSaved} />
          <Item icon={<Settings size={20} />} label="Настройки" onClick={onSettings} />
          <div className="flex items-center gap-4 rounded-xl px-3 py-3 text-sm">
            <span className="text-muted"><Moon size={20} /></span>
            <span className="flex-1">Ночной режим</span>
            <button type="button" role="switch" aria-checked={dark} onClick={onToggleTheme}
              className={'relative h-6 w-10 rounded-full transition ' + (dark ? 'bg-accent' : 'bg-surface')}>
              <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (dark ? 'left-[18px]' : 'left-0.5')} />
            </button>
          </div>
        </nav>

        <div className="mt-auto px-5 py-4 text-xs text-muted">Sunset Messenger</div>
      </aside>
    </div>
  )
}
`

// ---------- точечные патчи существующих файлов ----------
// [файл, маркер "уже применено", [[якорь, замена], ...]]
const patches = [
  ['src/App.tsx', 'AccountMenu', [
    [`import AuthPage from './features/auth/AuthPage'`,
     `import AuthGate from './features/auth/AuthGate'\nimport AccountMenu from './features/auth/AccountMenu'\nimport { addAccountFlow, saveAccount, signOutCurrent, switchAccount, useAccountSync } from './features/auth/accounts'`],
    [`const PROFILE_SELECT = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id'`,
     `const PROFILE_SELECT = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id, verified'`],
    [`const [settingsOpen, setSettingsOpen] = useState(false)`,
     `const [settingsOpen, setSettingsOpen] = useState(false)\n  const [menuOpen, setMenuOpen] = useState(false)`],
    [`useEffect(() => { loadMe() }, [loadMe])`,
     `useEffect(() => { loadMe() }, [loadMe])\n  useEffect(() => {\n    if (!me) return\n    void supabase.auth.getSession().then(({ data }) => {\n      if (data.session) saveAccount(data.session, me)\n    })\n  }, [me])`],
    [`onOpenSettings={() => setSettingsOpen(true)}`,
     `onOpenSettings={() => setMenuOpen(true)}`],
    [`onSignOut={() => void supabase.auth.signOut()}`,
     `onSignOut={() => void signOutCurrent(me.id)}`],
    [`{profileOpen && <ProfileModal`,
     `{menuOpen && <AccountMenu me={me} dark={theme === 'dark'} canOpenSaved={chats.some((c) => c.kind === 'saved')}\n        onClose={() => setMenuOpen(false)}\n        onProfile={() => { setMenuOpen(false); setProfileOpen(true) }}\n        onSettings={() => { setMenuOpen(false); setSettingsOpen(true) }}\n        onNewChat={() => { setMenuOpen(false); setNewChatOpen(true) }}\n        onSaved={() => {\n          const s = chats.find((c) => c.kind === 'saved')\n          setMenuOpen(false)\n          if (s) { setView('chats'); setSelectedId(s.id) }\n        }}\n        onToggleTheme={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}\n        onSwitch={(id) => switchAccount(id)}\n        onAddAccount={() => { setMenuOpen(false); void addAccountFlow(me.id) }} />}\n      {profileOpen && <ProfileModal`],
    [`const { session, loading } = useSession()`,
     `const { session, loading } = useSession()\n  useAccountSync()`],
    [`return session ? <Messenger userId={session.user.id} /> : <AuthPage />`,
     `return session ? <Messenger key={session.user.id} userId={session.user.id} /> : <AuthGate />`],
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
const backupDir = join('.setup-backups', 'setup19')
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

console.log('\nГотово. SQL выполнять не нужно.')
console.log('Проверь: npm run build && npm run lint, затем коммит и пуш.')
console.log('Откат: старые версии файлов лежат в .setup-backups/setup19/ (или git restore до коммита).')
