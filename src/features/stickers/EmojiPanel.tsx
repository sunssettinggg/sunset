import { useEffect, useRef, useState } from 'react'
import { Clock, Loader2, Plus, Smile, Sticker, X, Film } from 'lucide-react'
import StickerTab from './StickerTab'
import { EMOJI_GROUPS, getRecentEmoji, pushRecentEmoji } from './emoji'
import {
  addSticker, friendlyStickerError, getRecent, listMine, pushRecent, removeSticker, stickerUrl,
  type StickerKind, type UserSticker,
} from './stickers'

type Tab = 'emoji' | 'sticker' | 'gif'

interface Props {
  canSend: boolean
  onEmoji: (e: string) => void
  onSend: (kind: StickerKind, path: string) => void
  onClose: () => void
}

const TABS: { id: Tab; title: string; Icon: typeof Smile }[] = [
  { id: 'emoji', title: 'Эмодзи', Icon: Smile },
  { id: 'sticker', title: 'Стикеры', Icon: Sticker },
  { id: 'gif', title: 'GIF', Icon: Film },
]

export default function EmojiPanel({ canSend, onEmoji, onSend, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('emoji')
  const [recentEmoji, setRecentEmoji] = useState<string[]>(() => getRecentEmoji())
  const [mine, setMine] = useState<UserSticker[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    void listMine().then((l) => { if (alive) { setMine(l); setLoaded(true) } })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null
      if (!t || rootRef.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-emoji-toggle], [data-sticker-modal]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function pickEmoji(e: string) {
    setRecentEmoji(pushRecentEmoji(e))
    onEmoji(e)
  }

  function send(kind: StickerKind, path: string) {
    if (!canSend) return
    pushRecent({ kind, path })
    onSend(kind, path)
  }

  async function onFiles(files: FileList | null, kind: StickerKind) {
    const list = Array.from(files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (list.length === 0) return
    setBusy(true); setErr(null)
    try {
      for (const f of list) {
        const added = await addSticker(f, kind)
        setMine((prev) => [added, ...prev.filter((x) => x.id !== added.id)])
      }
    } catch (e) {
      setErr(friendlyStickerError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Не удалось загрузить'))
    } finally { setBusy(false) }
  }

  async function remove(s: UserSticker) {
    setMine((prev) => prev.filter((x) => x.id !== s.id))
    try { await removeSticker(s.id) } catch { setMine((prev) => [s, ...prev]) }
  }

  function jump(id: string) {
    const el = scrollRef.current?.querySelector(`[data-group="${id}"]`)
    if (el instanceof HTMLElement && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' })
  }

  const kind: StickerKind = 'gif'
  const items = mine.filter((s) => s.kind === kind)
  const recent = tab === 'emoji' ? [] : getRecent(kind)

  const tile = (s: { path: string }, key: string, id?: UserSticker) => (
    <div key={key} className="group relative">
      <button type="button" disabled={!canSend} onClick={() => send(kind, s.path)} title={canSend ? 'Отправить' : 'Нельзя писать'}
        className={`block w-full overflow-hidden rounded-xl bg-surface/60 transition hover:bg-surface disabled:opacity-50 ${kind === 'gif' ? 'aspect-[4/3]' : 'aspect-square p-1'}`}>
        <img src={stickerUrl(s.path)} alt="" loading="lazy" draggable={false}
          className={`h-full w-full ${kind === 'gif' ? 'object-cover' : 'object-contain'}`} />
      </button>
      {id && (
        <button type="button" title="Удалить из моих" onClick={() => void remove(id)}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg2/90 text-muted opacity-0 transition hover:text-pink group-hover:opacity-100 max-md:opacity-70">
          <X size={12} />
        </button>
      )}
    </div>
  )

  return (
    <div ref={rootRef}
      className="absolute bottom-full left-3 right-3 z-30 mb-2 flex h-[22rem] max-h-[55vh] flex-col overflow-hidden rounded-3xl border border-line bg-bg2 shadow-2xl md:right-auto md:w-[24rem]">
      <div className="flex shrink-0 gap-1 border-b border-line p-2">
        {TABS.map(({ id, title, Icon }) => (
          <button key={id} type="button" onClick={() => { setTab(id); setErr(null) }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-medium transition ${
              tab === id ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface hover:text-text'}`}>
            <Icon size={16} />{title}
          </button>
        ))}
      </div>

      {tab === 'emoji' ? (
        <>
          <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-2">
            {recentEmoji.length > 0 && (
              <section data-group="recent">
                <h4 className="flex items-center gap-1 pb-1 pt-3 text-xs text-muted"><Clock size={12} />Недавние</h4>
                <div className="grid grid-cols-8 gap-0.5">
                  {recentEmoji.map((e) => <EmojiBtn key={`r${e}`} e={e} onPick={pickEmoji} />)}
                </div>
              </section>
            )}
            {EMOJI_GROUPS.map((g) => (
              <section key={g.id} data-group={g.id}>
                <h4 className="pb-1 pt-3 text-xs text-muted">{g.title}</h4>
                <div className="grid grid-cols-8 gap-0.5">
                  {g.items.map((e) => <EmojiBtn key={e} e={e} onPick={pickEmoji} />)}
                </div>
              </section>
            ))}
          </div>
          <div className="flex shrink-0 justify-between gap-1 border-t border-line px-2 py-1.5">
            {EMOJI_GROUPS.map((g) => (
              <button key={g.id} type="button" title={g.title} onClick={() => jump(g.id)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-lg opacity-70 transition hover:bg-surface hover:opacity-100">
                {g.items[0]}
              </button>
            ))}
          </div>
        </>
      ) : tab === 'sticker' ? (
        <StickerTab canSend={canSend} onSend={(p) => onSend('sticker', p)} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <input ref={fileRef} type="file" multiple className="hidden"
            accept={tab === 'gif' ? 'image/gif' : 'image/png,image/webp,image/gif,image/jpeg'}
            onChange={(e) => void onFiles(e.target.files, kind)} />
          {err && <p className="pt-3 text-xs text-pink">{err}</p>}
          {recent.length > 0 && (
            <section>
              <h4 className="flex items-center gap-1 pb-1 pt-3 text-xs text-muted"><Clock size={12} />Недавние</h4>
              <div className={`grid gap-1.5 ${kind === 'gif' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {recent.slice(0, kind === 'gif' ? 6 : 8).map((r) => tile(r, `r${r.path}`))}
              </div>
            </section>
          )}
          <h4 className="pb-1 pt-3 text-xs text-muted">{kind === 'gif' ? 'Мои GIF' : 'Мои стикеры'}</h4>
          <div className={`grid gap-1.5 ${kind === 'gif' ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted transition hover:border-accent hover:text-accent disabled:opacity-60 ${kind === 'gif' ? 'aspect-[4/3]' : 'aspect-square'}`}>
              {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              Добавить
            </button>
            {items.map((s) => tile(s, s.id, s))}
          </div>
          {loaded && items.length === 0 && (
            <p className="pt-4 text-center text-xs leading-relaxed text-muted">
              {kind === 'gif'
                ? 'Загрузите GIF или нажмите «+» на гифке в чате, чтобы сохранить её сюда.'
                : 'Добавьте PNG или WebP с прозрачным фоном или нажмите «+» на стикере в чате.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EmojiBtn({ e, onPick }: { e: string; onPick: (e: string) => void }) {
  return (
    <button type="button" onClick={() => onPick(e)}
      className="flex h-9 items-center justify-center rounded-xl text-2xl transition hover:bg-surface">{e}</button>
  )
}
