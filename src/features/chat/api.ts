import { supabase } from '../../lib/supabase'
import type { ChatItem, Message, Profile, Reaction } from '../../lib/types'

const PROFILE_COLS = 'id, username, display_name, bio, avatar_url'
const MESSAGE_COLS = 'id, chat_id, sender_id, body, reply_to, created_at'

export async function searchProfiles(query: string, myId: string): Promise<Profile[]> {
  const q = query.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!q) return []
  const { data, error } = await supabase
    .from('profiles').select(PROFILE_COLS).ilike('username', `%${q}%`).neq('id', myId).limit(8)
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
    .from('chat_members').select('chat_id, chats!inner(kind, title)').eq('user_id', myId)
  if (error) throw error
  const memberships = (mine ?? []) as unknown as MembershipRow[]
  if (memberships.length === 0) return []

  const { data: others, error: error2 } = await supabase
    .from('chat_members').select(`chat_id, profiles!inner(${PROFILE_COLS})`)
    .in('chat_id', memberships.map((m) => m.chat_id)).neq('user_id', myId)
  if (error2) throw error2

  const otherByChat = new Map<string, Profile>()
  for (const o of (others ?? []) as unknown as OtherRow[]) {
    if (!otherByChat.has(o.chat_id)) otherByChat.set(o.chat_id, o.profiles)
  }
  return memberships.map((m) => {
    const other = otherByChat.get(m.chat_id)
    const direct = m.chats.kind === 'direct'
    return {
      id: m.chat_id,
      name: m.chats.title ?? other?.display_name ?? 'Чат',
      username: direct ? (other?.username ?? null) : null,
      avatarUrl: direct ? (other?.avatar_url ?? null) : null,
      bio: direct ? (other?.bio ?? null) : null,
      otherId: direct ? (other?.id ?? null) : null,
    }
  })
}

export async function fetchMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages').select(MESSAGE_COLS).eq('chat_id', chatId).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data as Message[]).reverse()
}

export async function sendMessage(chatId: string, senderId: string, body: string, replyTo: string | null): Promise<Message> {
  const { data, error } = await supabase
    .from('messages').insert({ chat_id: chatId, sender_id: senderId, body, reply_to: replyTo })
    .select(MESSAGE_COLS).single()
  if (error) throw error
  return data as Message
}

export async function fetchReactions(messageIds: string[]): Promise<Reaction[]> {
  if (messageIds.length === 0) return []
  const { data, error } = await supabase
    .from('reactions').select('message_id, user_id, emoji').in('message_id', messageIds)
  if (error) throw error
  return data as Reaction[]
}

export async function addReaction(r: Reaction): Promise<void> {
  const { error } = await supabase.from('reactions').insert(r)
  if (error) throw error
}

export async function removeReaction(r: Reaction): Promise<void> {
  const { error } = await supabase.from('reactions').delete()
    .eq('message_id', r.message_id).eq('user_id', r.user_id).eq('emoji', r.emoji)
  if (error) throw error
}

export async function unreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('unread_counts')
  if (error) throw error
  const rows = (data ?? []) as { chat_id: string; unread: number | string }[]
  return Object.fromEntries(rows.map((r) => [r.chat_id, Number(r.unread)]))
}

export async function markRead(chatId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read', { p_chat: chatId })
  if (error) throw error
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const types: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
  const ext = types[file.type]
  if (!ext) throw new Error('Только PNG, JPG или WebP.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ.')
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export async function updateProfile(
  id: string,
  patch: { display_name: string; bio: string | null; avatar_url: string | null },
): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select(PROFILE_COLS).single()
  if (error) throw error
  return data as Profile
}
