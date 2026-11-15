import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import type { Profile } from '../../lib/types'
import { updateProfile, uploadAvatar } from '../chat/api'
import Avatar from '../chat/Avatar'

interface Props { me: Profile; onClose: () => void; onSaved: (p: Profile) => void }

const field = 'w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-accent'

export default function ProfileModal({ me, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(me.display_name)
  const [bio, setBio] = useState(me.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
    if (!name) { setError('Имя не может быть пустым.'); return }
    setBusy(true); setError(null)
    try { onSaved(await updateProfile(me.id, { display_name: name, bio: bio.trim() || null, avatar_url: avatarUrl })) }
    catch (err) { setError((err as Error).message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass w-full max-w-sm space-y-4 rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium">Профиль</h2>
        <div className="flex items-center gap-4">
          <Avatar name={displayName} url={avatarUrl} size={72} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onFile(e)} />
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm transition hover:brightness-125 disabled:opacity-60">
            <Camera size={16} /> Сменить фото
          </button>
        </div>
        <div className="text-xs text-muted">@{me.username}</div>
        {(me.showcase_number || me.showcase_handle) && (
          <div className="divide-y divide-line rounded-xl bg-surface">
            {me.showcase_number && (
              <div className="px-4 py-3"><div className="text-xs text-muted">Номер</div><div className="text-sm">{me.showcase_number}</div></div>
            )}
            {me.showcase_handle && (
              <div className="px-4 py-3"><div className="text-xs text-muted">Коллекционный юзернейм</div><div className="text-sm">@{me.showcase_handle}</div></div>
            )}
          </div>
        )}
        <input className={field} value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Имя" />
        <textarea className={`${field} h-24 resize-none`} value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="О себе" />
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
