import { useState, type CSSProperties } from 'react'
import { ArrowLeft, Check, Crown, Loader2, Palette, RotateCcw, X } from 'lucide-react'
import { readableOn } from '../../lib/color'
import { OPEN_PREMIUM_EVENT, usePremium } from '../premium/premium'
import { refreshColors, setBubbleColor, setProfileColors, useColors, type ProfileColors } from '../premium/colors'

const SWATCHES = ['#f6a23a', '#ff6b6b', '#ff7eb6', '#c084fc', '#7c8cff', '#38bdf8', '#2dd4bf', '#4ade80', '#facc15', '#fb923c']
const EMPTY: ProfileColors = { name: null, username: null, profile: null, bubble: null }

type Slot = keyof ProfileColors
const TABS: { key: Slot; label: string }[] = [
  { key: 'name', label: 'Имя' },
  { key: 'username', label: 'Юзернейм' },
  { key: 'profile', label: 'Рамка' },
  { key: 'bubble', label: 'Сообщения' },
]

interface Props { userId: string; name: string; username: string; onBack: () => void; onClose: () => void }

export default function ProfileStylePage({ userId, name, username, onBack, onClose }: Props) {
  const premium = usePremium(userId)
  const saved = useColors(userId) ?? EMPTY
  const [draft, setDraft] = useState<ProfileColors | null>(null)
  const [tab, setTab] = useState<Slot>('name')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cur = draft ?? saved
  const dirty = draft !== null && TABS.some((t) => draft[t.key] !== saved[t.key])
  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? ''

  function setSlot(slot: Slot, value: string | null) { setDraft({ ...cur, [slot]: value }) }

  async function save() {
    if (!draft) return
    setBusy(true); setError(null)
    try {
      if (draft.name !== saved.name || draft.username !== saved.username || draft.profile !== saved.profile) {
        await setProfileColors({ name: draft.name, username: draft.username, profile: draft.profile })
      }
      if (draft.bubble !== saved.bubble) await setBubbleColor(draft.bubble)
      refreshColors(userId)
      onBack()
    } catch (e) {
      const m = (e as Error).message
      setError(m.includes('premium required') ? 'Нужна активная подписка Premium.' : m)
    } finally { setBusy(false) }
  }

  const bubbleStyle = cur.bubble ? ({ '--accent': cur.bubble, '--on-accent': readableOn(cur.bubble) } as CSSProperties) : undefined

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <button type="button" onClick={onBack} title="Назад" className="rounded-lg p-1 text-muted transition hover:text-text"><ArrowLeft size={20} /></button>
        <h2 className="flex-1 text-base font-semibold">Оформление профиля</h2>
        <button type="button" onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 pb-4">
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent"><Palette size={20} /></span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Цвета профиля</div>
            <div className="text-xs text-muted">Так вас видят другие в чатах и профиле.</div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-surface px-4 py-6 text-center">
          <div className="mx-auto w-fit rounded-full bg-gradient-to-tr from-accent to-pink p-[3px]"
            style={cur.profile ? { backgroundImage: 'none', backgroundColor: cur.profile } : undefined}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg2 text-2xl font-semibold">{(name.trim()[0] ?? '?').toUpperCase()}</div>
          </div>
          <div>
            <div className="truncate text-xl font-bold" style={cur.name ? { color: cur.name } : undefined}>{name || 'Имя'}</div>
            <div className="truncate text-sm text-muted" style={cur.username ? { color: cur.username } : undefined}>@{username}</div>
          </div>
          <div className="flex justify-end">
            <div style={bubbleStyle} className="rounded-2xl rounded-br-md bg-accent px-4 py-2 text-sm text-on-accent">Так выглядят ваши сообщения</div>
          </div>
        </div>

        {premium ? (
          <>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
                  className={`rounded-lg py-2 text-xs transition ${tab === t.key ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'}`}>{t.label}</button>
              ))}
            </div>

            <section className="space-y-2">
              <div className="px-1 text-xs font-medium text-muted">Цвет: {tabLabel.toLowerCase()}</div>
              <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-1.5 rounded-2xl bg-surface p-3">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" onClick={() => setSlot(tab, c)} title={c} aria-label={`${tabLabel} ${c}`}
                    className={`flex aspect-square items-center justify-center rounded-full transition hover:scale-110 ${
                      cur[tab] === c ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
                    style={{ backgroundColor: c }}>
                    {cur[tab] === c && <Check size={12} color="#111" strokeWidth={3} />}
                  </button>
                ))}
                <label className="relative aspect-square cursor-pointer overflow-hidden rounded-full" title="Свой цвет">
                  <input type="color" value={cur[tab] ?? '#f6a23a'} onChange={(e) => setSlot(tab, e.target.value.toLowerCase())}
                    className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0" />
                  <span className="block h-full w-full" style={{ background: 'conic-gradient(#ff6b6b, #facc15, #4ade80, #38bdf8, #c084fc, #ff6b6b)' }} />
                </label>
              </div>
            </section>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Crown size={20} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Доступно с Premium</div>
              <div className="text-xs text-muted">Цвета имени, юзернейма, рамки и сообщений</div>
            </div>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREMIUM_EVENT))}
              className="sunset-gradient rounded-full px-3.5 py-1.5 text-xs font-semibold text-on-accent transition hover:brightness-110">Подробнее</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        {error && <p className="mr-auto text-xs text-pink">{error}</p>}
        <button type="button" disabled={!premium || busy || cur[tab] === null} onClick={() => setSlot(tab, null)}
          className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm transition hover:brightness-125 disabled:opacity-40">
          <RotateCcw size={14} />Сбросить
        </button>
        <button type="button" disabled={!premium || busy || !dirty} onClick={() => void save()}
          className="sunset-gradient flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-40">
          {busy && <Loader2 size={14} className="animate-spin" />}Сохранить
        </button>
      </div>
    </>
  )
}
