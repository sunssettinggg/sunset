import { useState } from 'react'
import { Check } from 'lucide-react'
import { ACCENTS, loadAccent, saveAccent } from '../../lib/accent'

export default function AccentPicker() {
  const [value, setValue] = useState(loadAccent)
  return (
    <div>
      <div className="mb-2 px-1 text-xs text-muted">Цветовая схема</div>
      <div className="flex gap-2 rounded-xl bg-surface p-3">
        {ACCENTS.map((a) => (
          <button key={a.id} type="button" onClick={() => { saveAccent(a.id); setValue(a.id) }} title={a.label} aria-label={a.label}
            aria-pressed={value === a.id}
            className="flex flex-1 flex-col items-center gap-1.5 text-xs transition hover:brightness-110">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${value === a.id ? 'border-text' : 'border-transparent'}`}
              style={{ backgroundColor: a.color }}>
              {value === a.id && <Check size={16} color="#111" />}
            </span>
            <span className={value === a.id ? '' : 'text-muted'}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
