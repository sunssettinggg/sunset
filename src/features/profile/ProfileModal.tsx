import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import type { Profile, ProfileChannel } from '../../lib/types'
import { changeUsername, profileChannel, updateProfile, uploadAvatar } from '../chat/api'
import Avatar from '../chat/Avatar'
import VerifiedBadge from '../verified/VerifiedBadge'
import { useMyVerified } from '../verified/useMyVerified'
import ChannelCard from '../chat/ChannelCard'

interface Props { me: Profile; onClose: () => void; onSaved: (p: Profile) => void; onOpenChannel: (c: ProfileChannel) => Promise<void> }

const field = 'w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-accent'
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function friendly(msg: string): string {
  if (msg.includes('username taken') || msg.includes('duplicate')) return 'Этот username уже занят.'
  if (msg.includes('invalid username')) return 'Username: 3–20 символов, только a-z, 0-9 и _.'
  return msg
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
      <div className="glass max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium">Профиль</h2>
        <div className="flex items-center gap-4">
          <Avatar name={displayName} url={avatarUrl} size={72} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onFile(e)} />
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm transition hover:brightness-125 disabled:opacity-60">
            <Camera size={16} /> Сменить фото
          </button>
        </div>

        <input className={field} value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Имя" />
        <div className="flex items-center gap-2 rounded-xl bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
          <span className="text-muted">@</span>
          <input className="w-full bg-transparent py-3 text-sm outline-none" value={username} maxLength={20}
            onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="username" />
        </div>
        <textarea className={`${field} h-20 resize-none`} value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="О себе" />

        {(me.showcase_number || me.handles.length > 0) && (
          <div className="divide-y divide-line rounded-xl bg-surface">
            {me.showcase_number && (
              <div className="px-4 py-3"><div className="text-xs text-muted">Номер</div><div className="text-sm">{me.showcase_number}</div></div>
            )}
            {me.handles.length > 0 && (
              <div className="px-4 py-3">
                <div className="mb-1 text-xs text-muted">Коллекционные юзернеймы ({me.handles.length}/10)</div>
                <div className="flex flex-wrap gap-1 text-sm">
                  {me.handles.map((h) => <span key={h} className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">@{h}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
        {channel ? (
          <div>
            <div className="mb-1 px-1 text-xs text-muted">Канал в профиле</div>
            <ChannelCard card={channel} onOpen={(c) => { onClose(); return onOpenChannel(c) }} />
          </div>
        ) : (
          <p className="text-xs text-muted">Канал в профиль: откройте свой канал, затем «Информация» → «Показывать в профиле».</p>
        )}
        <p className="text-xs text-muted">Коллекционные юзернеймы добавляются и убираются в Настройки → Маркет.</p>

        {verified && (
          <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-muted">
            <VerifiedBadge size={16} className="mt-0.5" />
            <span>Ваш аккаунт подтверждён как официальный представителями Sunset.</span>
          </div>
        )}
        {error && <p className="text-sm text-pink">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
          <button onClick={() => void save()} disabled={busy}
            className="sunset-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />} Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
