import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ChevronRight, Loader2, Palette, Phone, X } from 'lucide-react'
import type { Profile } from '../../lib/types'
import { changeUsername, updateProfile, uploadAvatar } from '../chat/api'
import Avatar from '../chat/Avatar'
import ProfileStylePage from './ProfileStylePage'

interface Props { me: Profile; onClose: () => void; onSaved: (p: Profile) => void }

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function friendly(msg: string): string {
  if (msg.includes('username taken') || msg.includes('duplicate')) return 'Этот username уже занят.'
  if (msg.includes('invalid username')) return 'Username: 3–20 символов, только a-z, 0-9 и _.'
  return msg
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface px-4 py-3">
      <div className="mb-1 text-xs text-muted">{label}</div>
      {children}
    </section>
  )
}

export default function ProfileEditModal({ me, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(me.display_name)
  const [username, setUsername] = useState(me.username)
  const [bio, setBio] = useState(me.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState<'main' | 'style'>('main')

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
      onClose()
    } catch (err) {
      setError(friendly((err as Error).message))
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-bg2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {page === 'style' ? (
          <ProfileStylePage userId={me.id} name={displayName} username={username} onBack={() => setPage('main')} onClose={onClose} />
        ) : (
          <>
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-base font-semibold">Редактировать профиль</h2>
            <button type="button" onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
          </div>

          <div className="space-y-3 overflow-y-auto px-5 pb-4">
            <div className="flex justify-center py-1">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onFile(e)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} title="Сменить фото" className="group relative rounded-full">
                <Avatar name={displayName} url={avatarUrl} size={96} />
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent shadow transition group-hover:brightness-110">
                  <Camera size={16} />
                </span>
              </button>
            </div>

            <Field label="Имя">
              <input value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Имя"
                className="w-full bg-transparent text-base outline-none placeholder:text-muted" />
            </Field>
            <Field label="Имя пользователя">
              <div className="flex items-center text-base">
                <span className="text-muted">@</span>
                <input value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="username"
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
              </div>
            </Field>
            <Field label="О себе">
              <textarea value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Расскажите о себе"
                className="h-20 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted" />
            </Field>
            <Field label="Номер">
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-accent" />
                <span>{me.showcase_number ?? 'Не выбран'}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Номера и юзернеймы меняются в Маркете → «Мои предметы».</p>
            </Field>

            <button type="button" onClick={() => setPage('style')}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left transition hover:brightness-110">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Palette size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Оформление профиля</span>
                <span className="block text-xs text-muted">Цвета имени, юзернейма, рамки и сообщений</span>
              </span>
              <ChevronRight size={16} className="text-muted" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
            {error && <p className="mr-auto text-xs text-pink">{error}</p>}
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
            <button type="button" onClick={() => void save()} disabled={busy}
              className="sunset-gradient flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />} Сохранить
            </button>
          </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
