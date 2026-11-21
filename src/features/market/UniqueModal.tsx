import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, EyeOff, Loader2, Star, Tag, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getStars } from '../chat/api'
import UniqueArt from './UniqueArt'
import {
  KIND_TITLE, buyUnique, friendlyUnique, getUnique, listUnique, setUniqueShown, traitOf, uniqueHistory, uniqueTitle, useMeta,
  type HistoryRow, type TraitKind, type UniqueGift,
} from './unique'

interface Props { id: string; initial?: UniqueGift; onClose: () => void; onChanged?: () => void }

const fmt = (n: number) => n.toLocaleString('ru-RU')

// Карточка уникального подарка: картинка, редкость и атрибуты, цена, история.
export default function UniqueModal({ id, initial, onClose, onChanged }: Props) {
  const meta = useMeta()
  const [g, setG] = useState<UniqueGift | null>(initial ?? null)
  const [me, setMe] = useState('')
  const [stars, setStars] = useState(0)
  const [names, setNames] = useState<Record<string, string>>({})
  const [hist, setHist] = useState<HistoryRow[]>([])
  const [tab, setTab] = useState<'details' | 'history'>('details')
  const [priceIn, setPriceIn] = useState('')
  const [selling, setSelling] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [u, h, s, sess] = await Promise.all([getUnique(id), uniqueHistory(id), getStars().catch(() => 0), supabase.auth.getSession()])
      setMe(sess.data.session?.user.id ?? '')
      setStars(s)
      if (!u) { setMissing(true); return }
      setG(u); setHist(h)
      const ids = [...new Set([u.owner_id, ...h.flatMap((r) => [r.from_id, r.to_id]).filter((x): x is string => !!x)])]
      const { data } = await supabase.from('profiles').select('id, display_name').in('id', ids)
      const map: Record<string, string> = {}
      for (const p of (data ?? []) as { id: string; display_name: string }[]) map[p.id] = p.display_name
      setNames(map)
    } catch (e) { setErr(friendlyUnique(e instanceof Error ? e.message : String(e))) }
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function act(fn: () => Promise<void>) {
    setBusy(true); setErr(null)
    try { await fn(); await load(); onChanged?.() }
    catch (e) { setErr(friendlyUnique(e instanceof Error ? e.message : (e as { message?: string }).message ?? String(e))) }
    finally { setBusy(false) }
  }

  const mine = !!g && g.owner_id === me
  const title = g ? uniqueTitle(meta, g) : ''
  const nm = (uid: string | null) => (uid ? names[uid] ?? '…' : '—')

  const attr = (g2: UniqueGift, kind: TraitKind) => {
    const t = traitOf(meta, g2, kind)
    const p = t.percent
    const tier = p === null ? '#5b6270' : p < 1 ? '#f5a524' : p < 3 ? '#9b51e0' : p < 10 ? '#0a6cff' : '#5b6270'
    return (
      <div key={kind} className="rounded-2xl border border-line px-4 py-3">
        <div className="text-xs font-medium text-accent">{KIND_TITLE[kind]}</div>
        <div className="mt-0.5 truncate font-semibold">{t.title}</div>
        {p !== null && <span className="mt-1.5 inline-block rounded-lg px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: tier }}>{p}%</span>}
      </div>
    )
  }

  return createPortal(
    <div data-sticker-modal className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-0 md:p-6" onClick={onClose}>
      <div className="relative max-h-full w-full max-w-4xl overflow-y-auto bg-bg2 md:rounded-3xl md:border md:border-line" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-bg2/80 p-1.5 text-muted transition hover:text-text"><X size={18} /></button>
        {missing && <p className="p-10 text-center text-sm text-muted">Подарок не найден или скрыт владельцем.</p>}
        {!missing && !g && <div className="p-10 text-center text-sm text-muted">{err ?? 'Загрузка…'}</div>}
        {g && (
          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            <div className="md:sticky md:top-0 md:self-start">
              <UniqueArt model={g.model} backdrop={g.backdrop} symbol={g.symbol} className="rounded-3xl" label={title} />
            </div>
            <div className="min-w-0 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <h2 className="text-2xl font-bold">{title}</h2>
                  {g.price !== null
                    ? <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">На продаже</span>
                    : <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">Не продаётся</span>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {meta?.collections.get(g.collection_id)?.title ?? 'Коллекция'} · владелец {nm(g.owner_id)}
                </p>
              </div>

              {g.price !== null && (
                <div>
                  <div className="text-xs text-muted">Цена</div>
                  <div className="flex items-center gap-1.5 text-2xl font-bold"><Star size={20} className="text-accent" fill="currentColor" />{fmt(g.price)}</div>
                </div>
              )}

              {!mine && g.price !== null && (
                stars < g.price
                  ? <button type="button" disabled className="w-full rounded-2xl bg-surface py-3 text-sm font-semibold text-muted">Не хватает Звёзд</button>
                  : <button type="button" disabled={busy} onClick={() => void act(() => buyUnique(g.id))}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-60">
                      {busy && <Loader2 size={14} className="animate-spin" />}Купить за {fmt(g.price)}
                    </button>
              )}

              {mine && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void act(() => setUniqueShown(g.id, !g.shown))}
                      className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-sm transition hover:text-accent disabled:opacity-60">
                      {g.shown ? <><EyeOff size={15} />Скрыть из профиля</> : <><Eye size={15} />Показать в профиле</>}
                    </button>
                    {g.price !== null ? (
                      <button type="button" disabled={busy} onClick={() => void act(() => listUnique(g.id, null))}
                        className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-sm transition hover:text-accent disabled:opacity-60"><Tag size={15} />Снять с продажи</button>
                    ) : (
                      <button type="button" onClick={() => setSelling((v) => !v)}
                        className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-sm transition hover:text-accent"><Tag size={15} />Продать</button>
                    )}
                  </div>
                  {selling && g.price === null && (
                    <div className="flex gap-2">
                      <input value={priceIn} inputMode="numeric" placeholder="Цена в Звёздах"
                        onChange={(e) => setPriceIn(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-2 focus:ring-accent" />
                      <button type="button" disabled={busy || !priceIn || Number(priceIn) < 1}
                        onClick={() => void act(async () => { await listUnique(g.id, Number(priceIn)); setSelling(false); setPriceIn('') })}
                        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50">Выставить</button>
                    </div>
                  )}
                  <p className="text-xs text-muted">Подарить другу можно из окна информации о чате, кнопка «Подарок».</p>
                </div>
              )}
              {err && <p className="text-sm text-pink">{err}</p>}

              <div className="flex gap-1 border-b border-line">
                {(['details', 'history'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === t ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>
                    {t === 'details' ? 'Детали' : 'История'}
                  </button>
                ))}
              </div>

              {tab === 'details' ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-semibold">Редкость и атрибуты</h3>
                    <div className="grid grid-cols-2 gap-2">{(['model', 'backdrop', 'symbol'] as TraitKind[]).map((k) => attr(g, k))}</div>
                    <p className="mt-2 text-xs text-muted">Процент показывает, как часто такой признак выпадает: чем меньше, тем реже.</p>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">Описание</h3>
                    <p className="text-sm text-muted">
                      Уникальные {meta?.collections.get(g.collection_id)?.title.toLowerCase() ?? 'предметы'}: модель «{traitOf(meta, g, 'model').title}»,
                      фон «{traitOf(meta, g, 'backdrop').title}», узор «{traitOf(meta, g, 'symbol').title}».
                      Номер {g.number} из {fmt(meta?.collections.get(g.collection_id)?.supply ?? 0)}.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {hist.length === 0 && <li className="text-muted">Событий пока нет.</li>}
                  {hist.map((h) => (
                    <li key={h.id} className="flex items-start justify-between gap-3 rounded-2xl bg-surface px-3 py-2">
                      <span className="min-w-0">
                        {h.kind === 'mint' && <>Улучшен до уникального · {nm(h.to_id)}</>}
                        {h.kind === 'send' && <>Подарок: {nm(h.from_id)} → {nm(h.to_id)}</>}
                        {h.kind === 'sale' && <>Продажа: {nm(h.from_id)} → {nm(h.to_id)}{h.price ? ` · ${fmt(h.price)} ★` : ''}</>}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{new Date(h.at).toLocaleDateString('ru-RU')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
