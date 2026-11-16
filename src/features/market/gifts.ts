import { supabase } from '../../lib/supabase'

export interface Gift { id: string; title: string; description: string; image_url: string; price: number; active: boolean }
export interface OwnedGift {
  id: string
  gift_id: string
  created_at: string
  shown: boolean
  note: string | null
  sender: { display_name: string } | null
}

const OWNED_COLS = 'id, gift_id, created_at, shown, note, sender:from_id(display_name)'

// Весь каталог (в том числе снятые с продажи — они нужны для уже полученных подарков).
export async function listGifts(): Promise<Gift[]> {
  const { data, error } = await supabase.from('gifts').select('id, title, description, image_url, price, active').order('price')
  if (error) throw error
  return data as Gift[]
}

export async function myGifts(userId: string): Promise<OwnedGift[]> {
  const { data, error } = await supabase.from('user_gifts').select(OWNED_COLS).eq('owner_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as OwnedGift[]
}

// Подарки, показанные в профиле (RLS отдаёт чужие только с shown = true).
export async function profileGifts(userId: string): Promise<OwnedGift[]> {
  const { data, error } = await supabase.from('user_gifts').select(OWNED_COLS)
    .eq('owner_id', userId).eq('shown', true).order('sent_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data as unknown as OwnedGift[]
}

export async function buyGift(giftId: string): Promise<void> {
  const { error } = await supabase.rpc('buy_gift', { p_gift: giftId })
  if (error) throw error
}

export async function sendGift(ownedId: string, toUserId: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('send_gift', { p_ug: ownedId, p_to: toUserId, p_note: note })
  if (error) throw error
}

export async function setGiftShown(ownedId: string, shown: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_gift_shown', { p_ug: ownedId, p_shown: shown })
  if (error) throw error
}
