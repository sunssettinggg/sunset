import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

export type Visibility = 'everyone' | 'contacts' | 'nobody'

export const VISIBILITY_LABELS: Record<Visibility, string> = { everyone: 'Все', contacts: 'Контакты', nobody: 'Никто' }

// Можно ли показать поле тому, кто смотрит. Контакт = человек, с которым есть личный чат.
export function canSee(visibility: string | null | undefined, isContact: boolean): boolean {
  if (visibility === 'nobody') return false
  if (visibility === 'contacts') return isContact
  return true
}

// Профиль с учётом настроек владельца (скрытые поля обнуляются).
export function maskProfile(p: Profile, isContact: boolean): Profile {
  return {
    ...p,
    avatar_url: canSee(p.avatar_visibility, isContact) ? p.avatar_url : null,
    showcase_number: canSee(p.number_visibility, isContact) ? p.showcase_number : null,
  }
}

let cache: { at: number; ids: Set<string> } | null = null

// id контактов (и свой собственный, чтобы себя всегда видеть). Кэш на 20 секунд.
export async function getContacts(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < 20_000) return cache.ids
  const ids = new Set<string>()
  try {
    const [{ data: s }, { data }] = await Promise.all([supabase.auth.getSession(), supabase.rpc('my_contacts')])
    const me = s.session?.user.id
    if (me) ids.add(me)
    for (const id of (data ?? []) as string[]) ids.add(id)
    cache = { at: Date.now(), ids }
  } catch { /* без контактов скрываются только поля «Контакты» */ }
  return ids
}

export function invalidateContacts() { cache = null }

export async function setPrivacy(avatar: Visibility | null, number: Visibility | null): Promise<void> {
  const { error } = await supabase.rpc('set_privacy', { p_avatar: avatar, p_number: number })
  if (error) throw error
}
