import { supabase } from '../../lib/supabase'

export interface Gift { id: string; title: string; description: string; image_url: string; price: number }
export interface OwnedGift { id: string; gift_id: string; created_at: string }

export async function listGifts(): Promise<Gift[]> {
  const { data, error } = await supabase.from('gifts').select('id, title, description, image_url, price').order('price')
  if (error) throw error
  return data as Gift[]
}

// RLS отдаёт только подарки текущего пользователя
export async function myGifts(): Promise<OwnedGift[]> {
  const { data, error } = await supabase.from('user_gifts').select('id, gift_id, created_at').order('created_at', { ascending: false })
  if (error) throw error
  return data as OwnedGift[]
}

export async function buyGift(giftId: string): Promise<void> {
  const { error } = await supabase.rpc('buy_gift', { p_gift: giftId })
  if (error) throw error
}
