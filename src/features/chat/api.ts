import { supabase } from '../../lib/supabase'
import type { ChatItem, LastMessage, MarketItem, Message, Profile, Reaction } from '../../lib/types'

const PROFILE_COLS = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, showcase_handle'
const MESSAGE_COLS = 'id, chat_id, sender_id, body, reply_to, created_at, edited_at, forwarded_from'

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
      kind: m.chats.kind as ChatItem['kind'],
      joinedAt: direct ? (other?.created_at ?? null) : null,
      number: direct ? (other?.showcase_number ?? null) : null,
      handle: direct ? (other?.showcase_handle ?? null) : null,
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

export async function sendMessage(
  chatId: string, senderId: string, body: string, replyTo: string | null, forwardedFrom: string | null = null,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages').insert({ chat_id: chatId, sender_id: senderId, body, reply_to: replyTo, forwarded_from: forwardedFrom })
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

export async function getSavedChat(): Promise<string> {
  const { data, error } = await supabase.rpc('get_saved_chat')
  if (error) throw error
  return data as string
}

export async function lastMessages(): Promise<Record<string, LastMessage>> {
  const { data, error } = await supabase.rpc('last_messages')
  if (error) throw error
  const rows = (data ?? []) as (LastMessage & { chat_id: string })[]
  return Object.fromEntries(rows.map((r) => [r.chat_id, { body: r.body, created_at: r.created_at, sender_id: r.sender_id }]))
}

export async function updateMessage(id: string, body: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ body, edited_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchPin(chatId: string): Promise<string | null> {
  const { data, error } = await supabase.from('chat_pins').select('message_id').eq('chat_id', chatId).maybeSingle()
  if (error) throw error
  return (data as { message_id: string } | null)?.message_id ?? null
}

export async function setPin(chatId: string, messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chat_pins').upsert({ chat_id: chatId, message_id: messageId, pinned_by: userId })
  if (error) throw error
}

export async function clearPin(chatId: string): Promise<void> {
  const { error } = await supabase.from('chat_pins').delete().eq('chat_id', chatId)
  if (error) throw error
}

export async function fetchPeerRead(chatId: string, peerId: string): Promise<string | null> {
  const { data, error } = await supabase.from('chat_members').select('last_read_at')
    .eq('chat_id', chatId).eq('user_id', peerId).maybeSingle()
  if (error) throw error
  return (data as { last_read_at: string } | null)?.last_read_at ?? null
}

// ---------- Маркет ----------
const ITEM_COLS = 'id, kind, value, owner_id, price'

async function rpcVoid(fn: string, args?: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw error
}

export async function getStars(): Promise<number> {
  const { data, error } = await supabase.rpc('my_stars')
  if (error) throw error
  return Number(data ?? 0)
}

export async function listMarket(): Promise<MarketItem[]> {
  const { data, error } = await supabase.from('market_items').select(ITEM_COLS).not('price', 'is', null).order('price')
  if (error) throw error
  return data as MarketItem[]
}

export async function myItems(userId: string): Promise<MarketItem[]> {
  const { data, error } = await supabase.from('market_items').select(ITEM_COLS).eq('owner_id', userId).order('created_at')
  if (error) throw error
  return data as MarketItem[]
}

export const buyItem = (id: string) => rpcVoid('market_buy', { p_item: id })
export const listItem = (id: string, price: number) => rpcVoid('market_list', { p_item: id, p_price: price })
export const unlistItem = (id: string) => rpcVoid('market_unlist', { p_item: id })
export const applyItem = (id: string) => rpcVoid('market_apply', { p_item: id })
export const unapplyItem = (kind: MarketItem['kind']) => rpcVoid('market_unapply', { p_kind: kind })
