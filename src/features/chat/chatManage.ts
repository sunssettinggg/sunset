import { supabase } from '../../lib/supabase'

const PIN_KEY = 'sunset.pinned'

export function getPinned(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(PIN_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
export function setPinned(ids: string[]) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify(ids)) } catch { /* необязательно */ }
}

export async function clearHistory(chatId: string): Promise<void> {
  const { error } = await supabase.rpc('clear_chat_history', { p_chat: chatId })
  if (error) throw error
}

export async function deleteChat(chatId: string, forAll: boolean): Promise<void> {
  const { error } = await supabase.rpc('delete_chat', { p_chat: chatId, p_for_all: forAll })
  if (error) throw error
}

export interface MemberState { clearedAt: string | null; hiddenAt: string | null }

// Когда я очищал историю / скрывал чат. Если колонок ещё нет (SQL не выполнен), возвращается пусто.
export async function myMemberStates(myId: string): Promise<Map<string, MemberState>> {
  const out = new Map<string, MemberState>()
  const { data, error } = await supabase.from('chat_members').select('chat_id, cleared_at, hidden_at').eq('user_id', myId)
  if (error || !data) return out
  for (const r of data as { chat_id: string; cleared_at: string | null; hidden_at: string | null }[]) {
    out.set(r.chat_id, { clearedAt: r.cleared_at, hiddenAt: r.hidden_at })
  }
  return out
}

export async function myClearedAt(chatId: string): Promise<string | null> {
  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) return null
  const { data, error } = await supabase.from('chat_members').select('cleared_at').eq('chat_id', chatId).eq('user_id', uid).maybeSingle()
  if (error) return null
  return (data as { cleared_at: string | null } | null)?.cleared_at ?? null
}
