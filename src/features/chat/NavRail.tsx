import { MessageCircle, Moon, Settings, Sun } from 'lucide-react'
import type { Profile } from '../../lib/types'
import type { Theme } from '../../lib/prefs'
import Avatar from './Avatar'

interface Props {
  me: Profile
  theme: Theme
  totalUnread: number
  onToggleTheme: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
}

const iconBtn = 'flex h-11 w-11 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-text'

export default function NavRail({ me, theme, totalUnread, onToggleTheme, onOpenProfile, onOpenSettings }: Props) {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-line bg-bg2 py-3">
      <button onClick={onOpenProfile} title="Профиль" className="rounded-full transition hover:opacity-80">
        <Avatar name={me.display_name} url={me.avatar_url} size={40} />
      </button>
      <div className="relative mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-accent">
        <MessageCircle size={22} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-on-accent">{totalUnread}</span>
        )}
      </div>
      <div className="flex-1" />
      <button onClick={onToggleTheme} title="Сменить тему" className={iconBtn}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button onClick={onOpenSettings} title="Настройки" className={iconBtn}><Settings size={20} /></button>
    </nav>
  )
}
