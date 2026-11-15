import { useState } from 'react'
import { Bell, BellOff, Check, Copy, MessageCircle, X } from 'lucide-react'
import type { ChatItem } from '../../lib/types'
import ChatAvatar from './ChatAvatar'

interface Props {
  chat: ChatItem
  online: boolean
  muted: boolean
  onToggleMute: () => void
  onClose: () => void
}

const action = 'flex flex-1 flex-col items-center gap-1 rounded-xl bg-surface py-3 text-xs transition hover:brightness-110'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm break-words whitespace-pre-wrap">{value}</div>
    </div>
  )
}

export default function RightPanel({ chat, online, muted, onToggleMute, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  function copyUsername() {
    if (!chat.username) return
    void navigator.clipboard.writeText(`@${chat.username}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-80 flex-col gap-4 overflow-y-auto border-l border-line bg-bg2 p-5 lg:static lg:z-auto">
      <button onClick={onClose} title="Закрыть" className="self-end rounded-lg p-1 text-muted transition hover:text-text">
        <X size={18} />
      </button>
      <div className="flex flex-col items-center gap-2">
        <ChatAvatar chat={chat} size={96} online={online} />
        <div className="text-lg font-semibold">{chat.name}</div>
        <div className={`text-sm ${online ? 'text-accent' : 'text-muted'}`}>{online ? 'в сети' : 'не в сети'}</div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className={action}><MessageCircle size={20} />Чат</button>
        <button onClick={onToggleMute} className={action}>
          {muted ? <BellOff size={20} /> : <Bell size={20} />}{muted ? 'Без звука' : 'Звук'}
        </button>
        <button onClick={copyUsername} className={action}>
          {copied ? <Check size={20} /> : <Copy size={20} />}{copied ? 'Готово' : 'Копировать'}
        </button>
      </div>

      <div className="divide-y divide-line rounded-xl bg-surface">
        <Row label="Имя" value={chat.name} />
        {chat.username && <Row label="Username" value={`@${chat.username}`} />}
        {chat.number && <Row label="Номер" value={chat.number} />}
        {chat.handle && <Row label="Коллекционный юзернейм" value={`@${chat.handle}`} />}
        <Row label="О себе" value={chat.bio || 'Описание не указано.'} />
        {chat.joinedAt && (
          <Row label="В SUNSET с" value={new Date(chat.joinedAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })} />
        )}
      </div>
    </aside>
  )
}
