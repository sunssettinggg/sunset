import { useState } from 'react'
import { createPortal } from 'react-dom'
import { OPEN_PREMIUM_EVENT, usePremium } from './premium'

export function PremiumStar({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={'inline-block shrink-0 ' + className}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#f6a23a" />
      <path d="M12 5.4l1.9 4 4.3.5-3.2 3 .9 4.3L12 14.9l-3.9 2.3.9-4.3-3.2-3 4.3-.5z" fill="#ffd98a" />
    </svg>
  )
}

function PremiumPopup({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-xs space-y-4 rounded-3xl bg-bg2 p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-pink">
          <PremiumStar size={34} />
        </div>
        <div>
          <div className="text-lg font-semibold">Sunset Premium</div>
          <p className="mt-1 text-sm text-muted">Этот пользователь — подписчик Sunset Premium.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(OPEN_PREMIUM_EVENT)) }}
            className="sunset-gradient rounded-full px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110">
            Что даёт Premium
          </button>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text">Закрыть</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface Props { userId: string | null | undefined; size?: number; className?: string }

// Звёздочка рядом с ником. Не рисуется, если у пользователя нет подписки.
export default function PremiumBadge({ userId, size = 14, className = '' }: Props) {
  const on = usePremium(userId)
  const [open, setOpen] = useState(false)
  if (!on) return null
  return (
    <>
      <span role="button" tabIndex={0} title="Sunset Premium" aria-label="Подписчик Sunset Premium"
        className={'inline-flex shrink-0 cursor-pointer transition hover:brightness-125 ' + className}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setOpen(true) } }}>
        <PremiumStar size={size} />
      </span>
      {open && <PremiumPopup onClose={() => setOpen(false)} />}
    </>
  )
}
