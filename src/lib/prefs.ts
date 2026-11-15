export type Theme = 'dark' | 'light'

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    return true
  } catch { return false }
}

export const loadTheme = (): Theme => (read('sunset.theme') === 'light' ? 'light' : 'dark')
export function saveTheme(theme: Theme) {
  write('sunset.theme', theme)
  document.documentElement.dataset.theme = theme
}

export const loadBackground = () => read('sunset.bg')
export const saveBackground = (value: string | null) => write('sunset.bg', value)

export function getMuted(): string[] {
  try {
    const v: unknown = JSON.parse(read('sunset.muted') ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
export const setMuted = (ids: string[]) => { write('sunset.muted', JSON.stringify(ids)) }

let audio: AudioContext | null = null
export function playBeep() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const t = audio.currentTime
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + 0.26)
  } catch { /* звук необязателен */ }
}

export async function fileToBackground(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Нужна картинка.')
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export type FlagName = 'sound' | 'online' | 'motion'
export const getFlag = (name: FlagName): boolean => read(`sunset.${name}`) !== '0'
export function setFlag(name: FlagName, value: boolean) {
  write(`sunset.${name}`, value ? '1' : '0')
  if (name === 'motion') document.documentElement.dataset.motion = value ? 'on' : 'off'
}
