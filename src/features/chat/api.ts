import { supabase } from '../../lib/supabase'
import type { ChatItem, Message, Profile } from '../../lib/types'

export async function searchProfiles(query: string, myId: string): Promise<Profile[]> {
  const q = query.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!q) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .ilike('username', `%${q}%`)
    .neq('id', myId)
    .limit(8)
  if (error) throw error
  return data as Profile[]
}

export async function createDirectChat(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_direct_chat', { p_other: otherId })
  if (error) throw error
  return data as string
}

interface MembershipRow { chat_id: string; chats: { kind: string; title: string | null } }
interface OtherRow { chat_id: string; profiles: Profile }

export async function listChats(myId: string): Promise<ChatItem[]> {
  const { data: mine, error } = await supabase
    .from('chat_members')
    .select('chat_id, chats!inner(kind, title)')
    .eq('user_id', myId)
  if (error) throw error
  const memberships = (mine ?? []) as unknown as MembershipRow[]
  if (memberships.length === 0) return []

  const { data: others, error: error2 } = await supabase
    .from('chat_members')
    .select('chat_id, profiles!inner(id, username, display_name)')
    .in('chat_id', memberships.map((m) => m.chat_id))
    .neq('user_id', myId)
  if (error2) throw error2

  const otherByChat = new Map<string, Profile>()
  for (const o of (others ?? []) as unknown as OtherRow[]) {
    if (!otherByChat.has(o.chat_id)) otherByChat.set(o.chat_id, o.profiles)
  }
  return memberships.map((m) => {
    const other = otherByChat.get(m.chat_id)
    return {
      id: m.chat_id,
      name: m.chats.title ?? other?.display_name ?? 'Чат',
      username: m.chats.kind === 'direct' ? (other?.username ?? null) : null,
    }
  })
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at')
    .eq('chat_id', chatId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as Message[]).reverse()
}

export async function sendMessage(chatId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, body })
    .select('id, chat_id, sender_id, body, created_at')
    .single()
  if (error) throw error
  return data as Message
}
