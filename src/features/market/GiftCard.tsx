import { useEffect, useState, type CSSProperties } from 'react'
import GiftArt from './GiftArt'
import UniqueArt, { BACKDROPS, patternUri } from './UniqueArt'
import UniqueModal from './UniqueModal'
import { listGifts, type Gift } from './gifts'
import { KIND_TITLE, getUnique, traitOf, uniqueTitle, useMeta, type TraitKind, type UniqueGift } from './unique'

let catalogPromise: Promise<Gift[]> | null = null
const catalog = () => (catalogPromise ??= listGifts().catch((e: unknown) => { catalogPromise = null; throw e }))

const SHADOW: CSSProperties = { textShadow: '0 1px 3px rgba(0,0,0,.45)' }

interface Props { path: string; mine: boolean; sender: string; note: string | null; disabled?: boolean }

// Карточка подарка в чате: «Вы подарили подарок» с моделью, узором, фоном и кнопкой «Просмотр».
export default function GiftCard({ path, mine, sender, note, disabled }: Props) {
  const meta = useMeta()
  const [u, setU] = useState<UniqueGift | null>(null)
  const [reg, setReg] = useState<Gift | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    if (path.startsWith('u:')) {
      void getUnique(path.slice(2)).then((x) => { if (alive) { if (x) setU(x); else setFailed(true) } }).catch(() => { if (alive) setFailed(true) })
    } else if (path.startsWith('r:')) {
      void catalog().then((l) => { if (alive) setReg(l.find((g) => g.id === path.slice(2)) ?? null) }).catch(() => { if (alive) setFailed(true) })
    }
    return () => { alive = false }
  }, [path])

  const head = mine ? 'Вы подарили подарок' : `${sender || 'Вам'} дарит подарок`
  const b = u ? BACKDROPS[u.backdrop] ?? BACKDROPS.ash : null
  const bg: CSSProperties = u && b
    ? { backgroundImage: `${patternUri(u.backdrop, u.symbol)}, radial-gradient(circle at 50% 30%, ${b.center}, ${b.edge})`, backgroundSize: '56px 56px, auto' }
    : { backgroundImage: 'radial-gradient(circle at 50% 30%, #8a5cf0, #3d1f95)' }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ ...bg, ...SHADOW }}
      className="relative w-60 max-w-full overflow-hidden rounded-[1.75rem] px-5 pb-5 pt-5 text-center text-white md:w-64">
      <div className="pointer-events-none absolute -right-9 top-4 w-32 rotate-45 bg-black/25 py-0.5 text-center text-[11px] font-semibold text-white/90">подарок</div>

      <div className="mx-auto w-28">
        {u && <UniqueArt model={u.model} backdrop={u.backdrop} symbol={u.symbol} variant="model" className="" label={uniqueTitle(meta, u)} />}
        {!u && reg && <div className="overflow-hidden rounded-2xl"><GiftArt gift={reg} /></div>}
        {!u && !reg && <div className="aspect-square animate-pulse rounded-2xl bg-black/20" />}
      </div>

      <div className="mt-2 text-lg font-extrabold leading-tight">{u ? uniqueTitle(meta, u) : reg?.title ?? (failed ? 'Подарок' : '…')}</div>
      <div className="text-sm text-white/75">{head}</div>

      {u && (
        <dl className="mx-auto mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-left text-sm">
          {(['model', 'symbol', 'backdrop'] as TraitKind[]).map((k) => (
            <div key={k} className="contents">
              <dt className="text-right text-white/70">{KIND_TITLE[k]}</dt>
              <dd className="truncate font-bold">{traitOf(meta, u, k).title}</dd>
            </div>
          ))}
        </dl>
      )}
      {failed && !u && !reg && <p className="mt-2 text-xs text-white/70">Подробности недоступны: подарок мог сменить владельца.</p>}
      {note && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{note}</p>}

      {u && !disabled && (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-full bg-black/25 px-10 py-2 text-base font-bold transition hover:bg-black/35">Просмотр</button>
      )}
      {open && u && <UniqueModal id={u.id} onClose={() => setOpen(false)} />}
    </div>
  )
}
