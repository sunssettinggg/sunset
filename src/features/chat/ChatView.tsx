import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type TouchEvent } from 'react'
import { ArrowLeft, Check, CheckCheck, Copy, Forward, PanelRight, Pencil, Pin, Reply, SendHorizontal, Trash2, X } from 'lucide-react'
import type { ChatItem, Message } from '../../lib/types'
import { clearPin, deleteMessage, sendMessage, setPin, updateMessage } from './api'
import { useMessages } from './hooks'
import ChatAvatar from './ChatAvatar'
import ForwardModal from './ForwardModal'
import MessageMenu, { type MenuAction } from './MessageMenu'

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢']

interface Props {
  chat: ChatItem
  chats: ChatItem[]
  myId: string
  myName: string
  online: boolean
  background: string | null
  onBack: () => void
  onToggleInfo: () => void
}

function formatFull(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `сегодня в ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `вчера в ${time}`
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} в ${time}`
}

export default function ChatView({ chat, chats, myId, myName, online, background, onBack, onToggleInfo }: Props) {
  const {
    messages, reactions, typing, pinId, peerReadAt, loading, error, add, patch, remove, setPinId, sendTyping, toggleReaction,
  } = useMessages(chat.id, myId, chat.otherId)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; m: Message } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [forwarding, setForwarding] = useState<Message[] | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saved = chat.kind === 'saved'
  const direct = chat.kind === 'direct'

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const byMessage = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>()
    for (const r of reactions) {
      const emojis = map.get(r.message_id) ?? new Map<string, string[]>()
      emojis.set(r.emoji, [...(emojis.get(r.emoji) ?? []), r.user_id])
      map.set(r.message_id, emojis)
    }
    return map
  }, [reactions])

  const status = typing ? 'печатает…' : saved ? 'Только для вас' : online ? 'в сети' : chat.username ? `@${chat.username}` : ''
  const pinned = pinId ? messages.find((m) => m.id === pinId) : undefined
  const selectedMessages = messages.filter((m) => selected.has(m.id))
  const fail = (e: unknown) => setSendError((e as Error).message)
  const isRead = (m: Message) => peerReadAt !== null && Date.parse(peerReadAt) >= Date.parse(m.created_at)
  const senderName = (m: Message) => (m.sender_id === myId ? myName : chat.name)

  function exitSelect() { setSelectMode(false); setSelected(new Set()) }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openMenu(e: MouseEvent, m: Message) {
    e.preventDefault()
    if (!selectMode) setMenu({ x: e.clientX, y: e.clientY, m })
  }
  function startPress(e: TouchEvent, m: Message) {
    const t = e.touches[0]
    pressTimer.current = setTimeout(() => { if (!selectMode) setMenu({ x: t.clientX, y: t.clientY, m }) }, 450)
  }
  const cancelPress = () => clearTimeout(pressTimer.current)

  async function removeMessages(list: Message[]) {
    for (const m of list) {
      try { await deleteMessage(m.id); remove(m.id) } catch (e) { fail(e) }
    }
  }

  async function onAction(kind: MenuAction, m: Message) {
    setMenu(null)
    if (kind === 'reply') { setReplyTo(m); setEditing(null) }
    else if (kind === 'edit') { setEditing(m); setReplyTo(null); setText(m.body ?? '') }
    else if (kind === 'copy') void navigator.clipboard.writeText(m.body ?? '')
    else if (kind === 'forward') setForwarding([m])
    else if (kind === 'delete') await removeMessages([m])
    else if (kind === 'select') { setSelectMode(true); setSelected(new Set([m.id])) }
    else if (kind === 'pin') {
      try {
        if (pinId === m.id) { await clearPin(chat.id); setPinId(null) }
        else { await setPin(chat.id, m.id, myId); setPinId(m.id) }
      } catch (e) { fail(e) }
    }
  }

  async function doForward(target: ChatItem) {
    const list = forwarding ?? []
    setForwarding(null)
    exitSelect()
    for (const m of list) {
      try { await sendMessage(target.id, myId, m.body ?? '', null, m.forwarded_from ?? senderName(m)) } catch (e) { fail(e) }
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setSendError(null)
    if (editing) {
      const target = editing
      setText(''); setEditing(null)
      try { await updateMessage(target.id, body); patch({ ...target, body, edited_at: new Date().toISOString() }) }
      catch (err) { fail(err); setText(body); setEditing(target) }
      return
    }
    const reply = replyTo
    setText(''); setReplyTo(null)
    try { add(await sendMessage(chat.id, myId, body, reply?.id ?? null)) }
    catch (err) { fail(err); setText(body); setReplyTo(reply) }
  }

  const headerInfo = (
    <>
      <ChatAvatar chat={chat} size={40} online={online} />
      <div className="min-w-0 text-left">
        <div className="truncate text-sm font-medium">{chat.name}</div>
        <div className={`truncate text-xs ${typing || online ? 'text-accent' : 'text-muted'}`}>{status}</div>
      </div>
    </>
  )
  const barBtn = 'rounded-lg p-2 text-muted transition hover:bg-surface hover:text-text'
  const allMine = selectedMessages.length > 0 && selectedMessages.every((m) => m.sender_id === myId)

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-line bg-bg2 px-4 py-3">
        {selectMode ? (
          <>
            <button onClick={exitSelect} title="Отмена" className={barBtn}><X size={18} /></button>
            <div className="flex-1 text-sm font-medium">Выбрано: {selected.size}</div>
            <button title="Копировать" disabled={selected.size === 0} className={barBtn}
              onClick={() => { void navigator.clipboard.writeText(selectedMessages.map((m) => m.body ?? '').join('\n')); exitSelect() }}>
              <Copy size={18} />
            </button>
            <button title="Переслать" disabled={selected.size === 0} className={barBtn} onClick={() => setForwarding(selectedMessages)}>
              <Forward size={18} />
            </button>
            {allMine && (
              <button title="Удалить" className={`${barBtn} text-pink`} onClick={() => { void removeMessages(selectedMessages); exitSelect() }}>
                <Trash2 size={18} />
              </button>
            )}
          </>
        ) : (
          <>
            <button onClick={onBack} className="rounded-lg p-1 text-muted hover:text-text md:hidden"><ArrowLeft size={20} /></button>
            {saved ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">{headerInfo}</div>
            ) : (
              <>
                <button onClick={onToggleInfo} className="flex min-w-0 flex-1 items-center gap-3">{headerInfo}</button>
                <button onClick={onToggleInfo} title="Информация" className={barBtn}><PanelRight size={18} /></button>
              </>
            )}
          </>
        )}
      </header>

      {pinId && (
        <div className="flex items-center gap-3 border-b border-line bg-bg2 px-4 py-2 text-sm">
          <Pin size={14} className="shrink-0 text-accent" />
          <button className="min-w-0 flex-1 truncate text-left"
            onClick={() => document.getElementById(`msg-${pinId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            <span className="text-xs text-accent">Закреплено · </span>{pinned?.body ?? 'сообщение'}
          </button>
          <button title="Открепить" className="text-muted hover:text-text"
            onClick={() => void clearPin(chat.id).then(() => setPinId(null)).catch(fail)}><X size={14} /></button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {background && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${background})` }} />}
        {background && <div className="absolute inset-0 bg-bg/40" />}
        <div className="relative h-full space-y-3 overflow-y-auto p-4">
          {loading && <div className="h-10 w-48 animate-pulse rounded-2xl bg-surface" />}
          {error && <p className="text-sm text-pink">Не удалось загрузить: {error}</p>}
          {!loading && !error && messages.length === 0 && (
            <p className="pt-10 text-center text-sm text-muted">
              {saved ? 'Сохраняй сюда заметки и важное.' : 'Сообщений пока нет. Напиши первым.'}
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === myId
            const original = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null
            const chips = byMessage.get(m.id)
            const ticks = mine && direct
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                onClick={() => { if (selectMode) toggleSelect(m.id) }}>
                <div className="relative max-w-[75%]">
                  <div onContextMenu={(e) => openMenu(e, m)} onTouchStart={(e) => startPress(e, m)}
                    onTouchEnd={cancelPress} onTouchMove={cancelPress}
                    className={`rounded-2xl px-4 py-2 text-sm select-none md:select-text ${
                      mine ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-surface'} ${
                      selected.has(m.id) ? 'ring-2 ring-text' : ''}`}>
                    {m.forwarded_from && (
                      <div className={`mb-1 text-xs ${mine ? 'text-on-accent/80' : 'text-accent'}`}>Переслано от {m.forwarded_from}</div>
                    )}
                    {m.reply_to && (
                      <div className={`mb-1 truncate border-l-2 pl-2 text-xs ${
                        mine ? 'border-on-accent/50 text-on-accent/80' : 'border-accent text-muted'}`}>
                        {original?.body ?? 'Сообщение'}
                      </div>
                    )}
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-on-accent/70' : 'text-muted'}`}>
                      {m.edited_at && <span>изменено</span>}
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {ticks && (isRead(m) ? <CheckCheck size={12} /> : <Check size={12} />)}
                    </div>
                  </div>
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
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t border-line bg-bg2 p-3">
        {(replyTo || editing) && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
            {editing ? <Pencil size={14} className="text-accent" /> : <Reply size={14} className="text-accent" />}
            <span className="flex-1 truncate text-muted">{editing ? `Изменение: ${editing.body ?? ''}` : replyTo?.body}</span>
            <button type="button" className="text-muted hover:text-text"
              onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setText('') } }}><X size={14} /></button>
          </div>
        )}
        {sendError && <p className="mb-2 text-xs text-pink">Ошибка: {sendError}</p>}
        <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-1.5">
          <input value={text} maxLength={4000} placeholder="Сообщение"
            onChange={(e) => { setText(e.target.value); if (e.target.value && !saved && !editing) sendTyping() }}
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted" />
          <button type="submit" disabled={!text.trim()} title={editing ? 'Сохранить' : 'Отправить'}
            className="rounded-xl p-2 text-accent transition hover:bg-bg2 disabled:opacity-40">
            {editing ? <Check size={20} /> : <SendHorizontal size={20} />}
          </button>
        </div>
      </form>

      {menu && (
        <MessageMenu x={menu.x} y={menu.y} mine={menu.m.sender_id === myId} pinned={pinId === menu.m.id} emojis={EMOJIS}
          time={formatFull(menu.m.created_at)} read={menu.m.sender_id === myId && direct ? isRead(menu.m) : null}
          onReact={(e) => { void toggleReaction(menu.m.id, e); setMenu(null) }}
          onAction={(a) => void onAction(a, menu.m)} onClose={() => setMenu(null)} />
      )}
      {forwarding && (
        <ForwardModal chats={chats} count={forwarding.length} onPick={(c) => void doForward(c)} onClose={() => setForwarding(null)} />
      )}
    </section>
  )
}
