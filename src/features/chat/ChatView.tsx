import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, SendHorizontal } from 'lucide-react'
import type { ChatItem } from '../../lib/types'
import { sendMessage } from './api'
import { useMessages } from './hooks'
import Avatar from './Avatar'

interface Props { chat: ChatItem; myId: string; onBack: () => void }

export default function ChatView({ chat, myId, onBack }: Props) {
  const { messages, loading, error, add } = useMessages(chat.id)
  const [text, setText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText('')
    setSendError(null)
    try {
      add(await sendMessage(chat.id, myId, body))
    } catch (err) {
      setText(body)
      setSendError((err as Error).message)
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="glass flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-1 text-muted hover:text-text md:hidden"><ArrowLeft size={20} /></button>
        <Avatar name={chat.name} size={36} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{chat.name}</div>
          {chat.username && <div className="truncate text-xs text-muted">@{chat.username}</div>}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading && <div className="h-10 w-48 animate-pulse rounded-2xl bg-surface" />}
        {error && <p className="text-sm text-pink">Не удалось загрузить: {error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">Сообщений пока нет. Напиши первым.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                mine ? 'sunset-gradient rounded-br-md text-bg' : 'rounded-bl-md bg-surface'}`}>
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-bg/70' : 'text-muted'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/5 p-3">
        {sendError && <p className="mb-2 text-xs text-pink">Не отправлено: {sendError}</p>}
        <div className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" maxLength={4000}
            className="flex-1 rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-white/5 placeholder:text-muted focus:ring-2 focus:ring-accent" />
          <button type="submit" disabled={!text.trim()}
            className="sunset-gradient flex h-11 w-11 items-center justify-center rounded-xl text-bg transition hover:brightness-110 active:scale-95 disabled:opacity-40">
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>
    </section>
  )
}
