import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Bell, BellOff, Eraser, Pin, PinOff, Trash2 } from 'lucide-react'
import type { ChatItem } from '../../lib/types'

interface MenuProps {
  x: number
  y: number
  chat: ChatItem
  pinned: boolean
  muted: boolean
  onTogglePin: () => void
  onToggleMute: () => void
  onClear: () => void
  onDelete: () => void
  onClose: () => void
}

function Item({ icon, label, danger, onClick }: { icon: ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-surface ${danger ? 'text-pink' : ''}`}>
      <span className={danger ? '' : 'text-muted'}>{icon}</span>{label}
    </button>
  )
}

export function ChatContextMenu(p: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: p.x, top: p.y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(p.x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(p.y, window.innerHeight - r.height - 8)),
    })
  }, [p.x, p.y])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

  const run = (fn: () => void) => () => { p.onClose(); fn() }
  const saved = p.chat.kind === 'saved'

  return createPortal(
    <div className="fixed inset-0 z-[70]" onClick={p.onClose} onContextMenu={(e) => { e.preventDefault(); p.onClose() }}>
      <div ref={ref} onClick={(e) => e.stopPropagation()} style={{ left: pos.left, top: pos.top }}
        className="absolute min-w-[230px] rounded-2xl border border-line bg-bg2 p-1.5 shadow-2xl">
        <Item icon={p.pinned ? <PinOff size={18} /> : <Pin size={18} />} label={p.pinned ? 'Открепить' : 'Закрепить'} onClick={run(p.onTogglePin)} />
        {!saved && <Item icon={p.muted ? <Bell size={18} /> : <BellOff size={18} />} label={p.muted ? 'Включить звук' : 'Выключить звук'} onClick={run(p.onToggleMute)} />}
        <div className="my-1 border-t border-line" />
        <Item icon={<Eraser size={18} />} label="Очистить историю" onClick={run(p.onClear)} />
        {p.chat.kind === 'direct' && <Item icon={<Trash2 size={18} />} label="Удалить чат" danger onClick={run(p.onDelete)} />}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  mode: 'clear' | 'delete'
  chat: ChatItem
  busy: boolean
  error: string | null
  onConfirm: (forAll: boolean) => void
  onCancel: () => void
}

export function ChatConfirm({ mode, chat, busy, error, onConfirm, onCancel }: ConfirmProps) {
  const [forAll, setForAll] = useState(false)
  const del = mode === 'delete'
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="w-full max-w-xs space-y-4 rounded-3xl bg-bg2 p-5" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-base font-semibold">{del ? 'Удалить чат?' : 'Очистить историю?'}</div>
          <p className="mt-1 text-sm text-muted">
            {del
              ? `Чат с «${chat.name}» исчезнет из списка. Он вернётся, если придёт новое сообщение.`
              : `Сообщения в «${chat.name}» пропадут из вашей ленты. Остальным участникам они останутся.`}
          </p>
        </div>
        {del && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3 text-sm">
            <input type="checkbox" checked={forAll} onChange={(e) => setForAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span>Также удалить сообщения у собеседника</span>
          </label>
        )}
        {error && <p className="text-xs text-pink">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
          <button type="button" disabled={busy} onClick={() => onConfirm(del && forAll)}
            className="rounded-full bg-pink/20 px-5 py-2 text-sm font-semibold text-pink transition hover:bg-pink/30 disabled:opacity-50">
            {del ? 'Удалить' : 'Очистить'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
