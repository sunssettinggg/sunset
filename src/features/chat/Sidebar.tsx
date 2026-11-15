import { useEffect, useState } from 'react'
import { Search, LogOut, Sun } from 'lucide-react'
import type { ChatItem, Profile } from '../../lib/types'
import { createDirectChat, searchProfiles } from './api'
import Avatar from './Avatar'

interface Props {
  me: Profile
  chats: ChatItem[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onChatCreated: () => Promise<void>
  onSignOut: () => void
  unread: Record<string, number>
  onOpenProfile: () => void
}

export default function Sidebar({ me, chats, loading, selectedId, onSelect, onChatCreated, onSignOut, unread, onOpenProfile }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      searchProfiles(query, me.id).then(setResults).catch((e: Error) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query, me.id])

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
    <aside className="flex h-full w-full flex-col bg-bg2 md:w-80 md:shrink-0 md:border-r md:border-white/5">
      <div className="flex items-center gap-3 p-4">
        <div className="sunset-gradient flex h-9 w-9 items-center justify-center rounded-xl">
          <Sun size={20} className="text-bg" />
        </div>
        <span className="text-lg font-semibold tracking-[0.2em]">SUNSET</span>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-white/5 focus-within:ring-2 focus-within:ring-accent">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти по username"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        {error && <p className="mt-2 text-xs text-pink">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2">
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
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />)}
          </div>
        ) : chats.length === 0 ? (
          <p className="p-4 text-sm text-muted">Чатов пока нет. Найди человека по username выше.</p>
        ) : (
          chats.map((c) => (
            <button key={c.id} onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface ${
                c.id === selectedId ? 'bg-surface' : ''}`}>
              <Avatar name={c.name} url={c.avatarUrl} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.name}</div>
                {c.username && <div className="truncate text-xs text-muted">@{c.username}</div>}
              </div>
              {unread[c.id] > 0 && (
                <span className="sunset-gradient ml-auto rounded-full px-2 py-0.5 text-xs font-semibold text-bg">{unread[c.id]}</span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/5 p-3">
        <button onClick={onOpenProfile} title="Профиль"><Avatar name={me.display_name} url={me.avatar_url} size={36} /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{me.display_name}</div>
          <div className="truncate text-xs text-muted">@{me.username}</div>
        </div>
        <button onClick={onSignOut} title="Выйти" className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-text">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
