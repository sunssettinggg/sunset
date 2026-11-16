import { useState } from 'react'
import { Lock } from 'lucide-react'
import type { ProfileChannel } from '../../lib/types'
import { plural } from '../../lib/format'
import Avatar from './Avatar'

interface Props { card: ProfileChannel; onOpen: (c: ProfileChannel) => Promise<void> }

export default function ChannelCard({ card, onOpen }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function click() {
    if (!card.joined && !card.is_public) { setNote('Закрытый канал: вход только по приглашению.'); return }
    setBusy(true); setNote(null)
    try { await onOpen(card) } catch (e) { setNote((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={() => void click()} disabled={busy}
        className="flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left transition hover:brightness-110 disabled:opacity-60">
        <Avatar name={card.title} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-medium">
            {!card.is_public && <Lock size={12} className="shrink-0 text-muted" />}
            <span className="truncate">{card.title}</span>
          </div>
          <div className="text-xs text-muted">Канал • {plural(card.members, ['подписчик', 'подписчика', 'подписчиков'])}</div>
        </div>
      </button>
      {note && <p className="mt-1 px-1 text-xs text-muted">{note}</p>}
    </div>
  )
}
