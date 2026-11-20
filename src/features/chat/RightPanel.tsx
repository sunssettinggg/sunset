import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, AtSign, Bell, BellOff, CalendarDays, Check, Copy, Gift, Image as ImageIcon, Info, MessageCircle, Phone, User } from 'lucide-react'
import type { ChatItem, ProfileChannel } from '../../lib/types'
import { profileChannel } from './api'
import ChannelCard from './ChannelCard'
import ChatAvatar from './ChatAvatar'
import { useColors } from '../premium/colors'
import VerifiedBadge from '../verified/VerifiedBadge'
import PremiumBadge from '../premium/PremiumBadge'
import ColoredName, { ColorRing } from '../premium/ColoredName'
import GiftSendModal from '../market/GiftSendModal'
import ProfileGifts from '../market/ProfileGifts'
import CollectibleModal from '../market/CollectibleModal'
import WallpaperModal from '../wallpaper/WallpaperModal'
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

function Row({ icon, label, children, onClick }: { icon: ReactNode; label: string; children: ReactNode; onClick?: () => void }) {
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left text-sm'
  const inner = (
    <>
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="min-w-0 truncate text-accent">{children}</span>
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} transition hover:bg-bg/40`}>{inner}</button>
    : <div className={cls}>{inner}</div>
}

export default function RightPanel({ chat, myId, online, muted, onToggleMute, onOpenChannel, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [channel, setChannel] = useState<ProfileChannel | null>(null)
  const [giftOpen, setGiftOpen] = useState(false)
  const [wallOpen, setWallOpen] = useState(false)
  const colors = useColors(chat.otherId)
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
      {chat.kind === 'direct' && (
        <button onClick={() => setWallOpen(true)} className={`${pill} flex-none`}><ImageIcon size={16} />Обои чата</button>
      )}

      <section className="shrink-0 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
        {chat.bio && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 text-sm"><Info size={18} className="text-muted" /><span>О себе</span></div>
            <p className="mt-1.5 whitespace-pre-wrap break-words pl-[30px] text-sm text-accent">{chat.bio}</p>
          </div>
        )}
        <Row icon={<User size={18} />} label="Имя">{chat.name}</Row>
        {chat.number && (
          <Row icon={<Phone size={18} />} label="Номер" onClick={() => setCollectible({ kind: 'number', value: chat.number as string })}>{chat.number}</Row>
        )}
        {chat.username && (
          <Row icon={<AtSign size={18} />} label="Имя пользователя">
            <span style={colors?.username ? { color: colors.username } : undefined}>@{chat.username}</span>
          </Row>
        )}
        {chat.handles.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-xs text-muted">а также</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {chat.handles.map((h) => (
                <button key={h} type="button" onClick={() => setCollectible({ kind: 'username', value: h })} title="О юзернейме"
                  className="rounded-full bg-accent/15 px-3 py-1 text-sm text-accent transition hover:brightness-125">@{h}</button>
              ))}
            </div>
          </div>
        )}
      </section>

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
      {wallOpen && <WallpaperModal chatId={chat.id} myId={myId} onClose={() => setWallOpen(false)} />}
      {giftOpen && chat.otherId && (
        <GiftSendModal myId={myId} toId={chat.otherId} toName={chat.name} chatId={chat.id}
          onClose={() => setGiftOpen(false)} onSent={() => setGiftsKey((k) => k + 1)} />
      )}
    </aside>
  )
}
