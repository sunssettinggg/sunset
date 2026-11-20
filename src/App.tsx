import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Profile, ProfileChannel } from './lib/types'
import {
  getFlag, getMuted, loadBackground, loadTheme, saveBackground, saveTheme, setFlag,
  setMuted as persistMuted, type FlagName, type Theme,
} from './lib/prefs'
import { useSession } from './features/auth/session'
import AuthGate from './features/auth/AuthGate'
import AccountMenu from './features/auth/AccountMenu'
import { addAccountFlow, saveAccount, signOutCurrent, switchAccount, useAccountSync } from './features/auth/accounts'
import MarketPage from './features/market/MarketPage'
import AdminPage from './features/admin/AdminPage'
import { useIsAdmin } from './features/admin/useIsAdmin'
import { endThisDevice, useDeviceHeartbeat } from './features/settings/devices'
import PremiumPage from './features/premium/PremiumPage'
import { OPEN_PREMIUM_EVENT } from './features/premium/premium'
import NavRail, { type View } from './features/chat/NavRail'
import Sidebar from './features/chat/Sidebar'
import ChatView from './features/chat/ChatView'
import RightPanel from './features/chat/RightPanel'
import GroupPanel from './features/chat/GroupPanel'
import NewChatModal from './features/chat/NewChatModal'
import ProfileModal from './features/profile/ProfileModal'
import SettingsModal from './features/settings/SettingsModal'
import { joinChat } from './features/chat/api'
import { useChats, useOnline } from './features/chat/hooks'

const PROFILE_SELECT = 'id, username, display_name, bio, avatar_url, created_at, showcase_number, handles, channel_id, verified, avatar_visibility, number_visibility'

function Messenger({ userId }: { userId: string }) {
  const [me, setMe] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [view, setView] = useState<View>('chats')
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [background, setBackground] = useState<string | null>(loadBackground)
  const [muted, setMutedState] = useState<string[]>(getMuted)
  const [flags, setFlags] = useState<Record<FlagName, boolean>>({
    sound: getFlag('sound'), online: getFlag('online'), motion: getFlag('motion'),
  })
  const { chats, loading, unread, last, reload, reloadMeta } = useChats(userId, selectedId)
  const online = useOnline(userId, flags.online)
  const isAdmin = useIsAdmin(userId)

  const loadMe = useCallback(() => {
    supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single()
      .then(({ data, error }) => {
        if (!error) { setMe(data as Profile); return }
        const isAuthError = /jwt|refresh token/i.test(error.message)
        if (isAuthError) void supabase.auth.signOut()
        else setError(error.message)
      })
  }, [userId])
  useEffect(() => { loadMe() }, [loadMe])
  useDeviceHeartbeat(userId)
  useEffect(() => {
    const open = () => setView('premium')
    window.addEventListener(OPEN_PREMIUM_EVENT, open)
    return () => window.removeEventListener(OPEN_PREMIUM_EVENT, open)
  }, [])
  useEffect(() => {
    if (!me) return
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) saveAccount(data.session, me)
    })
  }, [me])

  if (error) return <p className="p-6 text-pink">Ошибка чтения профиля: {error}</p>
  if (!me) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>

  const selected = chats.find((c) => c.id === selectedId) ?? null
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)
  const isGroupLike = selected?.kind === 'group' || selected?.kind === 'channel'
  const selectedOnline = selected !== null && selected.otherId !== null && online.has(selected.otherId)

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
  async function openChannel(card: ProfileChannel): Promise<void> {
    if (!card.joined) {
      if (!card.is_public) return
      await joinChat(card.id)
      await reload()
    }
    setSelectedId(card.id)
  }

  return (
    <div className="flex h-full">
      <div className={view !== 'chats' ? 'flex' : selected ? 'hidden md:flex' : 'flex w-full md:w-auto'}>
        <NavRail me={me} theme={theme} view={view} totalUnread={totalUnread} isAdmin={isAdmin} onChangeView={setView}
          onToggleTheme={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          onOpenProfile={() => setProfileOpen(true)} onOpenSettings={() => setMenuOpen(true)} />
        {view === 'chats' && <Sidebar myId={me.id} chats={chats} loading={loading} selectedId={selectedId} unread={unread}
          last={last} online={online} muted={muted} onSelect={setSelectedId} onChatCreated={reload}
          onToggleMute={toggleMute}
          onChatChanged={(id) => { if (id === selectedId) { setSelectedId(null); setShowInfo(false) } void reload(); void reloadMeta() }}
          onNewChat={() => setNewChatOpen(true)} />}
      </div>
      {view === 'admin' && isAdmin ? (
        <AdminPage me={me} onProfileChanged={loadMe} />
      ) :view === 'market' ? (
        <MarketPage me={me} onProfileChanged={loadMe} />
      ) : view === 'premium' ? (
        <PremiumPage me={me} onProfileChanged={loadMe} />
      ) : selected ? (
        <>
          <ChatView key={selected.id} chat={selected} chats={chats} myId={me.id} myName={me.display_name}
            background={background} online={selectedOnline}
            onBack={() => setSelectedId(null)} onToggleInfo={() => setShowInfo((v) => !v)} />
          {showInfo && isGroupLike && (
            <GroupPanel chat={selected} me={me} muted={muted.includes(selected.id)}
              onToggleMute={() => toggleMute(selected.id)} onProfileChanged={loadMe} onChanged={reload}
              onLeft={() => { setSelectedId(null); setShowInfo(false) }} onClose={() => setShowInfo(false)} />
          )}
          {showInfo && selected.kind === 'direct' && (
            <RightPanel chat={selected} myId={me.id} muted={muted.includes(selected.id)} online={selectedOnline}
              onToggleMute={() => toggleMute(selected.id)} onOpenChannel={openChannel} onClose={() => setShowInfo(false)} />
          )}
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-bg text-sm text-muted md:flex">Выбери чат или найди человека</div>
      )}
      {menuOpen && <AccountMenu me={me} dark={theme === 'dark'} canOpenSaved={chats.some((c) => c.kind === 'saved')}
        onClose={() => setMenuOpen(false)}
        onProfile={() => { setMenuOpen(false); setProfileOpen(true) }}
        onSettings={() => { setMenuOpen(false); setSettingsOpen(true) }}
        onNewChat={() => { setMenuOpen(false); setNewChatOpen(true) }}
        onSaved={() => {
          const s = chats.find((c) => c.kind === 'saved')
          setMenuOpen(false)
          if (s) { setView('chats'); setSelectedId(s.id) }
        }}
        onToggleTheme={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
        onSwitch={(id) => switchAccount(id)}
        onAddAccount={() => { setMenuOpen(false); void addAccountFlow(me.id) }} />}
      {profileOpen && <ProfileModal me={me} onOpenChannel={openChannel} onClose={() => setProfileOpen(false)}
        onSaved={(p) => { setMe(p); setProfileOpen(false) }} />}
      {settingsOpen && <SettingsModal me={me} onProfileChanged={loadMe} theme={theme} background={background}
        flags={flags} mutedCount={muted.length} onSetTheme={changeTheme} onSetBackground={changeBackground}
        onSetFlag={changeFlag} onEditProfile={() => setProfileOpen(true)}
        onSignOut={() => void endThisDevice().finally(() => signOutCurrent(me.id))} onClose={() => setSettingsOpen(false)} />}
      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)}
        onDone={(id) => { setNewChatOpen(false); void reload().then(() => setSelectedId(id)) }} />}
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()
  useAccountSync()
  if (loading) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>
  return session ? <Messenger key={session.user.id} userId={session.user.id} /> : <AuthGate />
}
