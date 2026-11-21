import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type TraitKind = 'model' | 'backdrop' | 'symbol'
export interface UniqueGift {
  id: string; collection_id: string; number: number; model: string; backdrop: string; symbol: string
  owner_id: string; price: number | null; shown: boolean; created_at: string
}
export interface Trait { collection_id: string; kind: TraitKind; key: string; title: string; weight: number }
export interface Collection { id: string; title: string; description: string; supply: number; minted: number }
export interface HistoryRow { id: string; kind: 'mint' | 'send' | 'sale'; from_id: string | null; to_id: string | null; price: number | null; at: string }

const COLS = 'id, collection_id, number, model, backdrop, symbol, owner_id, price, shown, created_at'

export const KIND_TITLE: Record<TraitKind, string> = { model: 'Модель', backdrop: 'Фон', symbol: 'Узор' }

export async function myUnique(userId: string): Promise<UniqueGift[]> {
  const { data, error } = await supabase.from('unique_gifts').select(COLS).eq('owner_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data as UniqueGift[]
}

export async function profileUnique(userId: string): Promise<UniqueGift[]> {
  const { data, error } = await supabase.from('unique_gifts').select(COLS).eq('owner_id', userId).eq('shown', true).order('created_at', { ascending: false })
  if (error) throw error
  return data as UniqueGift[]
}

export async function uniqueForSale(): Promise<UniqueGift[]> {
  const { data, error } = await supabase.from('unique_gifts').select(COLS).not('price', 'is', null).order('price', { ascending: true }).limit(60)
  if (error) throw error
  return data as UniqueGift[]
}

export async function getUnique(id: string): Promise<UniqueGift | null> {
  const { data, error } = await supabase.from('unique_gifts').select(COLS).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as UniqueGift | null) ?? null
}

export async function uniqueHistory(id: string): Promise<HistoryRow[]> {
  const { data, error } = await supabase.from('unique_history').select('id, kind, from_id, to_id, price, at').eq('unique_id', id).order('at', { ascending: false })
  if (error) throw error
  return data as HistoryRow[]
}

export async function upgradeGift(ownedId: string): Promise<string> {
  const { data, error } = await supabase.rpc('upgrade_gift', { p_ug: ownedId })
  if (error) throw error
  const id = String(data)
  window.dispatchEvent(new CustomEvent('sunset:unique-open', { detail: id }))
  return id
}

export async function sendUnique(id: string, toId: string): Promise<void> {
  const { error } = await supabase.rpc('send_unique', { p_id: id, p_to: toId })
  if (error) throw error
}
export async function setUniqueShown(id: string, shown: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_unique_shown', { p_id: id, p_shown: shown })
  if (error) throw error
}
export async function listUnique(id: string, price: number | null): Promise<void> {
  const { error } = await supabase.rpc('list_unique', { p_id: id, p_price: price })
  if (error) throw error
}
export async function buyUnique(id: string): Promise<void> {
  const { error } = await supabase.rpc('buy_unique', { p_id: id })
  if (error) throw error
}

export function friendlyUnique(msg: string): string {
  if (msg.includes('not enough stars')) return 'Недостаточно Звёзд.'
  if (msg.includes('sold out')) return 'Тираж этой коллекции закончился.'
  if (msg.includes('not your gift')) return 'Этого подарка у вас уже нет.'
  if (msg.includes('not upgradable')) return 'Этот подарок нельзя улучшить.'
  if (msg.includes('item not for sale')) return 'Подарок уже не продаётся.'
  if (msg.includes('already yours')) return 'Это ваш подарок.'
  if (msg.includes('bad price')) return 'Некорректная цена.'
  if (msg.includes('bad recipient')) return 'Нельзя подарить этому пользователю.'
  if (msg.includes('unique_') || msg.includes('schema cache')) return 'Уникальные подарки не настроены: выполните SQL 0018.'
  return msg
}

export interface Meta { collections: Map<string, Collection>; traits: Map<string, Trait>; totals: Map<string, number> }
let metaPromise: Promise<Meta> | null = null

export function loadMeta(): Promise<Meta> {
  if (!metaPromise) {
    metaPromise = (async () => {
      const [c, t] = await Promise.all([
        supabase.from('unique_collections').select('id, title, description, supply, minted'),
        supabase.from('unique_traits').select('collection_id, kind, key, title, weight'),
      ])
      if (c.error) throw c.error
      if (t.error) throw t.error
      const collections = new Map((c.data as Collection[]).map((x) => [x.id, x]))
      const traits = new Map<string, Trait>()
      const totals = new Map<string, number>()
      for (const tr of t.data as Trait[]) {
        traits.set(`${tr.collection_id}:${tr.kind}:${tr.key}`, tr)
        const tk = `${tr.collection_id}:${tr.kind}`
        totals.set(tk, (totals.get(tk) ?? 0) + tr.weight)
      }
      return { collections, traits, totals }
    })().catch((e: unknown) => { metaPromise = null; throw e })
  }
  return metaPromise
}

export function useMeta(): Meta | null {
  const [m, setM] = useState<Meta | null>(null)
  useEffect(() => {
    let alive = true
    void loadMeta().then((x) => { if (alive) setM(x) }).catch(() => undefined)
    return () => { alive = false }
  }, [])
  return m
}

export function traitOf(meta: Meta | null, g: UniqueGift, kind: TraitKind): { title: string; percent: number | null } {
  const key = g[kind]
  const t = meta?.traits.get(`${g.collection_id}:${kind}:${key}`)
  const total = meta?.totals.get(`${g.collection_id}:${kind}`)
  return { title: t?.title ?? key, percent: t && total ? Math.round((t.weight / total) * 1000) / 10 : null }
}

export function uniqueTitle(meta: Meta | null, g: UniqueGift): string {
  return `${meta?.collections.get(g.collection_id)?.title ?? 'Подарок'} #${g.number}`
}
