import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props { text: string; label: string; onClick: () => void; className?: string; children: ReactNode }

// Значок, который можно нажать, с красивой подсказкой при наведении (вместо стандартной браузерной).
export default function BadgeHint({ text, label, onClick, className = '', children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  function show(e: MouseEvent<HTMLSpanElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 80), window.innerWidth - 80), y: r.top })
  }
  function open() { setPos(null); onClick() }

  return (
    <>
      <span role="button" tabIndex={0} aria-label={label}
        className={'inline-flex shrink-0 cursor-pointer transition hover:brightness-125 ' + className}
        onMouseEnter={show} onMouseLeave={() => setPos(null)} onBlur={() => setPos(null)}
        onClick={(e) => { e.stopPropagation(); open() }}
        onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); open() } }}>
        {children}
      </span>
      {pos && createPortal(
        <div style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
          className="pointer-events-none fixed z-[80] whitespace-nowrap rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-medium text-text shadow-xl">
          {text}
        </div>,
        document.body,
      )}
    </>
  )
}
