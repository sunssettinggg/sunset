import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from 'react'
import { BellOff, Pin, Plus, Search } from 'lucide-react'
import type { ChatItem, LastMessage, Profile, PublicChat } from '../../lib/types'
import { plural } from '../../lib/format'
import { createDirectChat, joinChat, searchProfiles, searchPublicChats } from './api'
import Avatar from './Avatar'
import ChatAvatar from './ChatAvatar'
import UsernameLine from './UsernameLine'
import VerifiedBadge from '../verified/VerifiedBadge'
import PremiumBadge from '../premium/PremiumBadge'
import ColoredName from '../premium/ColoredName'
import { ChatConfirm, ChatContextMenu } from './ChatContextMenu'
import { clearHistory, deleteChat, getPinned, setPinned } from './chatManage'

interface Props {
  myId: string
  chats: ChatItem[]
  loading: boolean
  selectedId: string | null
  unread: Record<string, number>
  last: Record<string, LastMessage>
  online: Set<string>
  muted: string[]
  onToggleMute: (id: string) => void
  onChatChanged: (id: string, what: 'cleared' | 'deleted') => void
  onSelect: (id: string) => void
  onChatCreated: () => Promise<void>
  onNewChat: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function Sidebar({ myId, chats, loading, selectedId, unread, last, online, muted, onToggleMute, onChatChanged, onSelect, onChatCreated, onNewChat }: Props) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Profile[]>([])
  const [publics, setPublics] = useState<PublicChat[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pinned, setPinnedState] = useState<string[]>(getPinned)
  const [menu, setMenu] = useState<{ x: number; y: number; chat: ChatItem } | null>(null)
  const [confirm, setConfirm] = useState<{ mode: 'clear' | 'delete'; chat: ChatItem } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressed = useRef(false)

  useEffect(() => {
    if (!query.trim()) { setPeople([]); setPublics([]); return }
    const t = setTimeout(() => {
      Promise.all([searchProfiles(query), searchPublicChats(query)])
        .then(([p, c]) => { setPeople(p); setPublics(c) })
        .catch((e: Error) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function startChat(other: Profile) {
    try {
      const id = await createDirectChat(other.id)
      await onChatCreated()
      onSelect(id)
      setQuery('')
    } catch (e) { setError((e as Error).message) }
  }

  async function openPublic(c: PublicChat) {
    try {
      if (!c.joined) { await joinChat(c.id); await onChatCreated() }
      onSelect(c.id)
      setQuery('')
    } catch (e) { setError((e as Error).message) }
  }

  const rowCls = 'flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface'

  // Удалённые чаты скрыты, пока не придёт сообщение новее момента удаления. Закреплённые идут сразу после «Избранного».
  const visibleChats = chats.filter((c) => !c.hiddenAt || (last[c.id] && last[c.id].created_at > c.hiddenAt))
  const orderedChats = [
    ...visibleChats.filter((c) => c.kind === 'saved'),
    ...visibleChats.filter((c) => c.kind !== 'saved' && pinned.includes(c.id)),
    ...visibleChats.filter((c) => c.kind !== 'saved' && !pinned.includes(c.id)),
  ]

  function openMenu(e: MouseEvent, chat: ChatItem) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, chat })
  }
  function startPress(e: TouchEvent, chat: ChatItem) {
    const t = e.touches[0]
    longPressed.current = false
    pressTimer.current = setTimeout(() => { longPressed.current = true; setMenu({ x: t.clientX, y: t.clientY, chat }) }, 450)
  }
  function cancelPress() { clearTimeout(pressTimer.current) }
  function togglePin(id: string) {
    const next = pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id]
    setPinned(next)
    setPinnedState(next)
  }
  async function confirmAction(forAll: boolean) {
    if (!confirm) return
    setConfirmBusy(true); setConfirmError(null)
    try {
      if (confirm.mode === 'clear') await clearHistory(confirm.chat.id)
      else await deleteChat(confirm.chat.id, forAll)
      const id = confirm.chat.id
      const what = confirm.mode === 'clear' ? 'cleared' : 'deleted'
      setConfirm(null)
      onChatChanged(id, what)
    } catch (e) { setConfirmError((e as Error).message) }
    finally { setConfirmBusy(false) }
  }

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col bg-bg2 md:w-80 md:flex-none md:border-r md:border-line">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-xl font-semibold">Чаты</h1>
        <button onClick={onNewChat} title="Новая группа или канал"
          className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-text"><Plus size={20} /></button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Люди, группы и каналы"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        {error && <p className="mt-2 text-xs text-pink">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {query.trim() ? (
          people.length === 0 && publics.length === 0 ? (
            <p className="p-4 text-sm text-muted">Ничего не найдено</p>
          ) : (
            <>
              {people.map((p) => (
                <button key={p.id} onClick={() => void startChat(p)} className={rowCls}>
                  <Avatar name={p.display_name} url={p.avatar_url} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.display_name}</div>
                    <div className="text-xs"><UsernameLine muted username={p.username} handles={p.handles} /></div>
                    {p.showcase_number && query.replace(/\D/g, '').length >= 3 && p.showcase_number.replace(/\D/g, '').includes(query.replace(/\D/g, '')) && (
                      <div className="text-xs text-accent">{p.showcase_number}</div>
                    )}
                  </div>
                </button>
              ))}
              {publics.map((c) => (
                <button key={c.id} onClick={() => void openPublic(c)} className={rowCls}>
                  <Avatar name={c.title} url={c.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="truncate text-xs text-muted">
                      {c.kind === 'channel' ? plural(c.members, ['подписчик', 'подписчика', 'подписчиков']) : plural(c.members, ['участник', 'участника', 'участников'])}
                      {c.handle ? ` · @${c.handle}` : ''}
                    </div>
                  </div>
                  <span className="text-xs text-accent">{c.joined ? 'Открыть' : 'Вступить'}</span>
                </button>
              ))}
            </>
          )
        ) : loading ? (
          <div className="space-y-3 p-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />)}
          </div>
        ) : (
          orderedChats.map((c) => {
            const l0 = last[c.id]
            const l = l0 && (!c.clearedAt || l0.created_at > c.clearedAt) ? l0 : undefined
            const isMuted = muted.includes(c.id)
            const count = unread[c.id] ?? 0
            return (
              <button key={c.id} onClick={() => { if (longPressed.current) { longPressed.current = false; return } onSelect(c.id) }}
                onContextMenu={(e) => openMenu(e, c)} onTouchStart={(e) => startPress(e, c)} onTouchEnd={cancelPress} onTouchMove={cancelPress}
                className={`${rowCls} ${c.id === selectedId ? 'bg-surface' : ''}`}>
                <ChatAvatar chat={c} online={c.otherId !== null && online.has(c.otherId)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium"><ColoredName userId={c.otherId} name={c.name} className="truncate" />{c.verified && <VerifiedBadge />}<PremiumBadge userId={c.otherId} /></span>
                    {pinned.includes(c.id) && <Pin size={12} className="text-muted" />}
                    {isMuted && <BellOff size={12} className="text-muted" />}
                    {l && <span className="text-xs text-muted">{formatTime(l.created_at)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-muted">
                      {l
                        ? `${l.sender_id === myId && c.kind !== 'saved' ? 'Вы: ' : ''}${
                            l.body
                              ?? (l.attachment_type === 'voice' ? '🎤 Голосовое'
                                : l.attachment_type === 'gift' ? '🎁 Подарок' : l.attachment_type === 'sticker' ? 'Стикер' : l.attachment_type === 'gif' ? 'GIF' : l.attachment_type === 'file' ? '📎 Файл'
                                  : '📷 Фото')
                          }`
                        : 'Сообщений пока нет'}
                    </span>
                    {count > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isMuted ? 'bg-surface text-muted' : 'bg-accent text-on-accent'}`}>{count}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
      {menu && (
        <ChatContextMenu x={menu.x} y={menu.y} chat={menu.chat} pinned={pinned.includes(menu.chat.id)} muted={muted.includes(menu.chat.id)}
          onTogglePin={() => togglePin(menu.chat.id)} onToggleMute={() => onToggleMute(menu.chat.id)}
          onClear={() => { setConfirmError(null); setConfirm({ mode: 'clear', chat: menu.chat }) }}
          onDelete={() => { setConfirmError(null); setConfirm({ mode: 'delete', chat: menu.chat }) }}
          onClose={() => setMenu(null)} />
      )}
      {confirm && (
        <ChatConfirm mode={confirm.mode} chat={confirm.chat} busy={confirmBusy} error={confirmError}
          onConfirm={(all) => void confirmAction(all)} onCancel={() => setConfirm(null)} />
      )}
    </aside>
  )
}
