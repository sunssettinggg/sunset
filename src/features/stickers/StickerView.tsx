import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { friendlyStickerError, saveFromMessage, stickerUrl, type StickerKind } from './stickers'

// Стикер или GIF внутри сообщения. Кнопка «+» добавляет его в свою коллекцию.
export default function StickerView({ path, kind, disabled }: { path: string; kind: StickerKind; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle')

  async function save() {
    if (state === 'busy' || state === 'done') return
    setState('busy')
    try { await saveFromMessage(path, kind); setState('done') }
    catch (e) { console.warn(friendlyStickerError(e instanceof Error ? e.message : String(e))); setState('err') }
  }

  return (
    <div className="group relative inline-block">
      <img src={stickerUrl(path)} alt={kind === 'gif' ? 'GIF' : 'Стикер'} loading="lazy" draggable={false}
        className={kind === 'gif'
          ? 'block max-h-64 max-w-[16rem] rounded-xl object-cover'
          : 'block h-40 w-40 object-contain md:h-44 md:w-44'} />
      {!disabled && (
        <button type="button" title={state === 'done' ? 'Добавлено' : state === 'err' ? 'Не удалось добавить' : 'Добавить в мои'}
          onClick={(e) => { e.stopPropagation(); void save() }}
          className={`absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg2/90 text-text shadow transition hover:text-accent ${
            state === 'idle' || state === 'err' ? 'opacity-0 group-hover:opacity-100 max-md:opacity-70' : 'opacity-100'}`}>
          {state === 'done' ? <Check size={14} className="text-accent" /> : <Plus size={14} className={state === 'busy' ? 'animate-pulse' : ''} />}
        </button>
      )}
    </div>
  )
}
