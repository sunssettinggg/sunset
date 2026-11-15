import { Bookmark } from 'lucide-react'
import type { ChatItem } from '../../lib/types'
import Avatar from './Avatar'

interface Props { chat: ChatItem; size?: number; online?: boolean }

export default function ChatAvatar({ chat, size = 40, online = false }: Props) {
  return (
    <div className="relative shrink-0">
      {chat.kind === 'saved' ? (
        <div className="flex items-center justify-center rounded-full bg-accent text-on-accent" style={{ width: size, height: size }}>
          <Bookmark size={size * 0.45} />
        </div>
      ) : (
        <Avatar name={chat.name} url={chat.avatarUrl} size={size} />
      )}
      {online && <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-bg2 bg-green-500" />}
    </div>
  )
}
