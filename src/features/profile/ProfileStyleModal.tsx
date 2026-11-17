import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import ColorSettings from './ColorSettings'

export default function ProfileStyleModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-xs space-y-3 rounded-3xl bg-bg2 p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Оформление профиля</h2>
          <button type="button" onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
        </div>
        <ColorSettings userId={userId} />
      </div>
    </div>,
    document.body,
  )
}
