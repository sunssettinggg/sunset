import type { ChatItem } from '../../lib/types'
import ChatAvatar from './ChatAvatar'

interface Props { chats: ChatItem[]; count: number; onPick: (chat: ChatItem) => void; onClose: () => void }

export default function ForwardModal({ chats, count, onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-bg2 p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="px-2 pb-3 text-lg font-medium">Переслать ({count})</h2>
        <div className="max-h-80 overflow-y-auto">
          {chats.map((c) => (
            <button key={c.id} onClick={() => onPick(c)}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface">
              <ChatAvatar chat={c} />
              <span className="truncate text-sm font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
