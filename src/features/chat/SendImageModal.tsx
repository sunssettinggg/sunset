import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface Props {
  files: File[]
  initialCaption: string
  onCancel: () => void
  onSend: (files: File[], caption: string, asFile: boolean) => void
}

const MAX_FILES = 10

export default function SendImageModal({ files, initialCaption, onCancel, onSend }: Props) {
  const [list, setList] = useState<File[]>(files.slice(0, MAX_FILES))
  const [caption, setCaption] = useState(initialCaption)
  const [asFile, setAsFile] = useState(false)
  const [urls, setUrls] = useState<string[]>([])
  const addRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const u = list.map((f) => URL.createObjectURL(f))
    setUrls(u)
    return () => u.forEach((x) => URL.revokeObjectURL(x))
  }, [list])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function remove(i: number) {
    const next = list.filter((_, idx) => idx !== i)
    if (next.length === 0) onCancel()
    else setList(next)
  }

  function onAdd(e: ChangeEvent<HTMLInputElement>) {
    const more = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    setList((prev) => [...prev, ...more].slice(0, MAX_FILES))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    onSend(list, caption, asFile)
  }

  const single = list.length === 1
  const textBtn = 'rounded-lg px-3 py-2 text-sm font-medium text-accent transition hover:bg-surface'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-3xl bg-bg2 p-5">
        <h2 className="text-lg font-medium">{single ? 'Отправить изображение' : `Отправить изображения (${list.length})`}</h2>

        <div className={single ? '' : 'grid grid-cols-3 gap-2'}>
          {urls.map((u, i) => (
            <div key={u} className="relative overflow-hidden rounded-xl bg-surface">
              <img src={u} alt="" className={`w-full object-cover ${single ? 'max-h-72 object-contain' : 'h-24'}`} />
              <button type="button" title="Убрать" onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"><X size={14} /></button>
            </div>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={asFile} onChange={(e) => setAsFile(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Отправить как файл
        </label>
        {asFile && <p className="-mt-2 text-xs text-muted">Без сжатия, в оригинальном качестве, карточкой со ссылкой на скачивание.</p>}

        <div>
          <div className="mb-1 text-xs text-accent">Подпись</div>
          <input value={caption} maxLength={1000} onChange={(e) => setCaption(e.target.value)} autoFocus
            className="w-full border-b border-accent bg-transparent py-2 text-sm outline-none" />
        </div>

        <input ref={addRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onAdd} />
        <div className="flex items-center justify-between">
          <button type="button" className={textBtn} disabled={list.length >= MAX_FILES} onClick={() => addRef.current?.click()}>Добавить</button>
          <div className="flex gap-1">
            <button type="button" className={textBtn} onClick={onCancel}>Отмена</button>
            <button type="submit" className={textBtn}>Отправить</button>
          </div>
        </div>
      </form>
    </div>
  )
}
