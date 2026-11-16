import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export const MAX_ACCOUNTS = 3
const KEY = 'sunset.accounts'
const RETURN_KEY = 'sunset.returnTo'

export interface SavedAccount {
  id: string
  access_token: string
  refresh_token: string
  display_name: string
  username: string
  avatar_url: string | null
}

export function readAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(list)) return []
    return list.filter((a): a is SavedAccount =>
      !!a && typeof a === 'object'
      && typeof (a as SavedAccount).id === 'string'
      && typeof (a as SavedAccount).refresh_token === 'string')
  } catch {
    return []
  }
}

function writeAccounts(list: SavedAccount[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

// Запоминаем (или обновляем) текущий аккаунт вместе с его сессией.
export function saveAccount(session: Session, me: Profile) {
  const entry: SavedAccount = {
    id: session.user.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    display_name: me.display_name,
    username: me.username,
    avatar_url: me.avatar_url,
  }
  const list = readAccounts()
  const i = list.findIndex((a) => a.id === entry.id)
  if (i >= 0) list[i] = entry
  else if (list.length < MAX_ACCOUNTS) list.push(entry)
  writeAccounts(list)
  try { sessionStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
}

// Токены обновляются автоматически; храним свежие, иначе старый refresh-токен станет недействительным.
function updateTokens(session: Session) {
  const list = readAccounts()
  const i = list.findIndex((a) => a.id === session.user.id)
  if (i < 0) return
  list[i] = { ...list[i], access_token: session.access_token, refresh_token: session.refresh_token }
  writeAccounts(list)
}

export function removeAccount(id: string) {
  writeAccounts(readAccounts().filter((a) => a.id !== id))
}

export function useAccountSync() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        updateTokens(session)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])
}

// Возвращает текст ошибки или null, если переключение удалось.
export async function switchAccount(id: string): Promise<string | null> {
  const acc = readAccounts().find((a) => a.id === id)
  if (!acc) return 'Аккаунт не найден.'
  const { error } = await supabase.auth.setSession({ access_token: acc.access_token, refresh_token: acc.refresh_token })
  if (error) {
    removeAccount(id)
    return 'Сессия этого аккаунта истекла. Войди в него заново.'
  }
  return null
}

// Выходим из текущего аккаунта только на этом устройстве, на экране входа можно добавить другой.
export async function addAccountFlow(currentId: string) {
  try { sessionStorage.setItem(RETURN_KEY, currentId) } catch { /* ignore */ }
  await supabase.auth.signOut({ scope: 'local' })
}

export function getReturnTo(): string | null {
  try {
    const id = sessionStorage.getItem(RETURN_KEY)
    return id && readAccounts().some((a) => a.id === id) ? id : null
  } catch {
    return null
  }
}

// Обычный выход: убираем аккаунт из списка и, если есть другой, переключаемся на него.
export async function signOutCurrent(id: string) {
  removeAccount(id)
  try { sessionStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
  await supabase.auth.signOut()
  const next = readAccounts()[0]
  if (next) await switchAccount(next.id)
}
