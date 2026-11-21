import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, Loader2, Plus, Share2, Sticker as StickerIcon, X } from 'lucide-react'
import { stickerUrl } from './stickers'
import {
  MAX_ITEMS, MAX_PACKS, addItem, createPack, deletePack, errMsg, friendlyPackError, listPacks, meId, packByCode, parseCode,
  removeItem, renamePack, stickersWord, unsubscribePack, uploadStickerFile, type Pack, type PackInfo,
} from './packs'
import PackPreview from './PackPreview'

// Окно «Стикеры»: свои и добавленные наборы, создание, переименование, добавление стикеров.
export default function PackManager({ onClose }: { onClose: () => void }) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [uid, setUid] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<PackInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [title, setTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    try { setPacks(await listPacks()); setErr(null) }
    catch (e) { setErr(friendlyPackError(errMsg(e))) }
    finally { setLoaded(true) }
  }

  useEffect(() => {
    let alive = true
    void meId().then((id) => { if (alive) setUid(id) }).catch(() => undefined)
    void listPacks().then((p) => { if (alive) { setPacks(p); setLoaded(true) } })
      .catch((e) => { if (alive) { setErr(friendlyPackError(errMsg(e))); setLoaded(true) } })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey, true)
    return () => { alive = false; document.removeEventListener('keydown', onKey, true) }
  }, [onClose])

  const mine = packs.filter((p) => p.owner_id === uid)
  const added = packs.filter((p) => p.owner_id !== uid)
  const cur = packs.find((p) => p.id === sel) ?? null
  const isMine = !!cur && cur.owner_id === uid

  useEffect(() => { setTitle(cur?.title ?? ''); setConfirmDel(false); setCopied(false) }, [cur?.id, cur?.title])

  function patchPack(id: string, fn: (p: Pack) => Pack) { setPacks((prev) => prev.map((p) => (p.id === id ? fn(p) : p))) }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const t = newTitle.trim()
    if (!t || busy) return
    setBusy(true); setErr(null)
    try {
      const p = await createPack(t)
      setPacks((prev) => [...prev, p]); setSel(p.id); setCreating(false); setNewTitle('')
    } catch (e2) { setErr(friendlyPackError(errMsg(e2))) } finally { setBusy(false) }
  }

  async function onFindCode(e: FormEvent) {
    e.preventDefault()
    const c = parseCode(code)
    if (!c || busy) return
    setBusy(true); setErr(null)
    try {
      const info = await packByCode(c)
      if (!info) setErr('Набор с таким кодом не найден.')
      else { setPreview(info); setCode('') }
    } catch (e2) { setErr(friendlyPackError(errMsg(e2))) } finally { setBusy(false) }
  }

  async function saveTitle() {
    if (!cur || !isMine) return
    const t = title.trim()
    if (!t) { setTitle(cur.title); return }
    if (t === cur.title) return
    try { await renamePack(cur.id, t); patchPack(cur.id, (p) => ({ ...p, title: t })) }
    catch (e) { setErr(friendlyPackError(errMsg(e))); setTitle(cur.title) }
  }

  async function onFiles(files: FileList | null) {
    const list = Array.from(files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (!cur || list.length === 0) return
    setBusy(true); setErr(null)
    try {
      let pos = cur.items.reduce((m, i) => Math.max(m, i.position), -1) + 1
      for (const f of list) {
        const path = await uploadStickerFile(f)
        const it = await addItem(cur.id, path, pos++)
        patchPack(cur.id, (p) => ({ ...p, items: [...p.items, it] }))
      }
    } catch (e) { setErr(friendlyPackError(errMsg(e))) } finally { setBusy(false) }
  }

  async function onRemoveItem(packId: string, itemId: string) {
    const before = packs.find((p) => p.id === packId)?.items ?? []
    patchPack(packId, (p) => ({ ...p, items: p.items.filter((i) => i.id !== itemId) }))
    try { await removeItem(itemId) } catch { patchPack(packId, (p) => ({ ...p, items: before })) }
  }

  async function onDelete() {
    if (!cur) return
    if (!confirmDel) { setConfirmDel(true); return }
    try {
      if (isMine) await deletePack(cur.id); else await unsubscribePack(cur.id)
      setPacks((prev) => prev.filter((p) => p.id !== cur.id)); setSel(null)
    } catch (e) { setErr(friendlyPackError(errMsg(e))) }
  }

  async function share() {
    if (!cur) return
    try { await navigator.clipboard.writeText(cur.short_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setErr(`Код набора: ${cur.short_code}`) }
  }

  const row = (p: Pack) => (
    <button key={p.id} type="button" onClick={() => { setSel(p.id); setErr(null) }}
      className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${sel === p.id ? 'bg-surface' : 'hover:bg-surface/60'}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg p-1 text-muted">
        {p.items[0] ? <img src={stickerUrl(p.items[0].path)} alt="" className="h-full w-full object-contain" /> : <StickerIcon size={18} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{p.title}</span>
        <span className="block text-xs text-muted">{p.items.length} {stickersWord(p.items.length)}</span>
      </span>
    </button>
  )

  return createPortal(
    <div data-sticker-modal className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 md:p-6" onClick={onClose}>
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-bg2 md:h-[36rem] md:rounded-3xl md:border md:border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold">Стикеры</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-muted transition hover:bg-surface hover:text-text"><X size={18} /></button>
        </div>
        <div className="flex min-h-0 flex-1">
          <aside className={`${sel ? 'hidden md:flex' : 'flex'} min-h-0 w-full shrink-0 flex-col gap-2 border-line p-3 md:w-72 md:border-r`}>
            {creating ? (
              <form onSubmit={(e) => void onCreate(e)} className="flex shrink-0 gap-2">
                <input autoFocus value={newTitle} maxLength={40} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название набора"
                  className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted" />
                <button type="submit" disabled={!newTitle.trim() || busy} className="rounded-2xl bg-accent px-3 text-on-accent disabled:opacity-40"><Check size={18} /></button>
                <button type="button" onClick={() => { setCreating(false); setNewTitle('') }} className="rounded-2xl bg-surface px-3 text-muted hover:text-text"><X size={18} /></button>
              </form>
            ) : (
              <button type="button" disabled={mine.length >= MAX_PACKS} onClick={() => setCreating(true)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-sm font-semibold transition hover:text-accent disabled:opacity-50">
                <Plus size={16} />Новый набор
              </button>
            )}
            <form onSubmit={(e) => void onFindCode(e)} className="flex shrink-0 gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код или ссылка набора"
                className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-2 text-sm outline-none placeholder:text-muted" />
              <button type="submit" disabled={!code.trim() || busy} title="Найти набор" className="rounded-2xl bg-surface px-3 text-accent transition hover:bg-bg disabled:opacity-40">
                {busy && !creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              </button>
            </form>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!loaded && <div className="h-14 animate-pulse rounded-2xl bg-surface" />}
              {loaded && (
                <>
                  <h3 className="px-2 pb-1 pt-2 text-xs font-semibold text-muted">Мои · {mine.length} из {MAX_PACKS}</h3>
                  {mine.length === 0 && <p className="px-2 py-2 text-xs text-muted">Создайте свой первый набор.</p>}
                  {mine.map(row)}
                  {added.length > 0 && <h3 className="px-2 pb-1 pt-4 text-xs font-semibold text-muted">Добавленные</h3>}
                  {added.map(row)}
                </>
              )}
            </div>
          </aside>

          <section className={`${sel ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}>
            {!cur ? (
              <div className="m-auto px-6 text-center text-sm text-muted">
                {err ?? 'Выберите набор слева или создайте свой.'}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => setSel(null)} className="mt-1 rounded-xl p-1.5 text-muted hover:bg-surface hover:text-text md:hidden"><ArrowLeft size={18} /></button>
                    <div className="min-w-0 flex-1">
                      {isMine ? (
                        <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} onBlur={() => void saveTitle()}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                          className="w-full rounded-xl bg-transparent px-1 text-2xl font-bold outline-none transition hover:bg-surface/60 focus:bg-surface" />
                      ) : <h3 className="truncate px-1 text-2xl font-bold">{cur.title}</h3>}
                      <p className="px-1 pt-1 text-sm text-muted">
                        {cur.items.length}{isMine ? ` из ${MAX_ITEMS}` : ''} {stickersWord(cur.items.length)} · {isMine ? 'ваш набор' : `от ${cur.owner_name ?? 'пользователя'}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => void share()}
                      className="flex shrink-0 items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 text-sm font-semibold transition hover:text-accent">
                      {copied ? <Check size={16} className="text-accent" /> : <Share2 size={16} />}{copied ? 'Код скопирован' : 'Поделиться'}
                    </button>
                  </div>
                  {err && <p className="px-1 pt-3 text-xs text-pink">{err}</p>}
                  <input ref={fileRef} type="file" multiple accept="image/png,image/webp,image/gif,image/jpeg" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
                  <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-6">
                    {cur.items.map((it) => (
                      <div key={it.id} className="group relative aspect-square rounded-2xl bg-surface p-2">
                        <img src={stickerUrl(it.path)} alt="" loading="lazy" draggable={false} className="h-full w-full object-contain" />
                        {isMine && (
                          <button type="button" title="Убрать из набора" onClick={() => void onRemoveItem(cur.id, it.id)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg2/90 text-muted opacity-0 transition hover:text-pink group-hover:opacity-100 max-md:opacity-70"><X size={12} /></button>
                        )}
                      </div>
                    ))}
                    {isMine && cur.items.length < MAX_ITEMS && (
                      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-line text-muted transition hover:border-accent hover:text-accent disabled:opacity-60">
                        {busy ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
                      </button>
                    )}
                  </div>
                  {isMine && <p className="px-1 pt-4 text-xs leading-relaxed text-muted">PNG, WebP или GIF до 2 МБ. Лучше с прозрачным фоном, большие картинки уменьшаются до 512 px. Код набора можно отправить другу, он вставит его в поле «Код или ссылка набора».</p>}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
                  <span className="min-w-0 truncate text-muted">Код: <span className="select-all font-mono text-text">{cur.short_code}</span></span>
                  <button type="button" onClick={() => void onDelete()} onBlur={() => setConfirmDel(false)}
                    className="shrink-0 font-medium text-pink transition hover:opacity-80">
                    {confirmDel ? 'Точно? Нажмите ещё раз' : isMine ? 'Удалить набор' : 'Убрать из добавленных'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {preview && <PackPreview info={preview} onClose={() => setPreview(null)} onChanged={() => void reload()} />}
    </div>,
    document.body,
  )
}
