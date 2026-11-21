import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { sendMessage } from '../chat/api'
import GiftArt from './GiftArt'
import UniqueArt from './UniqueArt'
import { listGifts, myGifts, sendGift, type Gift, type OwnedGift } from './gifts'
import { friendlyUnique, myUnique, sendUnique, uniqueTitle, useMeta, type UniqueGift } from './unique'

interface Props {
  myId: string
  toId: string
  toName: string
  chatId: string
  onClose: () => void
  onSent: () => void
}

function friendly(msg: string): string {
  if (msg.includes('not your gift')) return 'Этого подарка у вас уже нет.'
  if (msg.includes('bad recipient')) return 'Нельзя подарить этому пользователю.'
  return friendlyUnique(msg)
}

export default function GiftSendModal({ myId, toId, toName, chatId, onClose, onSent }: Props) {
  const meta = useMeta()
  const [owned, setOwned] = useState<OwnedGift[] | null>(null)
  const [uniq, setUniq] = useState<UniqueGift[]>([])
  const [catalog, setCatalog] = useState<Map<string, Gift>>(new Map())
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([myGifts(myId), listGifts()])
      .then(([own, gifts]) => { setOwned(own); setCatalog(new Map(gifts.map((g) => [g.id, g]))) })
      .catch((e: Error) => { setOwned([]); setError(friendly(e.message)) })
    myUnique(myId).then(setUniq).catch(() => undefined)
  }, [myId])

  async function send() {
    const item = owned?.find((o) => o.id === selected)
    const un = uniq.find((u) => u.id === selected)
    if (!item && !un) return
    setBusy(true); setError(null)
    try {
      let label: string
      let path: string
      if (un) {
        await sendUnique(un.id, toId)
        label = uniqueTitle(meta, un)
        path = `u:${un.id}`
      } else if (item) {
        await sendGift(item.id, toId, note.trim())
        label = catalog.get(item.gift_id)?.title ?? 'подарок'
        path = `r:${item.gift_id}`
      } else return
      const nt = note.trim()
      await sendMessage(chatId, myId, nt || null, null, null, { path, type: 'gift' })
        .catch(() => sendMessage(chatId, myId, `🎁 Подарок «${label}»` + (nt ? `\n${nt}` : ''), null))
        .catch(() => undefined)
      onSent()
      onClose()
    } catch (e) {
      setError(friendly((e as Error).message))
      setBusy(false)
    }
  }

  const empty = owned !== null && owned.length === 0 && uniq.length === 0

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-bg2 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium">Подарок для {toName}</h2>

        {owned === null && <p className="text-sm text-muted">Загрузка…</p>}
        {empty && <p className="text-sm text-muted">У вас пока нет подарков. Купите их в Маркете, вкладка «Магазин».</p>}

        {(uniq.length > 0 || (owned !== null && owned.length > 0)) && (
          <div className="grid grid-cols-2 gap-3">
            {uniq.map((u) => (
              <button key={u.id} onClick={() => setSelected(u.id)}
                className={`flex flex-col gap-2 rounded-2xl bg-surface p-2 text-left transition ${selected === u.id ? 'ring-2 ring-accent' : 'hover:brightness-110'}`}>
                <UniqueArt model={u.model} backdrop={u.backdrop} symbol={u.symbol} className="rounded-xl" label={uniqueTitle(meta, u)} />
                <span className="px-1 text-xs">{uniqueTitle(meta, u)}</span>
              </button>
            ))}
            {(owned ?? []).map((o) => {
              const g = catalog.get(o.gift_id)
              return (
                <button key={o.id} onClick={() => setSelected(o.id)}
                  className={`flex flex-col gap-2 rounded-2xl bg-surface p-2 text-left transition ${selected === o.id ? 'ring-2 ring-accent' : 'hover:brightness-110'}`}>
                  {g && <GiftArt gift={g} />}
                  <span className="px-1 text-xs">{g?.title ?? 'Подарок'}</span>
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <textarea value={note} maxLength={200} placeholder="Подпись (необязательно)" onChange={(e) => setNote(e.target.value)}
            className="h-20 w-full resize-none rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-accent" />
        )}
        {error && <p className="text-sm text-pink">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
          <button onClick={() => void send()} disabled={!selected || busy}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Подарить
          </button>
        </div>
      </div>
    </div>
  )
}
