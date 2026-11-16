import { MessageCircle, Moon, Settings, Sparkles, Star, Sun } from 'lucide-react'
import type { Profile } from '../../lib/types'
import type { Theme } from '../../lib/prefs'
import Avatar from './Avatar'

export type View = 'chats' | 'market' | 'premium'

interface Props {
  me: Profile
  theme: Theme
  view: View
  totalUnread: number
  onChangeView: (v: View) => void
  onToggleTheme: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
}

const iconBtn = 'flex h-11 w-11 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-text'
const navBtn = (active: boolean) =>
  `relative flex h-11 w-11 items-center justify-center rounded-xl transition ${active ? 'bg-surface text-accent' : 'text-muted hover:bg-surface hover:text-text'}`

export default function NavRail({ me, theme, view, totalUnread, onChangeView, onToggleTheme, onOpenProfile, onOpenSettings }: Props) {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-line bg-bg2 py-3">
      <button onClick={onOpenProfile} title="Профиль" className="rounded-full transition hover:opacity-80">
        <Avatar name={me.display_name} url={me.avatar_url} size={40} />
      </button>
      <button onClick={() => onChangeView('chats')} title="Чаты" className={`${navBtn(view === 'chats')} mt-3`}>
        <MessageCircle size={22} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-on-accent">{totalUnread}</span>
        )}
      </button>
      <button onClick={() => onChangeView('market')} title="Маркет" className={navBtn(view === 'market')}>
        <Star size={22} />
      </button>
      <button onClick={() => onChangeView('premium')} title="Sunset Premium" className={navBtn(view === 'premium')}>
        <Sparkles size={22} />
      </button>
      <div className="flex-1" />
      <button onClick={onToggleTheme} title="Сменить тему" className={iconBtn}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button onClick={onOpenSettings} title="Настройки" className={iconBtn}><Settings size={20} /></button>
    </nav>
  )
}
