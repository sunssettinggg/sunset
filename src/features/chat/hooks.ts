import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ChatItem, Message } from '../../lib/types'
import { fetchMessages, listChats } from './api'

export function useChats(myId: string) {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setChats(await listChats(myId))
    } catch (e) {
      console.error('listChats failed', e)
    } finally {
      setLoading(false)
    }
  }, [myId])

  useEffect(() => {
    void reload()
    const channel = supabase
      .channel(`my-chats:${myId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${myId}` },
        () => void reload())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [myId, reload])

  return { chats, loading, reload }
}

function merge(a: Message[], b: Message[]): Message[] {
  const byId = new Map<string, Message>()
  for (const m of [...a, ...b]) byId.set(m.id, m)
  return [...byId.values()].sort((x, y) => x.created_at.localeCompare(y.created_at))
}

export function useMessages(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const add = useCallback((m: Message) => setMessages((prev) => merge(prev, [m])), [])

  useEffect(() => {
    let active = true
    setMessages([])
    setLoading(true)
    setError(null)
    fetchMessages(chatId)
      .then((data) => { if (active) setMessages((prev) => merge(data, prev)) })
      .catch((e: Error) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => add(payload.new as Message))
      .subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [chatId, add])

  return { messages, loading, error, add }
}
