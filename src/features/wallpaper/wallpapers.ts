import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export const WALLPAPERS = [
  { id: 'sunset', label: 'Закат', css: 'linear-gradient(160deg, #3a1c3f, #b4476b 55%, #f2a65a)' },
  { id: 'ocean', label: 'Океан', css: 'linear-gradient(160deg, #0b1d33, #1c5d8f 60%, #4cc3d9)' },
  { id: 'forest', label: 'Лес', css: 'linear-gradient(160deg, #0a1f16, #1f5a3c 60%, #7bc47f)' },
  { id: 'violet', label: 'Фиалка', css: 'linear-gradient(160deg, #1a1033, #5b3fa8 60%, #c18cf0)' },
  { id: 'peach', label: 'Персик', css: 'linear-gradient(160deg, #3b1f2a, #e07a6a 60%, #ffd1a0)' },
  { id: 'night', label: 'Ночь', css: 'linear-gradient(160deg, #07070c, #14142a)' },
] as const

// Значение в БД: "g:<id>" (градиент) или "c:#rrggbb" (цвет).
export function wallpaperCss(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith('g:')) return WALLPAPERS.find((w) => w.id === value.slice(2))?.css ?? null
  if (/^c:#[0-9a-f]{6}$/.test(value)) return value.slice(2)
  return null
}

const EVENT = 'sunset:wallpaper-changed'

async function fetchWallpaper(chatId: string): Promise<string | null> {
  const { data } = await supabase.from('chat_wallpapers').select('value').eq('chat_id', chatId).maybeSingle()
  return (data as { value: string } | null)?.value ?? null
}

// Обои этого чата для текущего пользователя (CSS-фон) или null.
export function useWallpaper(chatId: string): string | null {
  const [value, setValue] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    const load = () => { fetchWallpaper(chatId).then((v) => { if (active) setValue(v) }).catch(() => undefined) }
    setValue(null)
    load()
    const onChange = (e: Event) => { if ((e as CustomEvent<string>).detail === chatId) load() }
    window.addEventListener(EVENT, onChange)
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener(EVENT, onChange); window.removeEventListener('focus', load) }
  }, [chatId])
  return wallpaperCss(value)
}

export async function setWallpaper(chatId: string, value: string, both: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_chat_wallpaper', { p_chat: chatId, p_value: value, p_both: both })
  if (error) throw error
  window.dispatchEvent(new CustomEvent(EVENT, { detail: chatId }))
}

export async function clearWallpaper(chatId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_chat_wallpaper', { p_chat: chatId })
  if (error) throw error
  window.dispatchEvent(new CustomEvent(EVENT, { detail: chatId }))
}
