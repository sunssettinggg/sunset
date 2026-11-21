import { useEffect, useRef, useState } from 'react'
import { Clock, Loader2, Plus, Settings2, Star, X } from 'lucide-react'
import { addSticker, friendlyStickerError, getRecent, listMine, pushRecent, removeSticker, stickerUrl, type UserSticker } from './stickers'
import { errMsg, listPacks, type Pack } from './packs'
import PackManager from './PackManager'

// Вкладка «Стикеры»: недавние, избранные и наборы с нижней полосой переключения.
export default function StickerTab({ canSend, onSend }: { canSend: boolean; onSend: (path: string) => void }) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [mine, setMine] = useState<UserSticker[]>([])
  const [loaded, setLoaded] = useState(false)
  const [packsErr, setPacksErr] = useState(false)
  const [sel, setSel] = useState('')
  const [manage, setManage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [p, m] = await Promise.allSettled([listPacks(), listMine()])
    if (p.status === 'fulfilled') { setPacks(p.value); setPacksErr(false) } else setPacksErr(true)
    if (m.status === 'fulfilled') setMine(m.value.filter((s) => s.kind === 'sticker'))
    setLoaded(true)
  }

  useEffect(() => {
    let alive = true
    void Promise.allSettled([listPacks(), listMine()]).then(([p, m]) => {
      if (!alive) return
      if (p.status === 'fulfilled') setPacks(p.value); else setPacksErr(true)
      if (m.status === 'fulfilled') setMine(m.value.filter((s) => s.kind === 'sticker'))
      setLoaded(true)
    })
    return () => { alive = false }
  }, [])

  const recent = getRecent('sticker')
  const cur = sel === 'recent' || sel === 'mine' || packs.some((p) => p.id === sel) ? sel : (recent.length > 0 ? 'recent' : packs.length > 0 ? packs[0].id : 'mine')
  const pack = packs.find((p) => p.id === cur) ?? null

  function send(path: string) {
    if (!canSend) return
    pushRecent({ kind: 'sticker', path })
    onSend(path)
  }

  async function onFiles(files: FileList | null) {
    const list = Array.from(files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (list.length === 0) return
    setBusy(true); setErr(null)
    try {
      for (const f of list) {
        const a = await addSticker(f, 'sticker')
        setMine((prev) => [a, ...prev.filter((x) => x.id !== a.id)])
      }
    } catch (e) { setErr(friendlyStickerError(errMsg(e))) } finally { setBusy(false) }
  }

  async function remove(s: UserSticker) {
    setMine((prev) => prev.filter((x) => x.id !== s.id))
    try { await removeSticker(s.id) } catch { setMine((prev) => [s, ...prev]) }
  }

  const tile = (path: string, key: string, del?: UserSticker) => (
    <div key={key} className="group relative">
      <button type="button" disabled={!canSend} onClick={() => send(path)} title={canSend ? 'Отправить' : 'Нельзя писать'}
        className="block aspect-square w-full rounded-xl bg-surface/60 p-1 transition hover:bg-surface disabled:opacity-50">
        <img src={stickerUrl(path)} alt="" loading="lazy" draggable={false} className="h-full w-full object-contain" />
      </button>
      {del && (
        <button type="button" title="Удалить из избранных" onClick={() => void remove(del)}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg2/90 text-muted opacity-0 transition hover:text-pink group-hover:opacity-100 max-md:opacity-70"><X size={12} /></button>
      )}
    </div>
  )

  const barBtn = (active: boolean) =>
    `flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl transition ${active ? 'bg-surface text-accent ring-1 ring-accent' : 'text-muted hover:bg-surface hover:text-text'}`

  const heading = cur === 'recent' ? 'Недавние' : cur === 'mine' ? 'Избранные' : pack?.title ?? ''

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex items-center justify-between gap-2 pb-1 pt-3">
          <h4 className="min-w-0 truncate text-xs text-muted">{heading}</h4>
          <button type="button" onClick={() => setManage(true)}
            className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs text-muted transition hover:bg-surface hover:text-text"><Settings2 size={12} />Наборы</button>
        </div>
        {err && <p className="pb-2 text-xs text-pink">{err}</p>}
        <input ref={fileRef} type="file" multiple accept="image/png,image/webp,image/gif,image/jpeg" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        <div className="grid grid-cols-4 gap-1.5">
          {cur === 'mine' && (
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted transition hover:border-accent hover:text-accent disabled:opacity-60">
              {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}Добавить
            </button>
          )}
          {cur === 'recent' && recent.slice(0, 24).map((r) => tile(r.path, `r${r.path}`))}
          {cur === 'mine' && mine.map((s) => tile(s.path, s.id, s))}
          {pack && pack.items.map((i) => tile(i.path, i.id))}
        </div>
        {loaded && cur === 'recent' && recent.length === 0 && (
          <p className="pt-6 text-center text-xs leading-relaxed text-muted">Здесь будут недавно отправленные стикеры.</p>
        )}
        {loaded && cur === 'mine' && mine.length === 0 && (
          <p className="pt-4 text-center text-xs leading-relaxed text-muted">Добавьте PNG или WebP или нажмите «+» на стикере в чате.</p>
        )}
        {loaded && pack && pack.items.length === 0 && (
          <p className="pt-6 text-center text-xs leading-relaxed text-muted">В наборе пока пусто. Добавьте стикеры через «Наборы».</p>
        )}
        {loaded && packsErr && (
          <p className="pt-4 text-center text-xs leading-relaxed text-muted">Наборы не загрузились. Выполните SQL 0017 в Supabase.</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-line px-2 py-1.5">
        <button type="button" title="Управление наборами" onClick={() => setManage(true)} className={barBtn(false)}><Plus size={18} /></button>
        <button type="button" title="Недавние" onClick={() => setSel('recent')} className={barBtn(cur === 'recent')}><Clock size={18} /></button>
        <button type="button" title="Избранные" onClick={() => setSel('mine')} className={barBtn(cur === 'mine')}><Star size={18} /></button>
        {packs.map((p) => (
          <button key={p.id} type="button" title={p.title} onClick={() => setSel(p.id)} className={barBtn(cur === p.id)}>
            {p.items[0]
              ? <img src={stickerUrl(p.items[0].path)} alt="" className="h-full w-full object-contain p-0.5" />
              : <span className="text-sm font-semibold">{p.title.slice(0, 1).toUpperCase()}</span>}
          </button>
        ))}
      </div>
      {manage && <PackManager onClose={() => { setManage(false); void load() }} />}
    </>
  )
}
