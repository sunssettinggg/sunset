export const ACCENTS = [
  { id: 'sunset', label: 'Закат', color: '#f29abf' },
  { id: 'ocean', label: 'Океан', color: '#5cb8f2' },
  { id: 'forest', label: 'Лес', color: '#6fd08c' },
  { id: 'violet', label: 'Фиалка', color: '#b79cff' },
  { id: 'amber', label: 'Янтарь', color: '#f6b94a' },
] as const

const KEY = 'sunset.accent'

export function loadAccent(): string {
  try {
    const v = localStorage.getItem(KEY)
    return ACCENTS.some((a) => a.id === v) ? (v as string) : 'sunset'
  } catch { return 'sunset' }
}

export function applyAccent(id: string) {
  if (id === 'sunset') delete document.documentElement.dataset.accent
  else document.documentElement.dataset.accent = id
}

export function saveAccent(id: string) {
  try { localStorage.setItem(KEY, id) } catch { /* необязательно */ }
  applyAccent(id)
}
