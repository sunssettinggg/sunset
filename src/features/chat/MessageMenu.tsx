import { Check, CheckCheck, Copy, Forward, Pencil, Pin, Reply, Trash2, type LucideIcon } from 'lucide-react'

export type MenuAction = 'reply' | 'edit' | 'pin' | 'copy' | 'forward' | 'delete' | 'select'

interface Props {
  x: number
  y: number
  mine: boolean
  pinned: boolean
  emojis: string[]
  time: string
  read: boolean | null
  onReact: (emoji: string) => void
  onAction: (a: MenuAction) => void
  onClose: () => void
}

interface Item { k: MenuAction; label: string; Icon: LucideIcon; danger?: boolean }

export default function MessageMenu({ x, y, mine, pinned, emojis, time, read, onReact, onAction, onClose }: Props) {
  const items: Item[] = [
    { k: 'reply', label: 'Ответить', Icon: Reply },
    ...(mine ? [{ k: 'edit', label: 'Изменить', Icon: Pencil } as Item] : []),
    { k: 'pin', label: pinned ? 'Открепить' : 'Закрепить', Icon: Pin },
    { k: 'copy', label: 'Копировать текст', Icon: Copy },
    { k: 'forward', label: 'Переслать', Icon: Forward },
    ...(mine ? [{ k: 'delete', label: 'Удалить', Icon: Trash2, danger: true } as Item] : []),
    { k: 'select', label: 'Выделить', Icon: Check },
  ]
  const left = Math.max(8, Math.min(x, window.innerWidth - 268))
  const top = Math.max(8, Math.min(y, window.innerHeight - 430))

  return (
    <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
      <div className="absolute w-64 space-y-2" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between rounded-full border border-line bg-bg2 px-2 py-1 shadow-lg">
          {emojis.map((e) => (
            <button key={e} onClick={() => onReact(e)} className="rounded-full px-1 text-xl transition hover:scale-125">{e}</button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-bg2 py-1 shadow-lg">
          {items.map(({ k, label, Icon, danger }) => (
            <button key={k} onClick={() => onAction(k)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-surface ${danger ? 'text-pink' : ''}`}>
              <Icon size={18} className={danger ? '' : 'text-muted'} />{label}
            </button>
          ))}
          <div className="mt-1 flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-muted">
            {read === null ? null : read ? <CheckCheck size={14} className="text-accent" /> : <Check size={14} />}
            {time}
          </div>
        </div>
      </div>
    </div>
  )
}
