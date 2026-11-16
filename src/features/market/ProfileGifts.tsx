import { useEffect, useState } from 'react'
import GiftArt from './GiftArt'
import { listGifts, profileGifts, type Gift, type OwnedGift } from './gifts'

interface Props { userId: string; title?: string; reloadKey?: number }

export default function ProfileGifts({ userId, title = 'Подарки', reloadKey = 0 }: Props) {
  const [items, setItems] = useState<OwnedGift[]>([])
  const [catalog, setCatalog] = useState<Map<string, Gift>>(new Map())

  useEffect(() => {
    let active = true
    Promise.all([profileGifts(userId), listGifts()])
      .then(([own, gifts]) => { if (active) { setItems(own); setCatalog(new Map(gifts.map((g) => [g.id, g]))) } })
      .catch(() => undefined)
    return () => { active = false }
  }, [userId, reloadKey])

  if (items.length === 0) return null
  const visible = items.slice(0, 6)

  return (
    <div>
      <div className="mb-1 px-1 text-xs text-muted">{title} ({items.length})</div>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((it) => {
          const g = catalog.get(it.gift_id)
          const hint = [g?.title, it.sender ? `от ${it.sender.display_name}` : null, it.note].filter(Boolean).join(' · ')
          return g ? <div key={it.id} title={hint}><GiftArt gift={g} /></div> : null
        })}
      </div>
      {items.length > visible.length && <div className="mt-1 px-1 text-xs text-muted">и ещё {items.length - visible.length}</div>}
    </div>
  )
}
