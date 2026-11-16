import { useState, type ReactNode } from 'react'
import { Bookmark, Check, ChevronDown, ChevronUp, Loader2, Megaphone, Moon, Plus, Settings, User, Users } from 'lucide-react'
import type { Profile } from '../../lib/types'
import Avatar from '../chat/Avatar'
import VerifiedBadge from '../verified/VerifiedBadge'
import { MAX_ACCOUNTS, readAccounts } from './accounts'

interface Props {
  me: Profile
  dark: boolean
  canOpenSaved: boolean
  onClose: () => void
  onProfile: () => void
  onSettings: () => void
  onNewChat: () => void
  onSaved: () => void
  onToggleTheme: () => void
  onSwitch: (id: string) => Promise<string | null>
  onAddAccount: () => void
}

interface Row { id: string; name: string; username: string; avatar: string | null }

function Item({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-surface disabled:opacity-40">
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  )
}

export default function AccountMenu({
  me, dark, canOpenSaved, onClose, onProfile, onSettings, onNewChat, onSaved, onToggleTheme, onSwitch, onAddAccount,
}: Props) {
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const stored = readAccounts().filter((a) => a.id !== me.id)
  const rows: Row[] = [
    { id: me.id, name: me.display_name, username: me.username, avatar: me.avatar_url },
    ...stored.map((a) => ({ id: a.id, name: a.display_name, username: a.username, avatar: a.avatar_url })),
  ]

  async function pick(id: string) {
    if (id === me.id || busyId) return
    setBusyId(id)
    setError(null)
    const err = await onSwitch(id)
    if (err) { setError(err); setBusyId(null) }
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-black/50" onClick={onClose}>
      <aside className="flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-bg2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-6 pb-3">
          <Avatar name={me.display_name} url={me.avatar_url} size={56} />
          <button type="button" onClick={() => setOpen(!open)} className="mt-3 flex w-full items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-base font-semibold">
                <span className="truncate">{me.display_name}</span>
                {me.verified && <VerifiedBadge size={16} />}
              </span>
              <span className="block truncate text-xs text-muted">@{me.username}</span>
            </span>
            {open ? <ChevronUp size={18} className="shrink-0 text-muted" /> : <ChevronDown size={18} className="shrink-0 text-muted" />}
          </button>
        </div>

        {open && (
          <div className="border-y border-line px-2 py-2">
            {rows.map((r) => (
              <button key={r.id} type="button" disabled={busyId !== null} onClick={() => void pick(r.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface disabled:opacity-60">
                <span className={'rounded-full ' + (r.id === me.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg2' : '')}>
                  <Avatar name={r.name} url={r.avatar} size={36} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted">@{r.username}</span>
                </span>
                {r.id === me.id && <Check size={16} className="shrink-0 text-accent" />}
                {busyId === r.id && <Loader2 size={16} className="shrink-0 animate-spin text-muted" />}
              </button>
            ))}
            {rows.length < MAX_ACCOUNTS && (
              <button type="button" onClick={onAddAccount}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent"><Plus size={18} /></span>
                Добавить аккаунт
              </button>
            )}
            {error && <p className="px-3 pt-2 text-xs text-pink">{error}</p>}
          </div>
        )}

        <nav className="px-2 py-2">
          <Item icon={<User size={20} />} label="Мой профиль" onClick={onProfile} />
          <Item icon={<Users size={20} />} label="Создать группу" onClick={onNewChat} />
          <Item icon={<Megaphone size={20} />} label="Создать канал" onClick={onNewChat} />
          <Item icon={<Bookmark size={20} />} label="Избранное" onClick={onSaved} disabled={!canOpenSaved} />
          <Item icon={<Settings size={20} />} label="Настройки" onClick={onSettings} />
          <div className="flex items-center gap-4 rounded-xl px-3 py-3 text-sm">
            <span className="text-muted"><Moon size={20} /></span>
            <span className="flex-1">Ночной режим</span>
            <button type="button" role="switch" aria-checked={dark} onClick={onToggleTheme}
              className={'relative h-6 w-10 rounded-full transition ' + (dark ? 'bg-accent' : 'bg-surface')}>
              <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (dark ? 'left-[18px]' : 'left-0.5')} />
            </button>
          </div>
        </nav>

        <div className="mt-auto px-5 py-4 text-xs text-muted">Sunset Messenger</div>
      </aside>
    </div>
  )
}
