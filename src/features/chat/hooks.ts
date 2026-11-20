import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { getFlag, getMuted, playBeep } from '../../lib/prefs'
import type { ChatItem, LastMessage, Message, Reaction } from '../../lib/types'
import {
  addReaction, fetchMessages, fetchPeerRead, fetchPin, fetchReactions, getSavedChat, lastMessages, listChats,
  markRead, removeReaction, unreadCounts,
} from './api'

export function useChats(myId: string, selectedId: string | null) {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [last, setLast] = useState<Record<string, LastMessage>>({})
  const [loading, setLoading] = useState(true)
  const selectedRef = useRef(selectedId)

  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  const reload = useCallback(async () => {
    try { setChats(await listChats(myId)) }
    catch (e) { console.error('listChats failed', e) }
    finally { setLoading(false) }
  }, [myId])

  const loadMeta = useCallback(async () => {
    try {
      const [u, l] = await Promise.all([unreadCounts(), lastMessages()])
      setUnread(u)
      setLast(l)
    } catch (e) { console.error('loadMeta failed', e) }
  }, [])

  useEffect(() => {
    void getSavedChat().catch((e) => console.error('getSavedChat failed', e)).then(() => reload())
    void loadMeta()
    const channel = supabase
      .channel(`my-chats:${myId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${myId}` },
        () => { void reload(); void loadMeta() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message
        if (m.sender_id !== myId) {
          const isOpen = m.chat_id === selectedRef.current && !document.hidden
          if (!isOpen && getFlag('sound') && !getMuted().includes(m.chat_id)) playBeep()
          if (m.chat_id === selectedRef.current) { void markRead(m.chat_id).then(loadMeta); return }
        }
        void loadMeta()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [myId, reload, loadMeta])

  useEffect(() => {
    if (selectedId) void markRead(selectedId).then(loadMeta).catch(() => undefined)
  }, [selectedId, loadMeta])

  const sorted = useMemo(() => [...chats].sort((a, b) => {
    if (a.kind === 'saved') return -1
    if (b.kind === 'saved') return 1
    return (last[b.id]?.created_at ?? '9999').localeCompare(last[a.id]?.created_at ?? '9999')
  }), [chats, last])

  return { chats: sorted, loading, unread, last, reload, reloadMeta: loadMeta }
}

export function useOnline(myId: string, visible: boolean) {
  const [online, setOnline] = useState<Set<string>>(new Set())
  useEffect(() => {
    const channel = supabase.channel('online', { config: { presence: { key: myId } } })
    channel
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe((status) => { if (status === 'SUBSCRIBED' && visible) void channel.track({ at: Date.now() }) })
    return () => { void supabase.removeChannel(channel) }
  }, [myId, visible])
  return online
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

export function useMessages(chatId: string, myId: string, peerId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [typing, setTyping] = useState(false)
  const [pinId, setPinId] = useState<string | null>(null)
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingSent = useRef(0)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const add = useCallback((m: Message) => setMessages((prev) => mergeMessages(prev, [m])), [])
  const patch = useCallback((m: Message) => setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))), [])
  const remove = useCallback((id: string) => setMessages((prev) => prev.filter((x) => x.id !== id)), [])

  useEffect(() => {
    let active = true
    setMessages([]); setReactions([]); setTyping(false); setPinId(null); setPeerReadAt(null); setLoading(true); setError(null)

    fetchMessages(chatId)
      .then(async (data) => {
        if (!active) return
        setMessages((prev) => mergeMessages(data, prev))
        const r = await fetchReactions(data.map((m) => m.id))
        if (active) setReactions((prev) => mergeReactions(r, prev))
      })
      .catch((e: Error) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    fetchPin(chatId).then((id) => { if (active) setPinId(id) }).catch(() => undefined)
    if (peerId) fetchPeerRead(chatId, peerId).then((t) => { if (active) setPeerReadAt(t) }).catch(() => undefined)

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => { setTyping(false); add(payload.new as Message) })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message & { deleted_at: string | null }
          if (m.deleted_at) remove(m.id)
          else patch(m)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
        (payload) => setReactions((prev) => mergeReactions(prev, [payload.new as Reaction])))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload) => {
        const old = payload.old as Partial<Reaction>
        if (old.message_id && old.user_id && old.emoji) {
          const key = rKey(old as Reaction)
          setReactions((prev) => prev.filter((r) => rKey(r) !== key))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_pins' }, (payload) => {
        const del = payload.eventType === 'DELETE'
        const row = (del ? payload.old : payload.new) as { chat_id?: string; message_id?: string }
        if (row.chat_id === chatId) setPinId(del ? null : (row.message_id ?? null))
      })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const r = payload.new as { user_id?: string; last_read_at?: string }
          if (peerId && r.user_id === peerId && r.last_read_at) setPeerReadAt(r.last_read_at)
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
  }, [chatId, myId, peerId, add, patch, remove])

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

  return {
    messages, reactions, typing, pinId, peerReadAt, loading, error,
    add, patch, remove, setPinId, sendTyping, toggleReaction,
  }
}

export function useImageUrls(messages: Message[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const missing = messages.filter((m) => m.attachment_path && !urls[m.attachment_path])
    if (missing.length === 0) return
    const bucket = supabase.storage.from('attachments')
    const store = (data: { path: string | null; signedUrl: string | null }[] | null) => {
      if (!data) return
      setUrls((prev) => {
        const next = { ...prev }
        for (const d of data) if (d.path && d.signedUrl) next[d.path] = d.signedUrl
        return next
      })
    }
    const streamable = missing
      .filter((m) => m.attachment_type === 'image' || m.attachment_type === 'voice' || m.attachment_type == null)
      .map((m) => m.attachment_path as string)
    const files = missing.filter((m) => m.attachment_type === 'file').map((m) => m.attachment_path as string)
    if (streamable.length > 0) void bucket.createSignedUrls(streamable, 3600).then(({ data }) => store(data))
    if (files.length > 0) void bucket.createSignedUrls(files, 3600, { download: true }).then(({ data }) => store(data))
  }, [messages, urls])
  return urls
}

export function useProfileNames(messages: Message[]) {
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.sender_id))].filter((id) => !names[id])
    if (missing.length === 0) return
    void supabase.from('profiles').select('id, display_name').in('id', missing).then(({ data }) => {
      if (!data) return
      setNames((prev) => {
        const next = { ...prev }
        for (const r of data as { id: string; display_name: string }[]) next[r.id] = r.display_name
        return next
      })
    })
  }, [messages, names])
  return names
}
