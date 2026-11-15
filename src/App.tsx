import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Profile } from './lib/types'
import {
  getFlag, getMuted, loadBackground, loadTheme, saveBackground, saveTheme, setFlag,
  setMuted as persistMuted, type FlagName, type Theme,
} from './lib/prefs'
import { useSession } from './features/auth/session'
import AuthPage from './features/auth/AuthPage'
import NavRail from './features/chat/NavRail'
import Sidebar from './features/chat/Sidebar'
import ChatView from './features/chat/ChatView'
import RightPanel from './features/chat/RightPanel'
import ProfileModal from './features/profile/ProfileModal'
import SettingsModal from './features/settings/SettingsModal'
import { useChats, useOnline } from './features/chat/hooks'

const PROFILE_SELECT = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, showcase_handle'

function Messenger({ userId }: { userId: string }) {
  const { session } = useSession()
  const [me, setMe] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [background, setBackground] = useState<string | null>(loadBackground)
  const [muted, setMutedState] = useState<string[]>(getMuted)
  const [flags, setFlags] = useState<Record<FlagName, boolean>>({
    sound: getFlag('sound'), online: getFlag('online'), motion: getFlag('motion'),
  })
  const { chats, loading, unread, last, reload } = useChats(userId, selectedId)
  const online = useOnline(userId, flags.online)

  const loadMe = useCallback(() => {
    supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single()
      .then(({ data, error }) => (error ? setError(error.message) : setMe(data as Profile)))
  }, [userId])
  useEffect(() => { loadMe() }, [loadMe])

  if (error) return <p className="p-6 text-pink">Ошибка чтения профиля: {error}</p>
  if (!me) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>

  const selected = chats.find((c) => c.id === selectedId) ?? null
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  function changeTheme(next: Theme) { saveTheme(next); setTheme(next) }
  function changeBackground(value: string | null): boolean {
    const ok = saveBackground(value)
    if (ok) setBackground(value)
    return ok
  }
  function changeFlag(name: FlagName, value: boolean) {
    setFlag(name, value)
    setFlags((f) => ({ ...f, [name]: value }))
  }
  function toggleMute(chatId: string) {
    const next = muted.includes(chatId) ? muted.filter((id) => id !== chatId) : [...muted, chatId]
    persistMuted(next)
    setMutedState(next)
  }

  return (
    <div className="flex h-full">
      <div className={selected ? 'hidden md:flex' : 'flex w-full md:w-auto'}>
        <NavRail me={me} theme={theme} totalUnread={totalUnread}
          onToggleTheme={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          onOpenProfile={() => setProfileOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        <Sidebar myId={me.id} chats={chats} loading={loading} selectedId={selectedId} unread={unread}
          last={last} online={online} muted={muted} onSelect={setSelectedId} onChatCreated={reload} />
      </div>
      {selected ? (
        <>
          <ChatView key={selected.id} chat={selected} chats={chats} myId={me.id} myName={me.display_name}
            background={background} online={selected.otherId !== null && online.has(selected.otherId)}
            onBack={() => setSelectedId(null)} onToggleInfo={() => setShowInfo((v) => !v)} />
          {showInfo && selected.kind !== 'saved' && (
            <RightPanel chat={selected} muted={muted.includes(selected.id)}
              online={selected.otherId !== null && online.has(selected.otherId)}
              onToggleMute={() => toggleMute(selected.id)} onClose={() => setShowInfo(false)} />
          )}
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-bg text-sm text-muted md:flex">Выбери чат или найди человека</div>
      )}
      {profileOpen && <ProfileModal me={me} onClose={() => setProfileOpen(false)}
        onSaved={(p) => { setMe(p); setProfileOpen(false) }} />}
      {settingsOpen && <SettingsModal me={me} email={session?.user.email ?? ''} theme={theme} background={background}
        flags={flags} mutedCount={muted.length} onSetTheme={changeTheme} onSetBackground={changeBackground}
        onSetFlag={changeFlag} onEditProfile={() => setProfileOpen(true)} onProfileChanged={loadMe}
        onSignOut={() => void supabase.auth.signOut()} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()
  if (loading) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>
  return session ? <Messenger userId={session.user.id} /> : <AuthPage />
}
