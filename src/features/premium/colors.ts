import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface ProfileColors { name: string | null; username: string | null; profile: string | null; bubble: string | null }

// Цвета Premium по id пользователя. Запросы собираются пачкой. Цвета действуют, только пока подписка активна.
const cache = new Map<string, ProfileColors | null>()
const requested = new Set<string>()
const queue = new Set<string>()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null

interface Row { id: string; premium_until: string | null; name_color: string | null; username_color: string | null; profile_color: string | null; bubble_color: string | null }

function emit() { listeners.forEach((l) => l()) }

function flush() {
  timer = null
  const ids = [...queue]
  queue.clear()
  if (ids.length === 0) return
  void supabase.from('profiles').select('id, premium_until, name_color, username_color, profile_color, bubble_color').in('id', ids).then(({ data }) => {
    for (const id of ids) cache.set(id, null)
    for (const r of (data ?? []) as Row[]) {
      const active = r.premium_until !== null && Date.parse(r.premium_until) > Date.now()
      cache.set(r.id, active && (r.name_color || r.username_color || r.profile_color || r.bubble_color)
        ? { name: r.name_color, username: r.username_color, profile: r.profile_color, bubble: r.bubble_color } : null)
    }
    emit()
  })
}

function request(id: string) {
  if (requested.has(id)) return
  requested.add(id)
  queue.add(id)
  if (!timer) timer = setTimeout(flush, 40)
}

export function refreshColors(id: string) {
  requested.delete(id)
  request(id)
}

export function useColors(userId: string | null | undefined): ProfileColors | null {
  const [, force] = useState(0)
  useEffect(() => {
    if (!userId) return
    const l = () => force((n) => n + 1)
    listeners.add(l)
    request(userId)
    return () => { listeners.delete(l) }
  }, [userId])
  return userId ? cache.get(userId) ?? null : null
}

// Для списка (например, сообщений): один подписчик на много пользователей. Вызывать с мемоизированным списком.
export function useColorMap(ids: string[]): (id: string) => ProfileColors | null {
  const [version, force] = useState(0)
  const key = ids.join(',')
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    for (const id of key ? key.split(',') : []) request(id)
    return () => { listeners.delete(l) }
  }, [key])
  return useMemo(() => (id: string) => cache.get(id) ?? null, [version]) // eslint-disable-line react-hooks/exhaustive-deps
}

export async function setProfileColors(c: Omit<ProfileColors, 'bubble'>): Promise<void> {
  const { error } = await supabase.rpc('set_profile_colors', { p_name: c.name, p_username: c.username, p_profile: c.profile })
  if (error) throw error
}

export async function setBubbleColor(color: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_bubble_color', { p_color: color })
  if (error) throw error
}
