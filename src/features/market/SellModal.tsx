import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Star } from 'lucide-react'
import type { MarketItem } from '../../lib/types'

interface Props {
  items: MarketItem[]
  busy: boolean
  error: string | null
  onClose: () => void
  onSell: (id: string, price: number) => void
}

const show = (it: MarketItem) => (it.kind === 'username' ? '@' + it.value : it.value)

export default function SellModal({ items, busy, error, onClose, onSell }: Props) {
  const [picked, setPicked] = useState<string | null>(items[0]?.id ?? null)
  const [price, setPrice] = useState('')
  const valid = picked !== null && Number(price) >= 1

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass max-h-full w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium">Выставить на продажу</h2>

        {items.length === 0 ? (
          <p className="text-sm text-muted">
            Сейчас нечего продавать. Купи юзернейм или номер на витрине. Предметы, уже стоящие на продаже, здесь не показываются.
          </p>
        ) : (
          <>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {items.map((it) => (
                <button key={it.id} type="button" onClick={() => setPicked(it.id)}
                  className={'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ' +
                    (picked === it.id ? 'bg-accent/25 ring-1 ring-accent' : 'bg-surface hover:brightness-125')}>
                  <span className="break-all font-mono text-sm">{show(it)}</span>
                  <span className="ml-3 shrink-0 text-xs text-muted">{it.kind === 'username' ? 'юзернейм' : 'номер'}</span>
                </button>
              ))}
            </div>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-1.5 text-sm text-muted"><Star size={13} className="text-accent" fill="currentColor" />Цена в Звёздах</span>
              <input value={price} inputMode="numeric" placeholder="Например, 100"
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full rounded-xl bg-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent" />
            </label>
          </>
        )}

        {error && <p className="text-sm text-pink">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-muted transition hover:text-text">Закрыть</button>
          {items.length > 0 && (
            <button type="button" disabled={!valid || busy} onClick={() => picked && onSell(picked, Number(price))}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-40">
              Выставить
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
