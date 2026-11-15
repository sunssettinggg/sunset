import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, PanelRight, Reply, SendHorizontal, Smile, X } from 'lucide-react'
import type { ChatItem, Message } from '../../lib/types'
import { sendMessage } from './api'
import { useMessages } from './hooks'
import Avatar from './Avatar'

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢']

interface Props { chat: ChatItem; myId: string; onBack: () => void; onToggleInfo: () => void }

export default function ChatView({ chat, myId, onBack, onToggleInfo }: Props) {
  const { messages, reactions, typing, loading, error, add, sendTyping, toggleReaction } = useMessages(chat.id, myId)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, typing])

  const byMessage = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>()
    for (const r of reactions) {
      const emojis = map.get(r.message_id) ?? new Map<string, string[]>()
      emojis.set(r.emoji, [...(emojis.get(r.emoji) ?? []), r.user_id])
      map.set(r.message_id, emojis)
    }
    return map
  }, [reactions])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    const reply = replyTo
    setText(''); setReplyTo(null); setSendError(null)
    try {
      add(await sendMessage(chat.id, myId, body, reply?.id ?? null))
    } catch (err) {
      setText(body); setReplyTo(reply); setSendError((err as Error).message)
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="glass flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-1 text-muted hover:text-text md:hidden"><ArrowLeft size={20} /></button>
        <button onClick={onToggleInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar name={chat.name} url={chat.avatarUrl} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{chat.name}</div>
            {chat.username && <div className="truncate text-xs text-muted">@{chat.username}</div>}
          </div>
        </button>
        <button onClick={onToggleInfo} title="Информация" className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-text">
          <PanelRight size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" onClick={() => setPickerFor(null)}>
        {loading && <div className="h-10 w-48 animate-pulse rounded-2xl bg-surface" />}
        {error && <p className="text-sm text-pink">Не удалось загрузить: {error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">Сообщений пока нет. Напиши первым.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId
          const original = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null
          const chips = byMessage.get(m.id)
          return (
            <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="relative max-w-[75%]">
                <div className={`rounded-2xl px-4 py-2 text-sm ${mine ? 'sunset-gradient rounded-br-md text-bg' : 'rounded-bl-md bg-surface'}`}>
                  {m.reply_to && (
                    <div className={`mb-1 truncate border-l-2 pl-2 text-xs ${mine ? 'border-bg/50 text-bg/80' : 'border-accent text-muted'}`}>
                      {original?.body ?? 'Сообщение'}
                    </div>
                  )}
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  <div className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${mine ? 'text-bg/70' : 'text-muted'}`}>
                    <button title="Ответить" onClick={() => setReplyTo(m)} className="opacity-60 transition hover:opacity-100"><Reply size={12} /></button>
                    <button title="Реакция" onClick={(e) => { e.stopPropagation(); setPickerFor(pickerFor === m.id ? null : m.id) }}
                      className="opacity-60 transition hover:opacity-100"><Smile size={12} /></button>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {pickerFor === m.id && (
                  <div className={`glass absolute z-10 mt-1 flex gap-1 rounded-full px-2 py-1 ${mine ? 'right-0' : 'left-0'}`}>
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => { void toggleReaction(m.id, e); setPickerFor(null) }}
                        className="rounded-full px-1 text-lg transition hover:scale-125">{e}</button>
                    ))}
                  </div>
                )}
                {chips && (
                  <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`}>
                    {[...chips].map(([emoji, users]) => (
                      <button key={emoji} onClick={() => void toggleReaction(m.id, emoji)}
                        className={`rounded-full px-2 py-0.5 text-xs transition ${
                          users.includes(myId) ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface'}`}>
                        {emoji} {users.length}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {typing && <p className="animate-pulse text-xs text-muted">{chat.name} печатает…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/5 p-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
            <Reply size={14} className="text-accent" />
            <span className="flex-1 truncate text-muted">{replyTo.body}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-muted hover:text-text"><X size={14} /></button>
          </div>
        )}
        {sendError && <p className="mb-2 text-xs text-pink">Не отправлено: {sendError}</p>}
        <div className="flex items-center gap-2">
          <input value={text} maxLength={4000} placeholder="Сообщение"
            onChange={(e) => { setText(e.target.value); if (e.target.value) sendTyping() }}
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
