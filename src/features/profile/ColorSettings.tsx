import { useState } from 'react'
import { Lock } from 'lucide-react'
import { OPEN_PREMIUM_EVENT, usePremium } from '../premium/premium'
import { refreshColors, setProfileColors, useColors, type ProfileColors } from '../premium/colors'

const SWATCHES = ['#f6a23a', '#ff6b6b', '#ff7eb6', '#c084fc', '#7c8cff', '#38bdf8', '#2dd4bf', '#4ade80', '#facc15', '#fb923c']

type Slot = keyof ProfileColors
const SLOTS: { key: Slot; label: string }[] = [
  { key: 'name', label: 'Цвет имени' },
  { key: 'username', label: 'Цвет юзернейма' },
  { key: 'profile', label: 'Цвет профиля' },
]

export default function ColorSettings({ userId }: { userId: string }) {
  const premium = usePremium(userId)
  const current = useColors(userId) ?? { name: null, username: null, profile: null }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(slot: Slot, value: string | null) {
    setBusy(true); setError(null)
    try {
      await setProfileColors({ ...current, [slot]: value })
      refreshColors(userId)
    } catch (e) {
      const m = (e as Error).message
      setError(m.includes('premium required') ? 'Нужна активная подписка Premium.' : m)
    } finally { setBusy(false) }
  }

  if (!premium) {
    return (
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREMIUM_EVENT))}
        className="flex w-full items-center gap-3 text-left text-sm text-muted transition hover:text-text">
        <Lock size={16} className="shrink-0" />
        <span>Цвета имени, юзернейма и профиля доступны с Premium.</span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {SLOTS.map(({ key, label }) => (
        <div key={key}>
          <div className="mb-1.5 text-xs text-muted">{label}</div>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" disabled={busy} onClick={() => void pick(key, c)} title={c} aria-label={`${label} ${c}`}
                className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 disabled:opacity-50 ${current[key] === c ? 'border-text' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
            <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-line" title="Свой цвет">
              <input type="color" disabled={busy} value={current[key] ?? '#f6a23a'}
                onChange={(e) => void pick(key, e.target.value.toLowerCase())}
                className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0" />
              <span className="block h-full w-full" style={{ background: 'conic-gradient(#ff6b6b, #facc15, #4ade80, #38bdf8, #c084fc, #ff6b6b)' }} />
            </label>
            {current[key] && (
              <button type="button" disabled={busy} onClick={() => void pick(key, null)}
                className="rounded-full px-2 py-1 text-xs text-muted transition hover:text-text">Сбросить</button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-pink">{error}</p>}
    </div>
  )
}
