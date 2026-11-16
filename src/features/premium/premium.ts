import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Кэш статуса Premium по id пользователя. Запросы собираются пачкой, чтобы список чатов не слал по запросу на строку.
const until = new Map<string, number>() // 0 = нет подписки
const requested = new Set<string>()
const queue = new Set<string>()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null

function emit() { listeners.forEach((l) => l()) }

function flush() {
  timer = null
  const ids = [...queue]
  queue.clear()
  if (ids.length === 0) return
  void supabase.from('profiles').select('id, premium_until').in('id', ids).then(({ data }) => {
    const rows = (data ?? []) as { id: string; premium_until: string | null }[]
    for (const id of ids) until.set(id, 0)
    for (const r of rows) until.set(r.id, r.premium_until ? Date.parse(r.premium_until) : 0)
    emit()
  })
}

function request(id: string) {
  if (requested.has(id)) return
  requested.add(id)
  queue.add(id)
  if (!timer) timer = setTimeout(flush, 40)
}

// Перечитать статус (например, после покупки подписки).
export function refreshPremium(id: string) {
  requested.delete(id)
  request(id)
}

export function premiumUntil(id: string): Date | null {
  const t = until.get(id) ?? 0
  return t > Date.now() ? new Date(t) : null
}

export function usePremium(userId: string | null | undefined): boolean {
  const [, force] = useState(0)
  useEffect(() => {
    if (!userId) return
    const l = () => force((n) => n + 1)
    listeners.add(l)
    request(userId)
    return () => { listeners.delete(l) }
  }, [userId])
  if (!userId) return false
  return (until.get(userId) ?? 0) > Date.now()
}

export async function buyPremium(months: number): Promise<void> {
  const { error } = await supabase.rpc('buy_premium', { p_months: months })
  if (error) throw error
}

export const OPEN_PREMIUM_EVENT = 'sunset:open-premium'
