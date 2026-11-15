import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Profile } from './lib/types'
import { useSession } from './features/auth/session'
import AuthPage from './features/auth/AuthPage'
import Sidebar from './features/chat/Sidebar'
import ChatView from './features/chat/ChatView'
import RightPanel from './features/chat/RightPanel'
import ProfileModal from './features/profile/ProfileModal'
import { useChats } from './features/chat/hooks'

function Messenger({ userId }: { userId: string }) {
  const [me, setMe] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { chats, loading, unread, reload } = useChats(userId, selectedId)

  useEffect(() => {
    supabase.from('profiles').select('id, username, display_name, bio, avatar_url').eq('id', userId).single()
      .then(({ data, error }) => (error ? setError(error.message) : setMe(data as Profile)))
  }, [userId])

  if (error) return <p className="p-6 text-pink">Ошибка чтения профиля: {error}</p>
  if (!me) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>

  const selected = chats.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-full">
      <div className={selected ? 'hidden md:block' : 'block w-full md:w-auto'}>
        <Sidebar me={me} chats={chats} loading={loading} selectedId={selectedId} unread={unread}
          onSelect={setSelectedId} onChatCreated={reload} onOpenProfile={() => setProfileOpen(true)}
          onSignOut={() => void supabase.auth.signOut()} />
      </div>
      {selected ? (
        <>
          <ChatView key={selected.id} chat={selected} myId={me.id} onBack={() => setSelectedId(null)}
            onToggleInfo={() => setShowInfo((v) => !v)} />
          {showInfo && <RightPanel chat={selected} onClose={() => setShowInfo(false)} />}
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center text-sm text-muted md:flex">Выбери чат или найди человека</div>
      )}
      {profileOpen && <ProfileModal me={me} onClose={() => setProfileOpen(false)}
        onSaved={(p) => { setMe(p); setProfileOpen(false) }} />}
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()
  if (loading) return <div className="flex h-full items-center justify-center text-muted">Загрузка…</div>
  return session ? <Messenger userId={session.user.id} /> : <AuthPage />
}
