import { useCallback, useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import UniqueArt from './UniqueArt'
import UniqueModal from './UniqueModal'
import { myUnique, uniqueForSale, uniqueTitle, useMeta, type UniqueGift } from './unique'

export function UniqueCard({ g, onOpen }: { g: UniqueGift; onOpen: (id: string) => void }) {
  const meta = useMeta()
  return (
    <button type="button" onClick={() => onOpen(g.id)} className="flex flex-col gap-2 rounded-2xl bg-surface p-2 text-left transition hover:brightness-110">
      <UniqueArt model={g.model} backdrop={g.backdrop} symbol={g.symbol} className="rounded-xl" label={uniqueTitle(meta, g)} />
      <div className="px-1 pb-1">
        <div className="truncate text-sm font-medium">{uniqueTitle(meta, g)}</div>
        <div className="flex items-center gap-2 text-xs text-muted">
          {g.price !== null && <span className="flex items-center gap-0.5 text-accent"><Star size={11} fill="currentColor" />{g.price.toLocaleString('ru-RU')}</span>}
          {g.shown && g.price === null && <span>в профиле</span>}
        </div>
      </div>
    </button>
  )
}

// Мои уникальные подарки (Маркет → Мои → Подарки).
export function UniqueMine({ meId, reloadKey, onChanged }: { meId: string; reloadKey: string; onChanged: () => void }) {
  const [list, setList] = useState<UniqueGift[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => { void myUnique(meId).then(setList).catch(() => undefined) }, [meId])
  useEffect(() => { load() }, [load, reloadKey])
  useEffect(() => {
    const on = (e: Event) => { load(); setOpen(String((e as CustomEvent).detail)) }
    window.addEventListener('sunset:unique-open', on)
    return () => window.removeEventListener('sunset:unique-open', on)
  }, [load])

  return (
    <>
      {list.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">Уникальные подарки · {list.length}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{list.map((g) => <UniqueCard key={g.id} g={g} onOpen={setOpen} />)}</div>
        </div>
      )}
      {open && <UniqueModal id={open} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged() }} />}
    </>
  )
}

// Уникальные подарки на продаже (Маркет → Подарки).
export function UniqueShop({ reloadKey, onChanged }: { reloadKey: string; onChanged: () => void }) {
  const [list, setList] = useState<UniqueGift[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(() => { void uniqueForSale().then(setList).catch(() => undefined) }, [])
  useEffect(() => { load() }, [load, reloadKey])
  if (list.length === 0 && !open) return null
  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted">Уникальные подарки на продаже · {list.length}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{list.map((g) => <UniqueCard key={g.id} g={g} onOpen={setOpen} />)}</div>
      </div>
      {open && <UniqueModal id={open} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged() }} />}
    </>
  )
}
