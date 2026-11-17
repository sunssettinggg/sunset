import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createChat, joinByInvite } from './api'

type Tab = 'group' | 'channel' | 'join'
type HandleState = 'idle' | 'checking' | 'free' | 'taken'
interface Props { onClose: () => void; onDone: (chatId: string) => void }

const field = 'w-full rounded-xl bg-surface px-4 py-3 text-sm outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-accent'
const HANDLE_RE = /^[a-z0-9_]{3,30}$/

function friendly(msg: string): string {
  if (msg.includes('handle taken') || msg.includes('duplicate')) return 'Этот юзернейм уже занят.'
  if (msg.includes('bad handle')) return 'Ссылка: 3–30 символов, только a-z, 0-9 и _.'
  if (msg.includes('bad title')) return 'Название: от 1 до 80 символов.'
  if (msg.includes('invalid invite')) return 'Код приглашения не найден.'
  return msg
}

export default function NewChatModal({ onClose, onDone }: Props) {
  const [tab, setTab] = useState<Tab>('group')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [handle, setHandle] = useState('')
  const [handleState, setHandleState] = useState<HandleState>('idle')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Подсказка «занят / свободен», пока человек печатает. Окончательная проверка всё равно в базе.
  useEffect(() => {
    const h = handle.trim()
    if (tab === 'join' || !isPublic || !HANDLE_RE.test(h)) { setHandleState('idle'); return }
    let active = true
    setHandleState('checking')
    const t = setTimeout(() => {
      void supabase.rpc('handle_available', { p_handle: h }).then(({ data, error: err }) => {
        if (!active) return
        setHandleState(err ? 'idle' : data === true ? 'free' : 'taken')
      })
    }, 300)
    return () => { active = false; clearTimeout(t) }
  }, [handle, isPublic, tab])

  async function submit() {
    setBusy(true); setError(null)
    try {
      const id = tab === 'join'
        ? await joinByInvite(code.trim())
        : await createChat(tab, title.trim(), description.trim(), isPublic, handle.trim())
      onDone(id)
    } catch (e) {
      setError(friendly((e as Error).message))
      setBusy(false)
    }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => { setTab(t); setError(null) }}
      className={`flex-1 rounded-lg py-2 text-sm transition ${tab === t ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'}`}>{label}</button>
  )
  const handleBlocked = handleState === 'taken' || handleState === 'checking'
  const ready = tab === 'join'
    ? code.trim().length > 0
    : title.trim().length > 0 && (!isPublic || handle.trim().length > 0) && !handleBlocked

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl bg-bg2 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-medium">Новый чат</h2>
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {tabBtn('group', 'Группа')}{tabBtn('channel', 'Канал')}{tabBtn('join', 'Вступить')}
        </div>

        {tab === 'join' ? (
          <input className={field} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код приглашения" />
        ) : (
          <>
            <input className={field} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
            <textarea className={`${field} h-20 resize-none`} value={description} maxLength={300}
              onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" />
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              <button onClick={() => setIsPublic(false)}
                className={`flex-1 rounded-lg py-2 text-sm transition ${!isPublic ? 'bg-bg2' : 'text-muted'}`}>Закрытый</button>
              <button onClick={() => setIsPublic(true)}
                className={`flex-1 rounded-lg py-2 text-sm transition ${isPublic ? 'bg-bg2' : 'text-muted'}`}>Открытый</button>
            </div>
            <p className="text-xs text-muted">
              {isPublic ? 'Открытый находят в поиске и в него заходят одной кнопкой.' : 'Закрытый: вход только по коду приглашения или по добавлению админом.'}
            </p>
            {isPublic && (
              <div>
                <div className="flex items-center gap-2 rounded-xl bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
                  <span className="text-muted">@</span>
                  <input className="w-full bg-transparent py-3 text-sm outline-none" value={handle} maxLength={30}
                    onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="ссылка" />
                </div>
                {handle.trim() && !HANDLE_RE.test(handle.trim()) && (
                  <p className="mt-1 text-xs text-muted">Ссылка: 3–30 символов, только a-z, 0-9 и _.</p>
                )}
                {handleState === 'taken' && <p className="mt-1 text-xs text-pink">Этот юзернейм уже занят.</p>}
                {handleState === 'free' && <p className="mt-1 text-xs text-accent">Юзернейм свободен.</p>}
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-pink">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-muted transition hover:text-text">Отмена</button>
          <button onClick={() => void submit()} disabled={busy || !ready}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />}{tab === 'join' ? 'Вступить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
