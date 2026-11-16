import { supabase } from '../../lib/supabase'

export type CollectibleKind = 'number' | 'username'
export interface CollectibleInfo {
  owner_name: string
  owner_username: string
  acquired_at: string | null
  acquired_price: number | null
}

export async function collectibleInfo(kind: CollectibleKind, value: string): Promise<CollectibleInfo | null> {
  const { data, error } = await supabase.rpc('collectible_info', { p_kind: kind, p_value: value })
  if (error) throw error
  const rows = data as CollectibleInfo[] | null
  return rows && rows.length > 0 ? rows[0] : null
}
