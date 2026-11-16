// SUNSET срез 18. Запуск: node setup18.mjs
// Что делает:
//  1) аватарки отправителей рядом с сообщениями в группах (как в Telegram);
//  2) галочка рядом с именем в шапке чата и над сообщениями в группах;
//  3) в окне своего профиля показывает, что твой аккаунт подтверждён.
// Требует, чтобы setup17 уже был применён (колонка verified и типы).
// Существующие файлы патчатся точечно; если якорь не найден, ничего не записывается.
// Старые версии сохраняются в .setup-backups/setup18/

import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

if (!existsSync('package.json') || !existsSync('src')) {
  console.error('ОШИБКА: запусти этот файл внутри папки sunset-app (где лежит package.json).')
  process.exit(1)
}

// ---------- проверка, что setup17 уже применён ----------
const typesOk = existsSync('src/lib/types.ts') && readFileSync('src/lib/types.ts', 'utf8').includes('verified?: boolean')
const apiOk = existsSync('src/features/chat/api.ts') && readFileSync('src/features/chat/api.ts', 'utf8').includes('channel_id, verified')
if (!typesOk || !apiOk) {
  console.error('ОШИБКА: сначала нужно применить setup17.mjs (галочка verified в types.ts и api.ts не найдена).')
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

newFiles['src/features/verified/useMyVerified.ts'] = `import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Подтверждён ли текущий пользователь (не зависит от того, какие поля грузит App).
export function useMyVerified(userId: string): boolean {
  const [verified, setVerified] = useState(false)
  useEffect(() => {
    let active = true
    void supabase.from('profiles').select('verified').eq('id', userId).single()
      .then(({ data }) => {
        if (active) setVerified(!!(data as { verified: boolean | null } | null)?.verified)
      })
    return () => { active = false }
  }, [userId])
  return verified
}
`

newFiles['src/features/chat/useSenders.ts'] = `import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Message } from '../../lib/types'

export interface SenderProfile { display_name: string; avatar_url: string | null; verified: boolean }

interface Row { id: string; display_name: string; avatar_url: string | null; verified: boolean | null }

// Имя, аватарка и галочка авторов сообщений. Каждый автор запрашивается один раз.
export function useSenderProfiles(messages: Message[]): Record<string, SenderProfile> {
  const [people, setPeople] = useState<Record<string, SenderProfile>>({})
  const asked = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.sender_id))].filter((id) => !asked.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => asked.current.add(id))
    void supabase.from('profiles').select('id, display_name, avatar_url, verified').in('id', missing)
      .then(({ data, error }) => {
        if (error || !data) {
          missing.forEach((id) => asked.current.delete(id))
          return
        }
        setPeople((prev) => {
          const next = { ...prev }
          for (const p of data as Row[]) {
            next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, verified: !!p.verified }
          }
          return next
        })
      })
  }, [messages])

  return people
}
`

// ---------- точечные патчи существующих файлов ----------
// [файл, маркер "уже применено", [[якорь, замена], ...]]
const patches = [
  ['src/features/chat/ChatView.tsx', 'useSenderProfiles', [
    [`import ChatAvatar from './ChatAvatar'`,
     `import ChatAvatar from './ChatAvatar'\nimport Avatar from './Avatar'\nimport VerifiedBadge from '../verified/VerifiedBadge'\nimport { useSenderProfiles } from './useSenders'`],
    [`const names = useProfileNames(messages)`,
     `const names = useProfileNames(messages)\n  const people = useSenderProfiles(messages)`],
    [`<div className="truncate text-sm font-medium">{chat.name}</div>`,
     `<div className="flex items-center gap-1 text-sm font-medium"><span className="truncate">{chat.name}</span>{chat.verified && <VerifiedBadge />}</div>`],
    [`{messages.map((m) => {`,
     `{messages.map((m, idx) => {`],
    [`const ticks = mine && direct`,
     `const ticks = mine && direct\n          const showAvatar = !mine && chat.kind === 'group'\n          const lastOfRun = messages[idx + 1]?.sender_id !== m.sender_id\n          const sender = people[m.sender_id]`],
    [`<div className="relative max-w-[75%]">`,
     `{showAvatar && (\n              <div className="mr-2 flex w-8 shrink-0 self-end">\n                {lastOfRun && <Avatar name={sender?.display_name ?? names[m.sender_id] ?? '?'} url={sender?.avatar_url ?? null} size={32} />}\n              </div>\n            )}\n            <div className="relative max-w-[75%]">`],
    [`<div className="mb-1 text-xs font-medium text-accent">{names[m.sender_id] ?? '…'}</div>`,
     `<div className="mb-1 flex items-center gap-1 text-xs font-medium text-accent"><span className="truncate">{names[m.sender_id] ?? '…'}</span>{sender?.verified && <VerifiedBadge size={12} />}</div>`],
  ]],

  ['src/features/profile/ProfileModal.tsx', 'useMyVerified', [
    [`import Avatar from '../chat/Avatar'`,
     `import Avatar from '../chat/Avatar'\nimport VerifiedBadge from '../verified/VerifiedBadge'\nimport { useMyVerified } from '../verified/useMyVerified'`],
    [`const fileRef = useRef<HTMLInputElement>(null)`,
     `const fileRef = useRef<HTMLInputElement>(null)\n  const verified = useMyVerified(me.id)`],
    [`{error && <p className="text-sm text-pink">{error}</p>}`,
     `{verified && (\n          <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-muted">\n            <VerifiedBadge size={16} className="mt-0.5" />\n            <span>Ваш аккаунт подтверждён как официальный представителями Sunset.</span>\n          </div>\n        )}\n        {error && <p className="text-sm text-pink">{error}</p>}`],
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
const backupDir = join('.setup-backups', 'setup18')
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
console.log('Откат: старые версии файлов лежат в .setup-backups/setup18/ (или git restore до коммита).')
