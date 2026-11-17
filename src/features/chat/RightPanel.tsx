import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Bell, BellOff, CalendarDays, Check, Copy, Gift, Info, MessageCircle, Phone } from 'lucide-react'
import type { ChatItem, ProfileChannel } from '../../lib/types'
import { profileChannel } from './api'
import ChannelCard from './ChannelCard'
import ChatAvatar from './ChatAvatar'
import UsernameLine from './UsernameLine'
import VerifiedBadge from '../verified/VerifiedBadge'
import PremiumBadge from '../premium/PremiumBadge'
import ColoredName, { ColorRing } from '../premium/ColoredName'
import GiftSendModal from '../market/GiftSendModal'
import ProfileGifts from '../market/ProfileGifts'
import CollectibleModal from '../market/CollectibleModal'
import type { CollectibleKind } from '../market/collectibles'

interface Props {
  chat: ChatItem
  myId: string
  online: boolean
  muted: boolean
  onToggleMute: () => void
  onOpenChannel: (c: ProfileChannel) => Promise<void>
  onClose: () => void
}

const pill = 'flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-3 py-2.5 text-xs transition hover:brightness-110'

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4">
      {title && <div className="mb-2 text-xs text-muted">{title}</div>}
      {children}
    </section>
  )
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <div className="min-w-0 break-words whitespace-pre-wrap">{children}</div>
    </div>
  )
}

export default function RightPanel({ chat, myId, online, muted, onToggleMute, onOpenChannel, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [channel, setChannel] = useState<ProfileChannel | null>(null)
  const [giftOpen, setGiftOpen] = useState(false)
  const [giftsKey, setGiftsKey] = useState(0)
  const [collectible, setCollectible] = useState<{ kind: CollectibleKind; value: string } | null>(null)

  useEffect(() => {
    let active = true
    setChannel(null)
    if (chat.otherId) profileChannel(chat.otherId).then((c) => { if (active) setChannel(c) }).catch(() => undefined)
    return () => { active = false }
  }, [chat.otherId])

  function copyUsername() {
    if (!chat.username) return
    void navigator.clipboard.writeText(`@${chat.username}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-80 flex-col gap-4 overflow-y-auto border-l border-line bg-bg2 p-5 lg:static lg:z-auto">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg py-1 text-sm text-muted transition hover:text-text">
          <ArrowLeft size={16} /> Назад
        </button>
        <button onClick={copyUsername} title="Скопировать username" className="rounded-lg p-1.5 text-muted transition hover:text-text">
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 pt-1">
        <ColorRing userId={chat.otherId}>
          <div className="rounded-full bg-bg2 p-1">
            <ChatAvatar chat={chat} size={104} online={online} />
          </div>
        </ColorRing>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xl font-bold">
          <ColoredName userId={chat.otherId} name={chat.name} className="break-words" />{chat.verified && <VerifiedBadge size={18} />}<PremiumBadge userId={chat.otherId} size={18} />
        </div>
        {chat.username && <div className="text-sm text-muted"><UsernameLine muted userId={chat.otherId} username={chat.username} handles={chat.handles}
          onHandleClick={(h) => setCollectible({ kind: 'username', value: h })} /></div>}
        <div className={`text-xs ${online ? 'text-accent' : 'text-muted'}`}>{online ? 'в сети' : 'не в сети'}</div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="sunset-gradient flex flex-[1.4] items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold text-on-accent transition hover:brightness-110">
          <MessageCircle size={16} />Написать
        </button>
        <button onClick={onToggleMute} className={pill}>
          {muted ? <BellOff size={16} /> : <Bell size={16} />}{muted ? 'Без звука' : 'Звук'}
        </button>
      </div>
      {chat.otherId && (
        <button onClick={() => setGiftOpen(true)} className={`${pill} flex-none`}><Gift size={16} />Подарить подарок</button>
      )}

      <Card title="О себе">
        <Line icon={<Info size={16} />}>{chat.bio || 'Описание не указано.'}</Line>
      </Card>

      {chat.number && (
        <Card title="Номер">
          <button onClick={() => setCollectible({ kind: 'number', value: chat.number as string })} title="О номере"
            className="flex items-center gap-3 text-left text-sm transition hover:brightness-125">
            <Phone size={16} className="text-accent" />{chat.number}
          </button>
        </Card>
      )}

      {chat.joinedAt && (
        <Card title="Информация">
          <Line icon={<CalendarDays size={16} />}>
            В SUNSET с {new Date(chat.joinedAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
          </Line>
        </Card>
      )}

      {chat.otherId && <ProfileGifts userId={chat.otherId} reloadKey={giftsKey} />}

      {chat.verified && (
        <div className="flex items-start gap-2 rounded-2xl bg-surface p-4 text-sm text-muted">
          <VerifiedBadge size={16} className="mt-0.5" />
          <span>Этот аккаунт подтверждён как официальный представителями Sunset.</span>
        </div>
      )}

      {channel && (
        <div>
          <div className="mb-1 px-1 text-xs text-muted">Канал</div>
          <ChannelCard card={channel} onOpen={onOpenChannel} />
        </div>
      )}

      {collectible && <CollectibleModal kind={collectible.kind} value={collectible.value} onClose={() => setCollectible(null)} />}
      {giftOpen && chat.otherId && (
        <GiftSendModal myId={myId} toId={chat.otherId} toName={chat.name} chatId={chat.id}
          onClose={() => setGiftOpen(false)} onSent={() => setGiftsKey((k) => k + 1)} />
      )}
    </aside>
  )
}
