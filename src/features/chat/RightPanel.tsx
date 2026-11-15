import { X } from 'lucide-react'
import type { ChatItem } from '../../lib/types'
import Avatar from './Avatar'

export default function RightPanel({ chat, onClose }: { chat: ChatItem; onClose: () => void }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-72 flex-col items-center gap-3 border-l border-white/5 bg-bg2 p-6 lg:static lg:z-auto">
      <button onClick={onClose} title="Закрыть" className="self-end rounded-lg p-1 text-muted transition hover:text-text">
        <X size={18} />
      </button>
      <Avatar name={chat.name} url={chat.avatarUrl} size={96} />
      <div className="text-center">
        <div className="text-lg font-semibold">{chat.name}</div>
        {chat.username && <div className="text-sm text-muted">@{chat.username}</div>}
      </div>
      <div className="w-full rounded-xl bg-surface p-4">
        <div className="mb-1 text-xs uppercase tracking-wider text-muted">О себе</div>
        <p className="text-sm break-words whitespace-pre-wrap">{chat.bio || 'Описание не указано.'}</p>
      </div>
    </aside>
  )
}
