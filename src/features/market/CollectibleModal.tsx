import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { collectibleInfo, type CollectibleInfo, type CollectibleKind } from './collectibles'

interface Props { kind: CollectibleKind; value: string; onClose: () => void }

export default function CollectibleModal({ kind, value, onClose }: Props) {
  const [info, setInfo] = useState<CollectibleInfo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    collectibleInfo(kind, value)
      .then((i) => { if (active) setInfo(i) })
      .catch((e: Error) => { if (active) { setInfo(null); setError(e.message) } })
    return () => { active = false }
  }, [kind, value])

  const title = kind === 'username' ? `@${value}` : value

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-xs space-y-4 rounded-3xl bg-bg2 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="break-all text-lg font-semibold">{title}</div>
            <div className="text-xs text-muted">{kind === 'username' ? 'Коллекционный юзернейм' : 'Коллекционный номер'}</div>
          </div>
          <button onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
        </div>

        {info === undefined && <p className="text-sm text-muted">Загрузка…</p>}
        {info === null && <p className="text-sm text-muted">{error ?? 'Информация недоступна.'}</p>}
        {info && (
          <div className="divide-y divide-line rounded-2xl bg-surface">
            <div className="px-4 py-3">
              <div className="text-xs text-muted">Владелец</div>
              <div className="text-sm">{info.owner_name} <span className="text-muted">@{info.owner_username}</span></div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted">Приобретён</div>
              <div className="text-sm">
                {info.acquired_at
                  ? new Date(info.acquired_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Нет данных'}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-muted">Цена</div>
              <div className="flex items-center gap-1 text-sm">
                {info.acquired_price !== null
                  ? <><Star size={14} className="text-accent" fill="currentColor" />{info.acquired_price.toLocaleString('ru-RU')}</>
                  : 'Нет данных'}
              </div>
            </div>
          </div>
        )}
        {info && info.acquired_at === null && (
          <p className="text-xs text-muted">Этот предмет куплен до того, как мы начали записывать историю покупок.</p>
        )}
      </div>
    </div>
  )
}
