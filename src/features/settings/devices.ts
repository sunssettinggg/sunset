import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface DeviceSession { device_id: string; label: string; created_at: string; last_seen: string }

const KEY = 'sunset.device'
let fallbackId: string | null = null

export function deviceId(): string {
  try {
    let v = localStorage.getItem(KEY)
    if (!v || v.length < 8) { v = crypto.randomUUID(); localStorage.setItem(KEY, v) }
    return v
  } catch {
    fallbackId ??= crypto.randomUUID()
    return fallbackId
  }
}

export function deviceLabel(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Браузер'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'неизвестная система'
  return `${browser}, ${os}`
}

function touch() {
  void supabase.rpc('touch_session', { p_device: deviceId(), p_label: deviceLabel() })
}

// Отмечаем это устройство при входе и раз в 5 минут, пока приложение открыто.
export function useDeviceHeartbeat(userId: string) {
  useEffect(() => {
    touch()
    const t = setInterval(touch, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [userId])
}

export async function listSessions(): Promise<DeviceSession[]> {
  const { data, error } = await supabase.rpc('my_sessions')
  if (error) throw error
  return (data ?? []) as DeviceSession[]
}

// Выйти на всех остальных устройствах
export async function endOtherSessions(): Promise<void> {
  await supabase.auth.signOut({ scope: 'others' })
  const { error } = await supabase.rpc('end_other_sessions', { p_keep: deviceId() })
  if (error) throw error
}

// Убрать это устройство из списка перед выходом (ошибки не важны)
export async function endThisDevice(): Promise<void> {
  try { await supabase.rpc('end_session', { p_device: deviceId() }) } catch { /* ignore */ }
}
