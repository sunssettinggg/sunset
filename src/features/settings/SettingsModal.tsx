import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Bell, ImagePlus, Lock, LogOut, MessageCircle, Sparkles, Trash2, User, type LucideIcon } from 'lucide-react'
import { fileToBackground, type FlagName, type Theme } from '../../lib/prefs'
import type { Profile } from '../../lib/types'
import Avatar from '../chat/Avatar'
import UsernameLine from '../chat/UsernameLine'
import { setPrivacy, VISIBILITY_LABELS, type Visibility } from '../privacy/visibility'
import { deviceId, endOtherSessions, listSessions, type DeviceSession } from './devices'

type Page = 'account' | 'notif' | 'privacy' | 'chats' | 'motion'

const TITLES: Record<Page, string> = {
  account: 'Мой аккаунт', notif: 'Уведомления и звуки', privacy: 'Конфиденциальность',
  chats: 'Настройки чатов', motion: 'Анимация',
}

interface Props {
  me: Profile
  theme: Theme
  background: string | null
  flags: Record<FlagName, boolean>
  mutedCount: number
  onSetTheme: (t: Theme) => void
  onSetBackground: (value: string | null) => boolean
  onSetFlag: (name: FlagName, value: boolean) => void
  onEditProfile: () => void
  onProfileChanged: () => void
  onSignOut: () => void
  onClose: () => void
}

function MenuRow({ Icon, label, value, danger, onClick }: { Icon: LucideIcon; label: string; value?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-surface ${danger ? 'text-pink' : ''}`}>
      <Icon size={20} className={danger ? '' : 'text-muted'} />
      <span className="flex-1">{label}</span>
      {value && <span className="text-accent">{value}</span>}
    </button>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <span className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${checked ? 'bg-accent' : 'bg-bg'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm break-words">{value}</div>
    </div>
  )
}

function VisibilityPicker({ label, hint, value, onChange }: { label: string; hint: string; value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <div className="px-4 py-3">
      <div className="text-sm">{label}</div>
      <div className="mb-2 text-xs text-muted">{hint}</div>
      <div className="flex gap-1 rounded-xl bg-bg p-1">
        {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className={`flex-1 rounded-lg py-1.5 text-sm transition ${value === v ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'}`}>
            {VISIBILITY_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  )
}

function lastSeenText(iso: string): string {
  const diff = Date.now() - Date.parse(iso)
  if (diff < 10 * 60 * 1000) return 'сейчас онлайн'
  return 'был(а) ' + new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function SettingsModal(p: Props) {
  const [page, setPage] = useState<Page | null>(null)
  const [avatarVis, setAvatarVis] = useState<Visibility>((p.me.avatar_visibility as Visibility | undefined) ?? 'everyone')
  const [numberVis, setNumberVis] = useState<Visibility>((p.me.number_visibility as Visibility | undefined) ?? 'everyone')
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null)
  const [busy, setBusy] = useState(false)
  const thisDevice = deviceId()

  useEffect(() => {
    if (page !== 'privacy') return
    let active = true
    listSessions().then((s) => { if (active) setSessions(s) }).catch(() => { if (active) setSessions([]) })
    return () => { active = false }
  }, [page])

  async function changeVisibility(kind: 'avatar' | 'number', v: Visibility) {
    const prevA = avatarVis, prevN = numberVis
    if (kind === 'avatar') setAvatarVis(v); else setNumberVis(v)
    try {
      await setPrivacy(kind === 'avatar' ? v : null, kind === 'number' ? v : null)
      p.onProfileChanged()
    } catch (err) {
      setAvatarVis(prevA); setNumberVis(prevN)
      setError((err as Error).message)
    }
  }

  async function logoutOthers() {
    setBusy(true); setError(null)
    try { await endOtherSessions(); setSessions(await listSessions()) }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const ok = p.onSetBackground(await fileToBackground(file))
      setError(ok ? null : 'Не удалось сохранить: в браузере мало места.')
    } catch (err) { setError((err as Error).message) }
  }

  const seg = (t: Theme) =>
    `flex-1 rounded-lg py-2 text-sm transition ${p.theme === t ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'}`

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={p.onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-bg2 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2 px-2">
          {page && <button onClick={() => { setPage(null); setError(null) }} className="rounded-lg p-1 text-muted hover:text-text"><ArrowLeft size={20} /></button>}
          <h2 className="text-lg font-medium">{page ? TITLES[page] : 'Настройки'}</h2>
        </div>

        {page === null && (
          <div>
            <MenuRow Icon={User} label="Мой аккаунт" onClick={() => setPage('account')} />
            <MenuRow Icon={Bell} label="Уведомления и звуки" onClick={() => setPage('notif')} />
            <MenuRow Icon={Lock} label="Конфиденциальность" onClick={() => setPage('privacy')} />
            <MenuRow Icon={MessageCircle} label="Настройки чатов" onClick={() => setPage('chats')} />
            <MenuRow Icon={Sparkles} label="Анимация" onClick={() => setPage('motion')} />
            <div className="my-2 border-t border-line" />
            <MenuRow Icon={LogOut} label="Выйти из аккаунта" danger onClick={p.onSignOut} />
          </div>
        )}

        {page === 'account' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <Avatar name={p.me.display_name} url={p.me.avatar_url} size={64} />
              <div className="min-w-0">
                <div className="truncate font-medium">{p.me.display_name}</div>
                <div className="text-sm"><UsernameLine muted username={p.me.username} handles={p.me.handles} /></div>
              </div>
            </div>
            <div className="divide-y divide-line rounded-xl bg-surface">
              <Info label="О себе" value={p.me.bio || 'Не указано'} />
              {p.me.showcase_number && <Info label="Номер" value={p.me.showcase_number} />}
            </div>
            <button onClick={() => { p.onClose(); p.onEditProfile() }}
              className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110">
              Редактировать профиль
            </button>
          </div>
        )}

        {page === 'notif' && (
          <div className="divide-y divide-line rounded-xl bg-surface">
            <Toggle label="Звук новых сообщений" hint="Сигнал, когда пишут в закрытый чат" checked={p.flags.sound} onChange={(v) => p.onSetFlag('sound', v)} />
            <Info label="Чатов без звука" value={`${p.mutedCount} (настраивается в профиле собеседника)`} />
          </div>
        )}

        {page === 'privacy' && (
          <div className="space-y-4">
            <div className="divide-y divide-line rounded-xl bg-surface">
              <Toggle label="Показывать, что я в сети" hint="Если выключить, другие увидят вас «не в сети»" checked={p.flags.online} onChange={(v) => p.onSetFlag('online', v)} />
              <VisibilityPicker label="Кто видит мою аватарку" hint="Контакты — люди, с которыми у вас есть личный чат"
                value={avatarVis} onChange={(v) => void changeVisibility('avatar', v)} />
              <VisibilityPicker label="Кто видит мой номер" hint="Влияет и на поиск по номеру"
                value={numberVis} onChange={(v) => void changeVisibility('number', v)} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
                <span>Устройства</span>
                <span>{sessions === null ? '…' : `активных: ${sessions.length}`}</span>
              </div>
              <div className="divide-y divide-line rounded-xl bg-surface">
                {sessions !== null && sessions.length === 0 && <div className="px-4 py-3 text-sm text-muted">Список появится после следующего входа.</div>}
                {(sessions ?? []).map((s) => (
                  <div key={s.device_id} className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{s.label}</span>
                      {s.device_id === thisDevice && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">это устройство</span>}
                    </div>
                    <div className="text-xs text-muted">{s.device_id === thisDevice ? 'сейчас онлайн' : lastSeenText(s.last_seen)}</div>
                  </div>
                ))}
              </div>
              {sessions !== null && sessions.some((s) => s.device_id !== thisDevice) && (
                <button onClick={() => void logoutOthers()} disabled={busy}
                  className="mt-2 w-full rounded-xl bg-surface py-2.5 text-sm text-pink transition hover:brightness-110 disabled:opacity-60">
                  Выйти на остальных устройствах
                </button>
              )}
              {error && <p className="mt-2 text-xs text-pink">{error}</p>}
            </div>
          </div>
        )}

        {page === 'motion' && (
          <div className="divide-y divide-line rounded-xl bg-surface">
            <Toggle label="Анимации интерфейса" hint="Выключите, чтобы убрать переходы и пульсации" checked={p.flags.motion} onChange={(v) => p.onSetFlag('motion', v)} />
          </div>
        )}

        {page === 'chats' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 px-1 text-xs text-muted">Тема</div>
              <div className="flex gap-1 rounded-xl bg-surface p-1">
                <button className={seg('dark')} onClick={() => p.onSetTheme('dark')}>Тёмная</button>
                <button className={seg('light')} onClick={() => p.onSetTheme('light')}>Светлая</button>
              </div>
            </div>
            <div>
              <div className="mb-2 px-1 text-xs text-muted">Фон чата</div>
              <div className="mb-2 h-24 rounded-xl bg-surface bg-cover bg-center"
                style={p.background ? { backgroundImage: `url(${p.background})` } : undefined} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface py-2 text-sm transition hover:brightness-110">
                  <ImagePlus size={16} /> Загрузить
                </button>
                {p.background && (
                  <button onClick={() => { p.onSetBackground(null); setError(null) }}
                    className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-muted transition hover:text-text">
                    <Trash2 size={16} /> Убрать
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">Фон хранится только на этом устройстве.</p>
              {error && <p className="mt-1 text-xs text-pink">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
