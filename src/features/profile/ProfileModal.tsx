import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Camera, Info, Loader2, Phone, X } from 'lucide-react'
import type { Profile, ProfileChannel } from '../../lib/types'
import { changeUsername, profileChannel, updateProfile, uploadAvatar } from '../chat/api'
import Avatar from '../chat/Avatar'
import VerifiedBadge from '../verified/VerifiedBadge'
import { useMyVerified } from '../verified/useMyVerified'
import ChannelCard from '../chat/ChannelCard'
import ProfileGifts from '../market/ProfileGifts'
import CollectibleModal from '../market/CollectibleModal'
import type { CollectibleKind } from '../market/collectibles'

interface Props { me: Profile; onClose: () => void; onSaved: (p: Profile) => void; onOpenChannel: (c: ProfileChannel) => Promise<void> }

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function friendly(msg: string): string {
  if (msg.includes('username taken') || msg.includes('duplicate')) return 'Этот username уже занят.'
  if (msg.includes('invalid username')) return 'Username: 3–20 символов, только a-z, 0-9 и _.'
  return msg
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4">
      {title && <div className="mb-2 text-xs text-muted">{title}</div>}
      {children}
    </section>
  )
}

export default function ProfileModal({ me, onClose, onSaved, onOpenChannel }: Props) {
  const [displayName, setDisplayName] = useState(me.display_name)
  const [username, setUsername] = useState(me.username)
  const [bio, setBio] = useState(me.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const verified = useMyVerified(me.id)
  const [collectible, setCollectible] = useState<{ kind: CollectibleKind; value: string } | null>(null)
  const [channel, setChannel] = useState<ProfileChannel | null>(null)
  useEffect(() => { profileChannel(me.id).then(setChannel).catch(() => undefined) }, [me.id, me.channel_id])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError(null)
    try { setAvatarUrl(await uploadAvatar(me.id, file)) }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  async function save() {
    const name = displayName.trim()
    const handle = username.trim().toLowerCase()
    if (!name) { setError('Имя не может быть пустым.'); return }
    if (!USERNAME_RE.test(handle)) { setError(friendly('invalid username')); return }
    setBusy(true); setError(null)
    try {
      if (handle !== me.username) await changeUsername(handle)
      onSaved(await updateProfile(me.id, { display_name: name, bio: bio.trim() || null, avatar_url: avatarUrl }))
    } catch (err) {
      setError(friendly((err as Error).message))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted">Мой профиль</h2>
          <button onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onFile(e)} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} title="Сменить фото" className="group relative rounded-full">
            <span className="block rounded-full bg-gradient-to-tr from-accent to-pink p-[3px]">
              <span className="block rounded-full bg-bg2 p-1"><Avatar name={displayName} url={avatarUrl} size={104} /></span>
            </span>
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent shadow transition group-hover:brightness-110">
              <Camera size={16} />
            </span>
          </button>
          <div className="flex w-full items-center justify-center gap-1.5">
            <input value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Имя"
              size={Math.max(displayName.length, 3)} style={{ minWidth: '3ch', maxWidth: '16rem' }}
              className="bg-transparent text-center text-xl font-bold outline-none placeholder:text-muted" />
            {verified && <VerifiedBadge size={18} />}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="flex items-center">
              <span>@</span>
              <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="username"
                size={Math.max(username.length, 3)} style={{ minWidth: '3ch', maxWidth: '12rem' }}
                className="bg-transparent text-left outline-none placeholder:text-muted" />
            </span>
            {me.handles.map((h) => (
              <button key={h} type="button" onClick={() => setCollectible({ kind: 'username', value: h })} title="О юзернейме"
                className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.85em] text-accent transition hover:brightness-125">@{h}</button>
            ))}
          </div>
        </div>

        <Card title="О себе">
          <div className="flex items-start gap-3">
            <Info size={16} className="mt-1 shrink-0 text-accent" />
            <textarea value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Расскажите о себе"
              className="h-16 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted" />
          </div>
        </Card>

        {me.showcase_number && (
          <Card title="Номер">
            <button onClick={() => setCollectible({ kind: 'number', value: me.showcase_number as string })} title="О номере"
              className="flex items-center gap-3 text-left text-sm transition hover:brightness-125">
              <Phone size={16} className="text-accent" />{me.showcase_number}
            </button>
          </Card>
        )}

        <ProfileGifts userId={me.id} title="Мои подарки" />

        {channel ? (
          <div>
            <div className="mb-1 px-1 text-xs text-muted">Канал в профиле</div>
            <ChannelCard card={channel} onOpen={(c) => { onClose(); return onOpenChannel(c) }} />
          </div>
        ) : (
          <p className="text-xs text-muted">Канал в профиль: откройте свой канал, затем «Информация» → «Показывать в профиле».</p>
        )}
        <p className="text-xs text-muted">Юзернеймы и подарки добавляются и скрываются в Маркете → «Мои предметы».</p>

        {verified && (
          <div className="flex items-start gap-2 rounded-2xl bg-surface p-3 text-sm text-muted">
            <VerifiedBadge size={16} className="mt-0.5" />
            <span>Ваш аккаунт подтверждён как официальный представителями Sunset.</span>
          </div>
        )}
        {error && <p className="text-sm text-pink">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
          <button onClick={() => void save()} disabled={busy}
            className="sunset-gradient flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />} Сохранить
          </button>
        </div>
      </div>
      {collectible && <CollectibleModal kind={collectible.kind} value={collectible.value} onClose={() => setCollectible(null)} />}
    </div>
  )
}
