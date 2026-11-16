import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Copy, Lock, LogOut, Trash2, X } from 'lucide-react'
import type { ChatItem, Member, Profile } from '../../lib/types'
import { plural } from '../../lib/format'
import { addMember, fetchMembers, getInviteCode, removeMember, searchProfiles, setProfileChannel } from './api'
import Avatar from './Avatar'
import ChatAvatar from './ChatAvatar'

interface Props {
  chat: ChatItem
  me: Profile
  muted: boolean
  onToggleMute: () => void
  onProfileChanged: () => void
  onChanged: () => Promise<void>
  onLeft: () => void
  onClose: () => void
}

const action = 'flex flex-1 flex-col items-center gap-1 rounded-xl bg-surface py-3 text-xs transition hover:brightness-110'
const ROLE: Record<string, string> = { owner: 'владелец', admin: 'админ' }

export default function GroupPanel({ chat, me, muted, onToggleMute, onProfileChanged, onChanged, onLeft, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)
  const isAdmin = chat.role !== 'member'
  const isChannel = chat.kind === 'channel'
  const inProfile = me.channel_id === chat.id
  const fail = (e: unknown) => setError((e as Error).message)

  const load = useCallback(async () => {
    try { setMembers(await fetchMembers(chat.id)) } catch (e) { setError((e as Error).message) }
  }, [chat.id])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!query.trim() || !isAdmin) { setFound([]); return }
    const t = setTimeout(() => {
      searchProfiles(query).then((r) => setFound(r.filter((p) => !members.some((m) => m.user_id === p.id)))).catch(fail)
    }, 250)
    return () => clearTimeout(t)
  }, [query, isAdmin, members])

  async function run(fn: () => Promise<void>) {
    setError(null)
    try { await fn() } catch (e) { fail(e) }
  }

  const memberLabel = isChannel ? plural(members.length, ['подписчик', 'подписчика', 'подписчиков']) : plural(members.length, ['участник', 'участника', 'участников'])

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-80 flex-col gap-4 overflow-y-auto border-l border-line bg-bg2 p-5 lg:static lg:z-auto">
      <button onClick={onClose} title="Закрыть" className="self-end rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
      <div className="flex flex-col items-center gap-2 text-center">
        <ChatAvatar chat={chat} size={96} />
        <div className="text-lg font-semibold">{chat.name}</div>
        <div className="flex items-center gap-1 text-sm text-muted">
          {!chat.isPublic && <Lock size={12} />}
          {isChannel ? 'Канал' : 'Группа'} · {chat.isPublic ? 'открытый' : 'закрытый'} · {memberLabel}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onToggleMute} className={action}>
          {muted ? <BellOff size={20} /> : <Bell size={20} />}{muted ? 'Без звука' : 'Звук'}
        </button>
        {!(chat.role === 'owner') && (
          <button className={action} onClick={() => void run(async () => { await removeMember(chat.id, me.id); await onChanged(); onLeft() })}>
            <LogOut size={20} />Покинуть
          </button>
        )}
      </div>

      <div className="divide-y divide-line rounded-xl bg-surface">
        {chat.description && (
          <div className="px-4 py-3"><div className="text-xs text-muted">Описание</div><div className="text-sm whitespace-pre-wrap">{chat.description}</div></div>
        )}
        {chat.publicHandle && (
          <div className="px-4 py-3"><div className="text-xs text-muted">Ссылка для поиска</div><div className="text-sm">@{chat.publicHandle}</div></div>
        )}
        {isAdmin && (
          <div className="px-4 py-3">
            <div className="text-xs text-muted">Код приглашения</div>
            {code ? (
              <button className="flex items-center gap-2 font-mono text-sm" onClick={() => void navigator.clipboard.writeText(code)}>
                {code} <Copy size={14} className="text-muted" />
              </button>
            ) : (
              <button className="text-sm text-accent" onClick={() => void run(async () => setCode(await getInviteCode(chat.id)))}>Показать код</button>
            )}
          </div>
        )}
      </div>

      {isChannel && chat.role === 'owner' && (
        <button className="rounded-xl bg-surface py-2.5 text-sm transition hover:brightness-110"
          onClick={() => void run(async () => { await setProfileChannel(inProfile ? null : chat.id); onProfileChanged() })}>
          {inProfile ? 'Убрать из профиля' : 'Показывать в профиле'}
        </button>
      )}

      {isAdmin && (
        <div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Добавить по username"
            className="w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent" />
          {found.map((p) => (
            <button key={p.id} className="mt-1 flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface"
              onClick={() => void run(async () => { await addMember(chat.id, p.id); setQuery(''); await load() })}>
              <Avatar name={p.display_name} url={p.avatar_url} size={32} />
              <span className="flex-1 truncate text-sm">{p.display_name}</span><span className="text-xs text-accent">Добавить</span>
            </button>
          ))}
        </div>
      )}

      {(!isChannel || isAdmin) && (
        <div>
          <div className="mb-1 px-1 text-xs text-muted">{memberLabel}</div>
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 rounded-xl p-2">
              <Avatar name={m.display_name} url={m.avatar_url} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{m.display_name}</div>
                <div className="text-xs text-muted">@{m.username}{ROLE[m.role] ? ` · ${ROLE[m.role]}` : ''}</div>
              </div>
              {isAdmin && m.role !== 'owner' && m.user_id !== me.id && (
                <button title="Удалить" className="text-muted transition hover:text-pink"
                  onClick={() => void run(async () => { await removeMember(chat.id, m.user_id); await load() })}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-pink">{error}</p>}
    </aside>
  )
}
