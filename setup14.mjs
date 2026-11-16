import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

if (!existsSync('package.json') || !existsSync('src/features/chat/ChatView.tsx')) {
  console.error('Запусти скрипт из папки проекта (где лежит package.json и src/features/chat).')
  process.exit(1)
}

const files = {
  "src/lib/types.ts": `export type ChatKind = 'direct' | 'group' | 'channel' | 'saved'
export type Role = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  showcase_number: string | null
  handles: string[]
  channel_id: string | null
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  body: string | null
  reply_to: string | null
  created_at: string
  edited_at: string | null
  forwarded_from: string | null
  attachment_path: string | null
  attachment_type: 'image' | 'file' | 'voice' | null
}

export interface Reaction {
  message_id: string
  user_id: string
  emoji: string
}

export interface LastMessage {
  body: string | null
  created_at: string
  sender_id: string
  attachment_type?: 'image' | 'file' | 'voice' | null
}

export interface ChatItem {
  id: string
  kind: ChatKind
  role: Role
  name: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  otherId: string | null
  joinedAt: string | null
  number: string | null
  handles: string[]
  description: string | null
  isPublic: boolean
  publicHandle: string | null
}

export interface PublicChat {
  id: string
  kind: 'group' | 'channel'
  title: string
  description: string | null
  handle: string | null
  avatar_url: string | null
  members: number
  joined: boolean
}

export interface ProfileChannel {
  id: string
  title: string
  is_public: boolean
  members: number
  joined: boolean
}

export interface Member {
  user_id: string
  role: Role
  display_name: string
  username: string
  avatar_url: string | null
}

export interface MarketItem {
  id: string
  kind: 'number' | 'username'
  value: string
  owner_id: string | null
  price: number | null
}
`,
  "src/features/chat/api.ts": `import { supabase } from '../../lib/supabase'
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
      .from('chat_members').select(\`chat_id, profiles!inner(\${PROFILE_COLS})\`)
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
  attachment: { path: string; type: 'image' | 'file' | 'voice' } | null = null,
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
  const path = \`\${userId}/avatar-\${Date.now()}.\${ext}\`
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
  return Object.fromEntries(rows.map((r) => [r.chat_id, {
    body: r.body,
    created_at: r.created_at,
    sender_id: r.sender_id,
    attachment_type: r.attachment_type ?? null,
  }]))
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
  if (file.size > 10 * 1024 * 1024) throw new Error(\`Файл «\${file.name}» больше 10 МБ.\`)
  const gif = file.type === 'image/gif'
  const original = asFile || gif
  const body = original ? file : await compressImage(file)
  const id = crypto.randomUUID()
  const path = asFile ? \`\${chatId}/\${id}__\${safeName(file.name)}\` : \`\${chatId}/\${id}.\${gif ? 'gif' : 'jpg'}\`
  const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType: original ? file.type : 'image/jpeg' })
  if (error) throw error
  return path
}

const VOICE_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
}

export async function uploadChatVoice(chatId: string, blob: Blob, mime = blob.type): Promise<string> {
  const base = mime.split(';')[0].trim().toLowerCase()
  const ext = VOICE_TYPES[mime] ?? VOICE_TYPES[base] ?? 'webm'
  if (!VOICE_TYPES[mime] && !VOICE_TYPES[base] && !base.startsWith('audio/')) {
    throw new Error('Неподдерживаемый формат аудио.')
  }
  if (blob.size > 5 * 1024 * 1024) throw new Error('Голосовое больше 5 МБ.')
  if (blob.size < 200) throw new Error('Слишком короткая запись.')
  const path = \`\${chatId}/\${crypto.randomUUID()}.\${ext}\`
  const contentType = base.startsWith('audio/') ? base : 'audio/webm'
  const { error } = await supabase.storage.from('attachments').upload(path, blob, { contentType })
  if (error) throw error
  return path
}

export async function copyChatImage(path: string, targetChatId: string): Promise<string> {
  const tail = path.includes('__') ? path.slice(path.indexOf('__')) : \`.\${path.split('.').pop() ?? 'jpg'}\`
  const dest = \`\${targetChatId}/\${crypto.randomUUID()}\${tail}\`
  const { error } = await supabase.storage.from('attachments').copy(path, dest)
  if (error) throw error
  return dest
}
`,
  "src/features/chat/hooks.ts": `import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
      .channel(\`my-chats:\${myId}\`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: \`user_id=eq.\${myId}\` },
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

  return { chats: sorted, loading, unread, last, reload }
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

const rKey = (r: Reaction) => \`\${r.message_id}|\${r.user_id}|\${r.emoji}\`

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
      .channel(\`chat:\${chatId}\`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: \`chat_id=eq.\${chatId}\` },
        (payload) => { setTyping(false); add(payload.new as Message) })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: \`chat_id=eq.\${chatId}\` },
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
        { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: \`chat_id=eq.\${chatId}\` },
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
`,
  "src/features/chat/ChatView.tsx": `import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type MouseEvent, type TouchEvent } from 'react'
import { ArrowLeft, Check, CheckCheck, Copy, Forward, ImagePlus, Mic, PanelRight, Paperclip, Pencil, Pin, Reply, SendHorizontal, Trash2, X } from 'lucide-react'
import type { ChatItem, Message } from '../../lib/types'
import { clearPin, copyChatImage, deleteMessage, sendMessage, setPin, updateMessage, uploadChatImage, uploadChatVoice } from './api'
import { useImageUrls, useMessages, useProfileNames } from './hooks'
import ChatAvatar from './ChatAvatar'
import ForwardModal from './ForwardModal'
import SendImageModal from './SendImageModal'
import MessageMenu, { type MenuAction } from './MessageMenu'
import VoiceMessage from './VoiceMessage'

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

const fileName = (path: string) => (path.includes('__') ? path.slice(path.indexOf('__') + 2) : 'Файл')

function formatFull(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return \`сегодня в \${time}\`
  if (d.toDateString() === yesterday.toDateString()) return \`вчера в \${time}\`
  return \`\${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} в \${time}\`
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewer, setViewer] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<File[] | null>(null)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const recStartRef = useRef(0)
  const urls = useImageUrls(messages)
  const names = useProfileNames(messages)
  const saved = chat.kind === 'saved'
  const direct = chat.kind === 'direct'
  const canPost = chat.kind !== 'channel' || chat.role !== 'member'

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  useEffect(() => () => {
    clearInterval(recTimerRef.current)
    mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop()
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const byMessage = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>()
    for (const r of reactions) {
      const emojis = map.get(r.message_id) ?? new Map<string, string[]>()
      emojis.set(r.emoji, [...(emojis.get(r.emoji) ?? []), r.user_id])
      map.set(r.message_id, emojis)
    }
    return map
  }, [reactions])

  const status = typing ? 'печатает…' : saved ? 'Только для вас' : chat.kind === 'group' ? 'Группа' : chat.kind === 'channel' ? 'Канал' : online ? 'в сети' : chat.username ? \`@\${chat.username}\` : ''
  const pinned = pinId ? messages.find((m) => m.id === pinId) : undefined
  const selectedMessages = messages.filter((m) => selected.has(m.id))
  const fail = (e: unknown) => setSendError((e as Error).message)
  const isRead = (m: Message) => peerReadAt !== null && Date.parse(peerReadAt) >= Date.parse(m.created_at)
  const senderName = (m: Message) => (m.sender_id === myId ? myName : (names[m.sender_id] ?? chat.name))

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
      try {
        const att = m.attachment_path
          ? {
              path: await copyChatImage(m.attachment_path, target.id),
              type: (m.attachment_type === 'file' ? 'file' : m.attachment_type === 'voice' ? 'voice' : 'image') as 'image' | 'file' | 'voice',
            }
          : null
        await sendMessage(target.id, myId, m.body, null, m.forwarded_from ?? senderName(m), att)
      } catch (e) { fail(e) }
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

  function onPickImages(e: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (list.length > 0) setPending(list)
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const list = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0 || !canPost || editing) return
    e.preventDefault()
    setPending(list)
  }

  async function sendImages(list: File[], caption: string, asFile: boolean) {
    setPending(null)
    setUploading(true); setSendError(null)
    const reply = replyTo
    setText(''); setReplyTo(null)
    try {
      for (let i = 0; i < list.length; i++) {
        const path = await uploadChatImage(chat.id, list[i], asFile)
        const first = i === 0
        add(await sendMessage(chat.id, myId, first ? caption.trim() || null : null, first ? (reply?.id ?? null) : null, null,
          { path, type: asFile ? 'file' : 'image' }))
      }
    } catch (err) { fail(err) } finally { setUploading(false) }
  }

  function pickMime(): string {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus'
    return ''
  }

  function stopTracks() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
  }

  function clearRecTimer() {
    clearInterval(recTimerRef.current)
    recTimerRef.current = undefined
  }

  async function startRecording() {
    if (recording || uploading || editing || !canPost) return
    setSendError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setSendError('Браузер не поддерживает запись звука.')
      return
    }
    const mime = pickMime()
    if (!mime && typeof MediaRecorder === 'undefined') {
      setSendError('MediaRecorder недоступен в этом браузере.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onerror = () => {
        setSendError('Ошибка записи.')
        setRecording(false)
        clearRecTimer()
        stopTracks()
      }
      mediaRecorderRef.current = rec
      rec.start(250)
      recStartRef.current = Date.now()
      setRecSecs(0)
      setRecording(true)
      recTimerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - recStartRef.current) / 1000)
        setRecSecs(s)
        if (s >= 300) void finishRecording(true)
      }, 250)
    } catch {
      stopTracks()
      setSendError('Нет доступа к микрофону.')
    }
  }

  function cancelRecording() {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.ondataavailable = null
      rec.onstop = () => { stopTracks(); chunksRef.current = [] }
      try { rec.stop() } catch { /* ignore */ }
    } else stopTracks()
    mediaRecorderRef.current = null
    clearRecTimer()
    setRecording(false)
    setRecSecs(0)
  }

  async function finishRecording(send: boolean) {
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === 'inactive') {
      cancelRecording()
      return
    }
    clearRecTimer()
    setRecording(false)
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
      try { rec.stop() } catch { resolve() }
    })
    stopTracks()
    mediaRecorderRef.current = null
    const mime = rec.mimeType || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type: mime })
    chunksRef.current = []
    const elapsed = Math.floor((Date.now() - recStartRef.current) / 1000)
    setRecSecs(0)
    if (!send || elapsed < 1) return
    setUploading(true)
    setSendError(null)
    const reply = replyTo
    setReplyTo(null)
    try {
      const path = await uploadChatVoice(chat.id, blob, mime)
      add(await sendMessage(chat.id, myId, null, reply?.id ?? null, null, { path, type: 'voice' }))
    } catch (err) { fail(err) } finally { setUploading(false) }
  }

  const headerInfo = (
    <>
      <ChatAvatar chat={chat} size={40} online={online} />
      <div className="min-w-0 text-left">
        <div className="truncate text-sm font-medium">{chat.name}</div>
        <div className={\`truncate text-xs \${typing || online ? 'text-accent' : 'text-muted'}\`}>{status}</div>
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
              onClick={() => { void navigator.clipboard.writeText(selectedMessages.map((m) => m.body ?? '').join('\\n')); exitSelect() }}>
              <Copy size={18} />
            </button>
            <button title="Переслать" disabled={selected.size === 0} className={barBtn} onClick={() => setForwarding(selectedMessages)}>
              <Forward size={18} />
            </button>
            {allMine && (
              <button title="Удалить" className={\`\${barBtn} text-pink\`} onClick={() => { void removeMessages(selectedMessages); exitSelect() }}>
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
            onClick={() => document.getElementById(\`msg-\${pinId}\`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            <span className="text-xs text-accent">Закреплено · </span>
            {pinned?.body
              ?? (pinned?.attachment_type === 'voice' ? '🎤 Голосовое'
                : pinned?.attachment_path ? '📷 Фото' : 'сообщение')}
          </button>
          <button title="Открепить" className="text-muted hover:text-text"
            onClick={() => void clearPin(chat.id).then(() => setPinId(null)).catch(fail)}><X size={14} /></button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {background && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: \`url(\${background})\` }} />}
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
              <div key={m.id} id={\`msg-\${m.id}\`} className={\`flex \${mine ? 'justify-end' : 'justify-start'}\`}
                onClick={() => { if (selectMode) toggleSelect(m.id) }}>
                <div className="relative max-w-[75%]">
                  <div onContextMenu={(e) => openMenu(e, m)} onTouchStart={(e) => startPress(e, m)}
                    onTouchEnd={cancelPress} onTouchMove={cancelPress}
                    className={\`rounded-2xl px-4 py-2 text-sm select-none md:select-text \${
                      mine ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-surface'} \${
                      selected.has(m.id) ? 'ring-2 ring-text' : ''}\`}>
                    {!mine && chat.kind === 'group' && (
                      <div className="mb-1 text-xs font-medium text-accent">{names[m.sender_id] ?? '…'}</div>
                    )}
                    {m.forwarded_from && (
                      <div className={\`mb-1 text-xs \${mine ? 'text-on-accent/80' : 'text-accent'}\`}>Переслано от {m.forwarded_from}</div>
                    )}
                    {m.reply_to && (
                      <div className={\`mb-1 truncate border-l-2 pl-2 text-xs \${
                        mine ? 'border-on-accent/50 text-on-accent/80' : 'border-accent text-muted'}\`}>
                        {original?.body
                          ?? (original?.attachment_type === 'voice' ? '🎤 Голосовое'
                            : original?.attachment_path ? '📷 Фото' : 'Сообщение')}
                      </div>
                    )}
                    {m.attachment_path && (
                      !urls[m.attachment_path]
                        ? (
                          <div className={\`mb-1 animate-pulse rounded-xl bg-bg/30 \${
                            m.attachment_type === 'voice' ? 'h-10 w-52' : 'h-40 w-56'}\`} />
                        )
                        : m.attachment_type === 'voice'
                          ? <VoiceMessage src={urls[m.attachment_path]} mine={mine} />
                          : m.attachment_type === 'file'
                            ? (
                              <a href={urls[m.attachment_path]} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                className="mb-1 flex items-center gap-3 rounded-xl bg-bg/20 p-2">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg/30"><Paperclip size={18} /></span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm">{fileName(m.attachment_path)}</span>
                                  <span className="block text-xs opacity-70">Скачать</span>
                                </span>
                              </a>
                            )
                            : <img src={urls[m.attachment_path]} alt="" className="mb-1 max-h-72 max-w-full cursor-zoom-in rounded-xl object-cover"
                                onClick={(e) => { e.stopPropagation(); if (!selectMode) setViewer(urls[m.attachment_path!]) }} />
                    )}
                    {m.body && <p className="break-words whitespace-pre-wrap">{m.body}</p>}
                    <div className={\`mt-1 flex items-center justify-end gap-1 text-[10px] \${mine ? 'text-on-accent/70' : 'text-muted'}\`}>
                      {m.edited_at && <span>изменено</span>}
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {ticks && (isRead(m) ? <CheckCheck size={12} /> : <Check size={12} />)}
                    </div>
                  </div>
                  {chips && (
                    <div className={\`mt-1 flex flex-wrap gap-1 \${mine ? 'justify-end' : ''}\`}>
                      {[...chips].map(([emoji, users]) => (
                        <button key={emoji} onClick={() => void toggleReaction(m.id, emoji)}
                          className={\`rounded-full px-2 py-0.5 text-xs transition \${
                            users.includes(myId) ? 'bg-accent/30 ring-1 ring-accent' : 'bg-surface'}\`}>
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

      {!canPost ? (
        <div className="border-t border-line bg-bg2 p-4 text-center text-sm text-muted">Писать в канал могут только администраторы</div>
      ) : (
      <form onSubmit={onSubmit} className="border-t border-line bg-bg2 p-3">
        {(replyTo || editing) && !recording && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
            {editing ? <Pencil size={14} className="text-accent" /> : <Reply size={14} className="text-accent" />}
            <span className="flex-1 truncate text-muted">
              {editing
                ? \`Изменение: \${editing.body ?? ''}\`
                : (replyTo?.body
                  ?? (replyTo?.attachment_type === 'voice' ? '🎤 Голосовое'
                    : replyTo?.attachment_path ? '📷 Фото' : 'Сообщение'))}
            </span>
            <button type="button" className="text-muted hover:text-text"
              onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setText('') } }}><X size={14} /></button>
          </div>
        )}
        {sendError && <p className="mb-2 text-xs text-pink">Ошибка: {sendError}</p>}
        {recording ? (
          <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-1.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-pink" />
            </span>
            <span className="flex-1 text-sm tabular-nums text-pink">
              {Math.floor(recSecs / 60)}:{(recSecs % 60).toString().padStart(2, '0')}
            </span>
            <button type="button" title="Отменить" onClick={cancelRecording}
              className="rounded-xl p-2 text-muted transition hover:text-text"><Trash2 size={18} /></button>
            <button type="button" title="Отправить" disabled={uploading || recSecs < 1}
              onClick={() => void finishRecording(true)}
              className="rounded-xl p-2 text-accent transition hover:bg-bg2 disabled:opacity-40">
              <SendHorizontal size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-1.5">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onPickImages} />
            <button type="button" title="Отправить фото" disabled={uploading || !!editing} onClick={() => fileRef.current?.click()}
              className="rounded-xl p-2 text-muted transition hover:text-text disabled:opacity-40"><ImagePlus size={20} /></button>
            <input value={text} maxLength={4000} placeholder="Сообщение" onPaste={onPaste}
              onChange={(e) => { setText(e.target.value); if (e.target.value && !saved && !editing) sendTyping() }}
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted" />
            {text.trim() || editing ? (
              <button type="submit" disabled={!text.trim()} title={editing ? 'Сохранить' : 'Отправить'}
                className="rounded-xl p-2 text-accent transition hover:bg-bg2 disabled:opacity-40">
                {editing ? <Check size={20} /> : <SendHorizontal size={20} />}
              </button>
            ) : (
              <button type="button" title="Голосовое сообщение" disabled={uploading}
                onClick={() => void startRecording()}
                className="rounded-xl p-2 text-accent transition hover:bg-bg2 disabled:opacity-40">
                <Mic size={20} />
              </button>
            )}
          </div>
        )}
      </form>
      )}

      {menu && (
        <MessageMenu x={menu.x} y={menu.y} mine={menu.m.sender_id === myId} pinned={pinId === menu.m.id} emojis={EMOJIS}
          time={formatFull(menu.m.created_at)} read={menu.m.sender_id === myId && direct ? isRead(menu.m) : null}
          onReact={(e) => { void toggleReaction(menu.m.id, e); setMenu(null) }}
          onAction={(a) => void onAction(a, menu.m)} onClose={() => setMenu(null)} />
      )}
      {pending && (
        <SendImageModal files={pending} initialCaption={text} onCancel={() => setPending(null)}
          onSend={(list, caption, asFile) => void sendImages(list, caption, asFile)} />
      )}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setViewer(null)}>
          <img src={viewer} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
      {forwarding && (
        <ForwardModal chats={chats} count={forwarding.length} onPick={(c) => void doForward(c)} onClose={() => setForwarding(null)} />
      )}
    </section>
  )
}
`,
  "src/features/chat/Sidebar.tsx": `import { useEffect, useState } from 'react'
import { BellOff, Plus, Search } from 'lucide-react'
import type { ChatItem, LastMessage, Profile, PublicChat } from '../../lib/types'
import { plural } from '../../lib/format'
import { createDirectChat, joinChat, searchProfiles, searchPublicChats } from './api'
import Avatar from './Avatar'
import ChatAvatar from './ChatAvatar'
import UsernameLine from './UsernameLine'

interface Props {
  myId: string
  chats: ChatItem[]
  loading: boolean
  selectedId: string | null
  unread: Record<string, number>
  last: Record<string, LastMessage>
  online: Set<string>
  muted: string[]
  onSelect: (id: string) => void
  onChatCreated: () => Promise<void>
  onNewChat: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function Sidebar({ myId, chats, loading, selectedId, unread, last, online, muted, onSelect, onChatCreated, onNewChat }: Props) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Profile[]>([])
  const [publics, setPublics] = useState<PublicChat[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setPeople([]); setPublics([]); return }
    const t = setTimeout(() => {
      Promise.all([searchProfiles(query), searchPublicChats(query)])
        .then(([p, c]) => { setPeople(p); setPublics(c) })
        .catch((e: Error) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  async function startChat(other: Profile) {
    try {
      const id = await createDirectChat(other.id)
      await onChatCreated()
      onSelect(id)
      setQuery('')
    } catch (e) { setError((e as Error).message) }
  }

  async function openPublic(c: PublicChat) {
    try {
      if (!c.joined) { await joinChat(c.id); await onChatCreated() }
      onSelect(c.id)
      setQuery('')
    } catch (e) { setError((e as Error).message) }
  }

  const rowCls = 'flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface'

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col bg-bg2 md:w-80 md:flex-none md:border-r md:border-line">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-xl font-semibold">Чаты</h1>
        <button onClick={onNewChat} title="Новая группа или канал"
          className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-text"><Plus size={20} /></button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Люди, группы и каналы"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </div>
        {error && <p className="mt-2 text-xs text-pink">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {query.trim() ? (
          people.length === 0 && publics.length === 0 ? (
            <p className="p-4 text-sm text-muted">Ничего не найдено</p>
          ) : (
            <>
              {people.map((p) => (
                <button key={p.id} onClick={() => void startChat(p)} className={rowCls}>
                  <Avatar name={p.display_name} url={p.avatar_url} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.display_name}</div>
                    <div className="text-xs"><UsernameLine muted username={p.username} handles={p.handles} /></div>
                  </div>
                </button>
              ))}
              {publics.map((c) => (
                <button key={c.id} onClick={() => void openPublic(c)} className={rowCls}>
                  <Avatar name={c.title} url={c.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="truncate text-xs text-muted">
                      {c.kind === 'channel' ? plural(c.members, ['подписчик', 'подписчика', 'подписчиков']) : plural(c.members, ['участник', 'участника', 'участников'])}
                      {c.handle ? \` · @\${c.handle}\` : ''}
                    </div>
                  </div>
                  <span className="text-xs text-accent">{c.joined ? 'Открыть' : 'Вступить'}</span>
                </button>
              ))}
            </>
          )
        ) : loading ? (
          <div className="space-y-3 p-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />)}
          </div>
        ) : (
          chats.map((c) => {
            const l = last[c.id]
            const isMuted = muted.includes(c.id)
            const count = unread[c.id] ?? 0
            return (
              <button key={c.id} onClick={() => onSelect(c.id)}
                className={\`\${rowCls} \${c.id === selectedId ? 'bg-surface' : ''}\`}>
                <ChatAvatar chat={c} online={c.otherId !== null && online.has(c.otherId)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                    {isMuted && <BellOff size={12} className="text-muted" />}
                    {l && <span className="text-xs text-muted">{formatTime(l.created_at)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-muted">
                      {l
                        ? \`\${l.sender_id === myId && c.kind !== 'saved' ? 'Вы: ' : ''}\${
                            l.body
                              ?? (l.attachment_type === 'voice' ? '🎤 Голосовое'
                                : l.attachment_type === 'file' ? '📎 Файл'
                                  : '📷 Фото')
                          }\`
                        : 'Сообщений пока нет'}
                    </span>
                    {count > 0 && (
                      <span className={\`rounded-full px-2 py-0.5 text-xs font-semibold \${
                        isMuted ? 'bg-surface text-muted' : 'bg-accent text-on-accent'}\`}>{count}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
`,
  "src/features/chat/VoiceMessage.tsx": `import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Pause, Play } from 'lucide-react'

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return \`\${m}:\${sec.toString().padStart(2, '0')}\`
}

interface Props {
  src: string
  mine: boolean
}

export default function VoiceMessage({ src, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(src)
    audio.preload = 'metadata'
    audioRef.current = audio

    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    const onTime = () => setCurrent(audio.currentTime)
    const onEnded = () => { setPlaying(false); setCurrent(0) }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audioRef.current = null
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => undefined)
    else audio.pause()
  }

  function seek(e: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const t = Number(e.target.value)
    audio.currentTime = t
    setCurrent(t)
  }

  const total = duration > 0 ? duration : 0
  const progress = total > 0 ? current / total : 0
  const btn = mine
    ? 'bg-on-accent/20 text-on-accent hover:bg-on-accent/30'
    : 'bg-accent/20 text-accent hover:bg-accent/30'
  const track = mine ? 'bg-on-accent/25' : 'bg-text/15'
  const fill = mine ? 'bg-on-accent' : 'bg-accent'

  return (
    <div className="mb-1 flex min-w-[200px] max-w-[280px] items-center gap-2 py-0.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={toggle} title={playing ? 'Пауза' : 'Слушать'}
        className={\`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition \${btn}\`}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full">
          <div className={\`absolute inset-0 \${track}\`} />
          <div className={\`absolute inset-y-0 left-0 \${fill}\`} style={{ width: \`\${progress * 100}%\` }} />
          <input type="range" min={0} max={total || 1} step={0.01} value={current}
            onChange={seek} disabled={!total}
            className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default" />
        </div>
        <div className={\`mt-1 flex justify-between text-[10px] tabular-nums \${mine ? 'text-on-accent/70' : 'text-muted'}\`}>
          <span>{formatSec(current)}</span>
          <span>{formatSec(total)}</span>
        </div>
      </div>
    </div>
  )
}
`,
  "supabase/migrations/0008_voice.sql": `-- SUNSET: превью голосовых в списке чатов (attachment_type в last_messages)

create or replace function public.last_messages()
returns table (
  chat_id uuid,
  body text,
  created_at timestamptz,
  sender_id uuid,
  attachment_type text
)
language sql stable security invoker set search_path = '' as $$
  select distinct on (m.chat_id)
    m.chat_id,
    m.body,
    m.created_at,
    m.sender_id,
    m.attachment_type
  from public.messages m
  where m.deleted_at is null
  order by m.chat_id, m.created_at desc;
$$;

revoke all on function public.last_messages() from public, anon;
grant execute on function public.last_messages() to authenticated;
`,
}

for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
  console.log('записан', path)
}

console.log('')
console.log('Готово! Голосовые сообщения в коде.')
console.log('SQL сам впиши в Supabase SQL Editor из файла:')
console.log('  supabase/migrations/0008_voice.sql')
console.log('(Без SQL голосовые в чате работают, но в списке чатов превью может быть «📷 Фото».)')
