import { supabase } from '../../lib/supabase'
import { shrink } from './stickers'

export const MAX_PACKS = 20
export const MAX_ITEMS = 120

export interface PackItem { id: string; path: string; position: number }
export interface Pack { id: string; owner_id: string; title: string; short_code: string; owner_name: string | null; items: PackItem[] }
export interface PackInfo { id: string; title: string; code: string; owner_name: string | null; mine: boolean; subscribed: boolean; items: string[] }

interface PackRow {
  id: string; owner_id: string; title: string; short_code: string
  sticker_pack_items: PackItem[] | null
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export function friendlyPackError(msg: string): string {
  if (msg.includes('pack limit')) return `Можно создать не больше ${MAX_PACKS} наборов.`
  if (msg.includes('item limit')) return `В наборе не больше ${MAX_ITEMS} стикеров.`
  if (msg.includes('sub limit')) return 'Добавлено слишком много наборов.'
  if (msg.includes('pack not found')) return 'Набор с таким кодом не найден.'
  if (msg.includes('duplicate key')) return 'Такой стикер уже есть в наборе.'
  if (msg.includes('sticker_packs') || msg.includes('schema cache') || msg.includes('pack_by_')) return 'Наборы не настроены: выполните SQL 0017.'
  return msg
}

export const stickersWord = (n: number): string => {
  const a = n % 100, b = n % 10
  if (a >= 11 && a <= 14) return 'стикеров'
  if (b === 1) return 'стикер'
  if (b >= 2 && b <= 4) return 'стикера'
  return 'стикеров'
}

export async function meId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('not authenticated')
  return id
}

export async function listPacks(): Promise<Pack[]> {
  const { data, error } = await supabase.from('sticker_packs')
    .select('id, owner_id, title, short_code, sticker_pack_items(id, path, position)')
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as unknown as PackRow[]
  const owners = [...new Set(rows.map((r) => r.owner_id))]
  const names: Record<string, string | null> = {}
  if (owners.length > 0) {
    const pr = await supabase.from('profiles').select('id, display_name').in('id', owners)
    for (const p of (pr.data ?? []) as { id: string; display_name: string | null }[]) names[p.id] = p.display_name
  }
  return rows.map((r) => ({
    id: r.id, owner_id: r.owner_id, title: r.title, short_code: r.short_code,
    owner_name: names[r.owner_id] ?? null,
    items: [...(r.sticker_pack_items ?? [])].sort((a, b) => a.position - b.position),
  }))
}

export async function createPack(title: string): Promise<Pack> {
  const uid = await meId()
  const { data, error } = await supabase.from('sticker_packs').insert({ title: title.trim() }).select('id, owner_id, title, short_code').single()
  if (error) throw error
  const r = data as { id: string; owner_id: string; title: string; short_code: string }
  return { ...r, owner_name: null, items: [], owner_id: r.owner_id || uid }
}

export async function renamePack(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('sticker_packs').update({ title: title.trim() }).eq('id', id)
  if (error) throw error
}

export async function deletePack(id: string): Promise<void> {
  const { error } = await supabase.from('sticker_packs').delete().eq('id', id)
  if (error) throw error
}

export async function uploadStickerFile(file: File): Promise<string> {
  if (!/^image\/(png|webp|gif|jpeg)$/.test(file.type)) throw new Error('Подходят PNG, WebP, GIF и JPEG.')
  const uid = await meId()
  const s = await shrink(file)
  if (s.blob.size > 2 * 1024 * 1024) throw new Error('Стикер больше 2 МБ.')
  const path = `${uid}/${crypto.randomUUID()}.${s.ext}`
  const up = await supabase.storage.from('stickers').upload(path, s.blob, { contentType: s.type })
  if (up.error) throw up.error
  return path
}

export async function addItem(packId: string, path: string, position: number): Promise<PackItem> {
  const { data, error } = await supabase.from('sticker_pack_items').insert({ pack_id: packId, path, position }).select('id, path, position').single()
  if (error) throw error
  return data as PackItem
}

export async function removeItem(id: string): Promise<void> {
  const { error } = await supabase.from('sticker_pack_items').delete().eq('id', id)
  if (error) throw error
}

export async function packByCode(code: string): Promise<PackInfo | null> {
  const { data, error } = await supabase.rpc('pack_by_code', { p_code: code })
  if (error) throw error
  return (data as PackInfo | null) ?? null
}

export async function packByPath(path: string): Promise<PackInfo | null> {
  const { data, error } = await supabase.rpc('pack_by_path', { p_path: path })
  if (error) throw error
  return (data as PackInfo | null) ?? null
}

export async function subscribePack(code: string): Promise<void> {
  const { error } = await supabase.rpc('subscribe_pack', { p_code: code })
  if (error) throw error
}

export async function unsubscribePack(packId: string): Promise<void> {
  const uid = await meId()
  const { error } = await supabase.from('sticker_pack_subs').delete().eq('pack_id', packId).eq('user_id', uid)
  if (error) throw error
}

// Код из ссылки или просто код.
export function parseCode(input: string): string {
  const t = input.trim()
  const m = /pack=([0-9a-fA-F]+)/.exec(t)
  return (m ? m[1] : t.replace(/[^0-9a-zA-Z]/g, '')).toLowerCase()
}
