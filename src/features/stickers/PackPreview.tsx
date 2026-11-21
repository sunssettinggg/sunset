import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { stickerUrl } from './stickers'
import { errMsg, friendlyPackError, stickersWord, subscribePack, unsubscribePack, type PackInfo } from './packs'

// Просмотр чужого набора с кнопкой «Добавить набор».
export default function PackPreview({ info, onClose, onChanged }: { info: PackInfo; onClose: () => void; onChanged?: () => void }) {
  const [added, setAdded] = useState(info.subscribed)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function toggle() {
    setBusy(true); setErr(null)
    try {
      if (added) await unsubscribePack(info.id); else await subscribePack(info.code)
      setAdded(!added)
      onChanged?.()
    } catch (e) { setErr(friendlyPackError(errMsg(e))) } finally { setBusy(false) }
  }

  return createPortal(
    <div data-sticker-modal className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-bg2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start gap-3 p-5 pb-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold">{info.title}</h3>
            <p className="truncate text-sm text-muted">
              {info.items.length} {stickersWord(info.items.length)}{info.owner_name ? ` · ${info.owner_name}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-muted transition hover:bg-surface hover:text-text"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {info.items.map((p) => (
              <div key={p} className="aspect-square rounded-2xl bg-surface p-1.5">
                <img src={stickerUrl(p)} alt="" loading="lazy" draggable={false} className="h-full w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-line p-4">
          {err && <p className="pb-2 text-xs text-pink">{err}</p>}
          {info.mine ? (
            <p className="py-2 text-center text-sm text-muted">Это ваш набор</p>
          ) : (
            <button type="button" disabled={busy} onClick={() => void toggle()}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
                added ? 'bg-surface text-text hover:text-pink' : 'bg-accent text-on-accent hover:opacity-90'}`}>
              {added ? <><Check size={16} />Добавлен · убрать</> : 'Добавить набор'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
