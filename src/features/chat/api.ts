import { supabase } from '../../lib/supabase'
import type { ChatItem, LastMessage, MarketItem, Member, Message, Profile, ProfileChannel, PublicChat, Reaction, Role } from '../../lib/types'

const PROFILE_COLS = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id'
const MESSAGE_COLS = 'id, chat_id, sender_id, body, reply_to, created_at, edited_at, forwarded_from, attachment_path, attachment_type'

export async function searchProfiles(query: string): Promise<Profile[]> {
  const q = query.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!q) return []
  const { data, error } = await supabase.rpc('search_profiles', { p_query: q })
  if (error) throw error
  return data as Profile[]
}

export const changeUsername = (username: string) => rpcVoid('change_username', { p_new: username })

export async function createDirectChat(otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_direct_chat', { p_other: otherId })
  if (error) throw error
  return data as string
}

interface MembershipRow {
  chat_id: string
  role: Role
  chats: {
    kind: ChatItem['kind']; title: string | null; description: string | null
    is_public: boolean; handle: string | null; avatar_url: string | null
  }
}
interface OtherRow { chat_id: string; profiles: Profile }

export async function listChats(myId: string): Promise<ChatItem[]> {
  const { data: mine, error } = await supabase
    .from('chat_members')
    .select('chat_id, role, chats!inner(kind, title, description, is_public, handle, avatar_url)')
    .eq('user_id', myId)
  if (error) throw error
  const memberships = (mine ?? []) as unknown as MembershipRow[]
  const directIds = memberships.filter((m) => m.chats.kind === 'direct').map((m) => m.chat_id)

  const otherByChat = new Map<string, Profile>()
  if (directIds.length > 0) {
    const { data: others, error: error2 } = await supabase
      .from('chat_members').select(`chat_id, profiles!inner(${PROFILE_COLS})`)
      .in('chat_id', directIds).neq('user_id', myId)
    if (error2) throw error2
    for (const o of (others ?? []) as unknown as OtherRow[]) otherByChat.set(o.chat_id, o.profiles)
  }

  return memberships.map((m) => {
    const c = m.chats
    const other = otherByChat.get(m.chat_id)
    const direct = c.kind === 'direct'
    return {
      id: m.chat_id,
      kind: c.kind,
      role: m.role,
      name: c.title ?? other?.display_name ?? 'Чат',
      username: direct ? (other?.username ?? null) : null,
      avatarUrl: direct ? (other?.avatar_url ?? null) : c.avatar_url,
      bio: direct ? (other?.bio ?? null) : null,
      otherId: direct ? (other?.id ?? null) : null,
      joinedAt: direct ? (other?.created_at ?? null) : null,
      number: direct ? (other?.showcase_number ?? null) : null,
      handles: direct ? (other?.handles ?? []) : [],
      description: c.description,
      isPublic: c.is_public,
      publicHandle: c.handle,
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
  chatId: string, senderId: string, body: string | null, replyTo: string | null, forwardedFrom: string | null = null,
  attachment: { path: string; type: 'image' | 'file' } | null = null,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages').insert({ chat_id: chatId, sender_id: senderId, body, reply_to: replyTo, forwarded_from: forwardedFrom,
      attachment_path: attachment?.path ?? null, attachment_type: attachment?.type ?? null })
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
export const unapplyItem = (id: string) => rpcVoid('market_unapply', { p_item: id })

// ---------- Группы, каналы, фото ----------
export async function createChat(
  kind: 'group' | 'channel', title: string, description: string, isPublic: boolean, handle: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_chat', {
    p_kind: kind, p_title: title, p_description: description, p_public: isPublic, p_handle: handle,
  })
  if (error) throw error
  return data as string
}

export const joinChat = (chatId: string) => rpcVoid('join_chat', { p_chat: chatId })
export const setProfileChannel = (chatId: string | null) => rpcVoid('set_profile_channel', { p_chat: chatId })

export async function joinByInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_by_invite', { p_code: code })
  if (error) throw error
  return data as string
}

export async function getInviteCode(chatId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_invite_code', { p_chat: chatId })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function searchPublicChats(query: string): Promise<PublicChat[]> {
  const q = query.toLowerCase().replace(/[^a-z0-9_а-яё ]/gi, '').trim()
  if (!q) return []
  const { data, error } = await supabase.rpc('search_public_chats', { p_query: q })
  if (error) throw error
  return ((data ?? []) as PublicChat[]).map((c) => ({ ...c, members: Number(c.members) }))
}

export async function profileChannel(userId: string): Promise<ProfileChannel | null> {
  const { data, error } = await supabase.rpc('profile_channel', { p_user: userId })
  if (error) throw error
  const row = ((data ?? []) as ProfileChannel[])[0]
  return row ? { ...row, members: Number(row.members) } : null
}

interface MemberRow { user_id: string; role: Role; profiles: { display_name: string; username: string; avatar_url: string | null } }

export async function fetchMembers(chatId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('chat_members').select('user_id, role, profiles!inner(display_name, username, avatar_url)').eq('chat_id', chatId)
  if (error) throw error
  return ((data ?? []) as unknown as MemberRow[]).map((r) => ({
    user_id: r.user_id, role: r.role, display_name: r.profiles.display_name,
    username: r.profiles.username, avatar_url: r.profiles.avatar_url,
  }))
}

export async function addMember(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chat_members').insert({ chat_id: chatId, user_id: userId, role: 'member' })
  if (error) throw error
}

export async function removeMember(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', userId)
  if (error) throw error
}

async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')
  if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height) }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать фото.'))), 'image/jpeg', 0.85))
}

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60) || 'file'

export async function uploadChatImage(chatId: string, file: File, asFile = false): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Только PNG, JPG, WebP или GIF.')
  if (file.size > 10 * 1024 * 1024) throw new Error(`Файл «${file.name}» больше 10 МБ.`)
  const gif = file.type === 'image/gif'
  const original = asFile || gif
  const body = original ? file : await compressImage(file)
  const id = crypto.randomUUID()
  const path = asFile ? `${chatId}/${id}__${safeName(file.name)}` : `${chatId}/${id}.${gif ? 'gif' : 'jpg'}`
  const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType: original ? file.type : 'image/jpeg' })
  if (error) throw error
  return path
}

export async function copyChatImage(path: string, targetChatId: string): Promise<string> {
  const tail = path.includes('__') ? path.slice(path.indexOf('__')) : `.${path.split('.').pop() ?? 'jpg'}`
  const dest = `${targetChatId}/${crypto.randomUUID()}${tail}`
  const { error } = await supabase.storage.from('attachments').copy(path, dest)
  if (error) throw error
  return dest
}
