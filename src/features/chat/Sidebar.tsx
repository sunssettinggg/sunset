import { useEffect, useState } from 'react'
import { BellOff, Search } from 'lucide-react'
import type { ChatItem, LastMessage, Profile } from '../../lib/types'
import { createDirectChat, searchProfiles } from './api'
import Avatar from './Avatar'
import ChatAvatar from './ChatAvatar'

interface Props {
  myId: string
  chats: ChatItem[]
  loading: boolean
  selectedId: string | null
  unread: Record<string, number>
  last: Record<string, LastMessage>
  online: Set<string>
  muted: string[]
  onSelect: (id: string) => void
  onChatCreated: () => Promise<void>
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function Sidebar({ myId, chats, loading, selectedId, unread, last, online, muted, onSelect, onChatCreated }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      searchProfiles(query, myId).then(setResults).catch((e: Error) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query, myId])

  async function startChat(other: Profile) {
    try {
      const id = await createDirectChat(other.id)
      await onChatCreated()
      onSelect(id)
      setQuery('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col bg-bg2 md:w-80 md:flex-none md:border-r md:border-line">
      <h1 className="px-5 pt-5 pb-3 text-xl font-semibold">Чаты</h1>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти по username"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        {error && <p className="mt-2 text-xs text-pink">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {query.trim() ? (
          results.length === 0 ? (
            <p className="p-4 text-sm text-muted">Никого не найдено</p>
          ) : (
            results.map((p) => (
              <button key={p.id} onClick={() => void startChat(p)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface">
                <Avatar name={p.display_name} url={p.avatar_url} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.display_name}</div>
                  <div className="truncate text-xs text-muted">@{p.username} · написать</div>
                </div>
              </button>
            ))
          )
        ) : loading ? (
          <div className="space-y-3 p-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />)}
          </div>
        ) : (
          chats.map((c) => {
            const l = last[c.id]
            const isMuted = muted.includes(c.id)
            const count = unread[c.id] ?? 0
            return (
              <button key={c.id} onClick={() => onSelect(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface ${
                  c.id === selectedId ? 'bg-surface' : ''}`}>
                <ChatAvatar chat={c} online={c.otherId !== null && online.has(c.otherId)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    {isMuted && <BellOff size={12} className="text-muted" />}
                    {l && <span className="text-xs text-muted">{formatTime(l.created_at)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-muted">
                      {l ? `${l.sender_id === myId && c.kind !== 'saved' ? 'Вы: ' : ''}${l.body ?? 'Вложение'}` : 'Сообщений пока нет'}
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
    </aside>
  )
}
