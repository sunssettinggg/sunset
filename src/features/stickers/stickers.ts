import { supabase } from '../../lib/supabase'

export type StickerKind = 'sticker' | 'gif'
export interface UserSticker { id: string; kind: StickerKind; path: string }

export const isStickerType = (t: string | null | undefined): t is StickerKind => t === 'sticker' || t === 'gif'

export function stickerUrl(path: string): string {
  return supabase.storage.from('stickers').getPublicUrl(path).data.publicUrl
}

// Подпись для превью (список чатов, ответы, закреп).
export function attLabel(type: string | null | undefined): string {
  if (type === 'voice') return '🎤 Голосовое'
  if (type === 'file') return '📎 Файл'
  if (type === 'gift') return '🎁 Подарок'
  if (type === 'sticker') return 'Стикер'
  if (type === 'gif') return 'GIF'
  return '📷 Фото'
}

const MAX_STICKER_BYTES = 2 * 1024 * 1024
const MAX_GIF_BYTES = 8 * 1024 * 1024

export async function listMine(): Promise<UserSticker[]> {
  const { data, error } = await supabase.from('user_stickers').select('id, kind, path').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as UserSticker[]
}

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('not authenticated')
  return id
}

// Обычные картинки для стикеров уменьшаем до 512 px (прозрачность сохраняется); GIF и анимированные оставляем как есть.
export async function shrink(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  if (file.type === 'image/gif') return { blob: file, ext: 'gif', type: 'image/gif' }
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.9))
    if (blob && blob.size > 0) return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'png', type: blob.type || 'image/png' }
  } catch { /* оставим как есть */ }
  return { blob: file, ext: file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg', type: file.type }
}

export async function addSticker(file: File, kind: StickerKind): Promise<UserSticker> {
  if (!/^image\/(png|webp|gif|jpeg)$/.test(file.type)) throw new Error('Подходят PNG, WebP, GIF и JPEG.')
  const uid = await myId()
  let body: Blob = file
  let ext = file.type === 'image/gif' ? 'gif' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  let type = file.type
  if (kind === 'sticker') {
    const s = await shrink(file)
    body = s.blob; ext = s.ext; type = s.type
    if (body.size > MAX_STICKER_BYTES && type !== 'image/gif') throw new Error('Стикер больше 2 МБ.')
  }
  if (body.size > (kind === 'gif' ? MAX_GIF_BYTES : MAX_STICKER_BYTES)) throw new Error(kind === 'gif' ? 'GIF больше 8 МБ.' : 'Стикер больше 2 МБ.')
  const path = `${uid}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('stickers').upload(path, body, { contentType: type })
  if (up.error) throw up.error
  const { data, error } = await supabase.from('user_stickers').insert({ kind, path }).select('id, kind, path').single()
  if (error) throw error
  return data as UserSticker
}

// Сохранить стикер/GIF из чужого сообщения в свою коллекцию (файл тот же).
export async function saveFromMessage(path: string, kind: StickerKind): Promise<void> {
  const { error } = await supabase.from('user_stickers').upsert({ kind, path }, { onConflict: 'user_id,kind,path', ignoreDuplicates: true })
  if (error) throw error
}

export async function removeSticker(id: string): Promise<void> {
  const { error } = await supabase.from('user_stickers').delete().eq('id', id)
  if (error) throw error
}

export function friendlyStickerError(msg: string): string {
  if (msg.includes('sticker limit')) return 'Достигнут лимит: 300 штук.'
  if (msg.includes('row-level security') || msg.includes('Bucket not found')) return 'Хранилище стикеров не настроено: выполните SQL 0016.'
  return msg
}

const RECENT_KEY = 'sunset.stickers.recent'
export interface RecentItem { kind: StickerKind; path: string }

export function getRecent(kind: StickerKind): RecentItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return (Array.isArray(v) ? v : []).filter((x): x is RecentItem => !!x && (x as RecentItem).kind === kind && typeof (x as RecentItem).path === 'string')
  } catch { return [] }
}

export function pushRecent(item: RecentItem) {
  try {
    const all: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const rest = (Array.isArray(all) ? all : []).filter((x) => !(x && (x as RecentItem).path === item.path))
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...rest].slice(0, 40)))
  } catch { /* необязательно */ }
}
