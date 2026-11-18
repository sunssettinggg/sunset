import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X } from 'lucide-react'
import { OPEN_PREMIUM_EVENT, usePremium } from '../premium/premium'
import { WALLPAPERS, clearWallpaper, setWallpaper, wallpaperCss } from './wallpapers'

interface Props { chatId: string; myId: string; onClose: () => void }

export default function WallpaperModal({ chatId, myId, onClose }: Props) {
  const premium = usePremium(myId)
  const [value, setValue] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true); setError(null); setDone(null)
    try { await fn(); setDone(ok) }
    catch (e) {
      const m = (e as Error).message
      setError(m.includes('premium required') ? 'Нужна активная подписка Premium.' : m)
    } finally { setBusy(false) }
  }

  const btn = 'rounded-xl bg-surface px-3 py-2 text-sm transition hover:brightness-125 disabled:opacity-40'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-bg2 p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Обои чата</h2>
          <button type="button" onClick={onClose} title="Закрыть" className="rounded-lg p-1 text-muted transition hover:text-text"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {WALLPAPERS.map((w) => (
            <button key={w.id} type="button" onClick={() => setValue(`g:${w.id}`)} aria-pressed={value === `g:${w.id}`}
              className={`flex h-20 items-end rounded-xl border-2 p-1.5 text-left text-xs text-white transition hover:brightness-110 ${value === `g:${w.id}` ? 'border-text' : 'border-transparent'}`}
              style={{ background: w.css }}>{w.label}</button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
          <span>Свой цвет</span>
          <input type="color" value={value?.startsWith('c:') ? value.slice(2) : '#2a2a3a'}
            onChange={(e) => setValue(`c:${e.target.value.toLowerCase()}`)} className="h-7 w-10 cursor-pointer rounded bg-transparent" />
        </label>

        {value && (
          <div className="h-14 rounded-xl" style={{ background: wallpaperCss(value) ?? undefined }} aria-label="Предпросмотр" />
        )}

        {premium ? (
          <div className="grid grid-cols-2 gap-2">
            <button className={btn} disabled={busy || !value} onClick={() => void run(() => setWallpaper(chatId, value as string, false), 'Обои установлены для вас.')}>Для меня</button>
            <button className={btn} disabled={busy || !value} onClick={() => void run(() => setWallpaper(chatId, value as string, true), 'Обои установлены для вас и собеседника.')}>Для обоих</button>
          </div>
        ) : (
          <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(OPEN_PREMIUM_EVENT)) }}
            className="flex w-full items-center gap-3 text-left text-sm text-muted transition hover:text-text">
            <Lock size={16} className="shrink-0" /><span>Устанавливать обои может подписчик Premium.</span>
          </button>
        )}
        <button className={`${btn} w-full text-muted`} disabled={busy} onClick={() => void run(() => clearWallpaper(chatId), 'Обои убраны.')}>Убрать мои обои</button>

        {done && <p className="text-xs text-accent">{done}</p>}
        {error && <p className="text-xs text-pink">{error}</p>}
      </div>
    </div>,
    document.body,
  )
}
