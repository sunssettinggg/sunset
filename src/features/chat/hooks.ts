import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { ChatItem, Message, Reaction } from '../../lib/types'
import {
  addReaction, fetchMessages, fetchReactions, listChats, markRead, removeReaction, unreadCounts,
} from './api'

export function useChats(myId: string, selectedId: string | null) {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const selectedRef = useRef(selectedId)

  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  const reload = useCallback(async () => {
    try { setChats(await listChats(myId)) }
    catch (e) { console.error('listChats failed', e) }
    finally { setLoading(false) }
  }, [myId])

  const loadUnread = useCallback(async () => {
    try { setUnread(await unreadCounts()) }
    catch (e) { console.error('unreadCounts failed', e) }
  }, [])

  useEffect(() => {
    void reload()
    void loadUnread()
    const channel = supabase
      .channel(`my-chats:${myId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${myId}` },
        () => { void reload(); void loadUnread() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message
        if (m.sender_id === myId) return
        if (m.chat_id === selectedRef.current) void markRead(m.chat_id).then(loadUnread)
        else void loadUnread()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [myId, reload, loadUnread])

  useEffect(() => {
    if (selectedId) void markRead(selectedId).then(loadUnread).catch(() => undefined)
  }, [selectedId, loadUnread])

  return { chats, loading, unread, reload }
}

const rKey = (r: Reaction) => `${r.message_id}|${r.user_id}|${r.emoji}`

function mergeMessages(a: Message[], b: Message[]): Message[] {
  const byId = new Map<string, Message>()
  for (const m of [...a, ...b]) byId.set(m.id, m)
  return [...byId.values()].sort((x, y) => x.created_at.localeCompare(y.created_at))
}

function mergeReactions(a: Reaction[], b: Reaction[]): Reaction[] {
  const map = new Map<string, Reaction>()
  for (const r of [...a, ...b]) map.set(rKey(r), r)
  return [...map.values()]
}

export function useMessages(chatId: string, myId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingSent = useRef(0)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const add = useCallback((m: Message) => setMessages((prev) => mergeMessages(prev, [m])), [])

  useEffect(() => {
    let active = true
    setMessages([]); setReactions([]); setTyping(false); setLoading(true); setError(null)

    fetchMessages(chatId)
      .then(async (data) => {
        if (!active) return
        setMessages((prev) => mergeMessages(data, prev))
        const r = await fetchReactions(data.map((m) => m.id))
        if (active) setReactions((prev) => mergeReactions(r, prev))
      })
      .catch((e: Error) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => { setTyping(false); add(payload.new as Message) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
        (payload) => setReactions((prev) => mergeReactions(prev, [payload.new as Reaction])))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload) => {
        const old = payload.old as Partial<Reaction>
        if (old.message_id && old.user_id && old.emoji) {
          const key = rKey(old as Reaction)
          setReactions((prev) => prev.filter((r) => rKey(r) !== key))
        }
      })
      .on('broadcast', { event: 'typing' }, (msg) => {
        const uid = (msg.payload as { userId?: string } | undefined)?.userId
        if (!uid || uid === myId) return
        setTyping(true)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(false), 3000)
      })
      .subscribe()
    channelRef.current = channel

    return () => {
      active = false
      clearTimeout(typingTimer.current)
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [chatId, myId, add])

  const sendTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSent.current < 2000) return
    lastTypingSent.current = now
    void channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } })
  }, [myId])

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const r: Reaction = { message_id: messageId, user_id: myId, emoji }
    const exists = reactions.some((x) => rKey(x) === rKey(r))
    if (exists) setReactions((prev) => prev.filter((x) => rKey(x) !== rKey(r)))
    else setReactions((prev) => mergeReactions(prev, [r]))
    try {
      if (exists) await removeReaction(r)
      else await addReaction(r)
    } catch {
      if (exists) setReactions((prev) => mergeReactions(prev, [r]))
      else setReactions((prev) => prev.filter((x) => rKey(x) !== rKey(r)))
    }
  }, [reactions, myId])

  return { messages, reactions, typing, loading, error, add, sendTyping, toggleReaction }
}
