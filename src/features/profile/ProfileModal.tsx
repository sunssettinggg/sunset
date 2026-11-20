import { useEffect, useState, type ReactNode } from 'react'
import { AtSign, Info, Pencil, Phone, User, X } from 'lucide-react'
import type { Profile, ProfileChannel } from '../../lib/types'
import { profileChannel } from '../chat/api'
import Avatar from '../chat/Avatar'
import VerifiedBadge from '../verified/VerifiedBadge'
import PremiumBadge from '../premium/PremiumBadge'
import ColoredName, { ColorRing } from '../premium/ColoredName'
import { useColors } from '../premium/colors'
import { useMyVerified } from '../verified/useMyVerified'
import ChannelCard from '../chat/ChannelCard'
import ProfileGifts from '../market/ProfileGifts'
import CollectibleModal from '../market/CollectibleModal'
import type { CollectibleKind } from '../market/collectibles'
import ProfileEditModal from './ProfileEditModal'

interface Props { me: Profile; onClose: () => void; onSaved: (p: Profile) => void; onOpenChannel: (c: ProfileChannel) => Promise<void> }

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

export default function ProfileModal({ me, onClose, onSaved, onOpenChannel }: Props) {
  const verified = useMyVerified(me.id)
  const colors = useColors(me.id)
  const [editOpen, setEditOpen] = useState(false)
  const [collectible, setCollectible] = useState<{ kind: CollectibleKind; value: string } | null>(null)
  const [channel, setChannel] = useState<ProfileChannel | null>(null)
  useEffect(() => { profileChannel(me.id).then(setChannel).catch(() => undefined) }, [me.id, me.channel_id])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted">Мой профиль</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditOpen(true)} title="Редактировать профиль" className="rounded-lg p-1 text-muted transition hover:text-text"><Pencil size={18} /></button>
            <button onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ColorRing userId={me.id}>
            <div className="rounded-full bg-bg2 p-1"><Avatar name={me.display_name} url={me.avatar_url} size={104} /></div>
          </ColorRing>
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold">
            <ColoredName userId={me.id} name={me.display_name} className="break-words" />
            {verified && <VerifiedBadge size={18} />}<PremiumBadge userId={me.id} size={18} />
          </div>
        </div>

        <section className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 text-sm"><Info size={18} className="text-muted" /><span>О себе</span></div>
            <p className="mt-1.5 whitespace-pre-wrap break-words pl-[30px] text-sm text-accent">{me.bio || 'Не указано'}</p>
          </div>
          <Row icon={<User size={18} />} label="Имя">{me.display_name}</Row>
          {me.showcase_number && (
            <Row icon={<Phone size={18} />} label="Номер" onClick={() => setCollectible({ kind: 'number', value: me.showcase_number as string })}>
              {me.showcase_number}
            </Row>
          )}
          <Row icon={<AtSign size={18} />} label="Имя пользователя">
            <span style={colors?.username ? { color: colors.username } : undefined}>@{me.username}</span>
          </Row>
          {me.handles.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-xs text-muted">а также</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {me.handles.map((h) => (
                  <button key={h} type="button" onClick={() => setCollectible({ kind: 'username', value: h })} title="О юзернейме"
                    className="rounded-full bg-accent/15 px-3 py-1 text-sm text-accent transition hover:brightness-125">@{h}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        <ProfileGifts userId={me.id} title="Мои подарки" />

        {channel ? (
          <div>
            <div className="mb-1 px-1 text-xs text-muted">Канал в профиле</div>
            <ChannelCard card={channel} onOpen={(c) => { onClose(); return onOpenChannel(c) }} />
          </div>
        ) : (
          <p className="text-xs text-muted">Канал в профиль: откройте свой канал, затем «Информация» → «Показывать в профиле».</p>
        )}
        <p className="text-xs text-muted">Имя, фото, описание и оформление меняются через карандаш. Юзернеймы, номера и подарки — в Маркете → «Мои предметы».</p>

        {verified && (
          <div className="flex items-start gap-2 rounded-2xl bg-surface p-3 text-sm text-muted">
            <VerifiedBadge size={16} className="mt-0.5" />
            <span>Ваш аккаунт подтверждён как официальный представителями Sunset.</span>
          </div>
        )}
      </div>
      {editOpen && <ProfileEditModal me={me} onClose={() => setEditOpen(false)} onSaved={onSaved} />}
      {collectible && <CollectibleModal kind={collectible.kind} value={collectible.value} onClose={() => setCollectible(null)} />}
    </div>
  )
}
