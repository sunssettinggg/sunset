import { useState } from 'react'
import { createPortal } from 'react-dom'
import BadgeHint from '../ui/BadgeHint'

interface Props { size?: number; className?: string }

function Check({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="block">
      <circle cx="12" cy="12" r="11" fill="#34d399" />
      <path d="M7 12.6l3.2 3.2L17 9" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VerifiedPopup({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-xs space-y-4 rounded-3xl border border-line bg-bg2 p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15"><Check size={40} /></div>
        <div>
          <div className="text-lg font-semibold">Подтверждённый аккаунт</div>
          <p className="mt-1 text-sm text-muted">Этот аккаунт подтверждён представителями Sunset как официальный.</p>
        </div>
        <button type="button" onClick={onClose}
          className="sunset-gradient w-full rounded-full px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110">Понятно</button>
      </div>
    </div>,
    document.body,
  )
}

export default function VerifiedBadge({ size = 14, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BadgeHint text="Официальный аккаунт" label="Подтверждённый аккаунт" className={className} onClick={() => setOpen(true)}>
        <Check size={size} />
      </BadgeHint>
      {open && <VerifiedPopup onClose={() => setOpen(false)} />}
    </>
  )
}
