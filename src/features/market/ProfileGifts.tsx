import { useEffect, useState } from 'react'
import GiftArt from './GiftArt'
import UniqueArt from './UniqueArt'
import UniqueModal from './UniqueModal'
import { listGifts, profileGifts, type Gift, type OwnedGift } from './gifts'
import { profileUnique, uniqueTitle, useMeta, type UniqueGift } from './unique'

interface Props { userId: string; title?: string; reloadKey?: number }

export default function ProfileGifts({ userId, title = 'Подарки', reloadKey = 0 }: Props) {
  const meta = useMeta()
  const [items, setItems] = useState<OwnedGift[]>([])
  const [uniq, setUniq] = useState<UniqueGift[]>([])
  const [catalog, setCatalog] = useState<Map<string, Gift>>(new Map())
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([profileGifts(userId), listGifts()])
      .then(([own, gifts]) => { if (active) { setItems(own); setCatalog(new Map(gifts.map((g) => [g.id, g]))) } })
      .catch(() => undefined)
    profileUnique(userId).then((u) => { if (active) setUniq(u) }).catch(() => undefined)
    return () => { active = false }
  }, [userId, reloadKey])

  const total = items.length + uniq.length
  if (total === 0) return null
  const shownUniq = uniq.slice(0, 6)
  const shownRegular = items.slice(0, Math.max(0, 6 - shownUniq.length))

  return (
    <div>
      <div className="mb-1 px-1 text-xs text-muted">{title} ({total})</div>
      <div className="grid grid-cols-3 gap-2">
        {shownUniq.map((u) => (
          <button key={u.id} type="button" title={uniqueTitle(meta, u)} onClick={() => setOpen(u.id)} className="block text-left transition hover:brightness-110">
            <UniqueArt model={u.model} backdrop={u.backdrop} symbol={u.symbol} className="rounded-xl" label={uniqueTitle(meta, u)} />
          </button>
        ))}
        {shownRegular.map((it) => {
          const g = catalog.get(it.gift_id)
          const hint = [g?.title, it.sender ? `от ${it.sender.display_name}` : null, it.note].filter(Boolean).join(' · ')
          return g ? <div key={it.id} title={hint}><GiftArt gift={g} /></div> : null
        })}
      </div>
      {total > shownUniq.length + shownRegular.length && <div className="mt-1 px-1 text-xs text-muted">и ещё {total - shownUniq.length - shownRegular.length}</div>}
      {open && <UniqueModal id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
