import { useId, type ReactNode } from 'react'

export interface Backdrop { center: string; edge: string; pattern: string }

// Фоны и узоры. Ключи совпадают с unique_traits в базе.
export const BACKDROPS: Record<string, Backdrop> = {
  ash: { center: '#8d8d84', edge: '#6b6b63', pattern: '#4f4f48' },
  moss: { center: '#80a566', edge: '#4d6d3c', pattern: '#35502a' },
  sand: { center: '#ecd49f', edge: '#c39b5c', pattern: '#f8ead0' },
  ocean: { center: '#58bbd9', edge: '#1f6e98', pattern: '#a6e6f7' },
  rose: { center: '#f2a8bd', edge: '#c9587f', pattern: '#fbd7e2' },
  plum: { center: '#a671d4', edge: '#5a2f8b', pattern: '#d7b4f2' },
  sunset: { center: '#ffa46f', edge: '#d4557b', pattern: '#ffd8b0' },
  midnight: { center: '#30357a', edge: '#12153a', pattern: '#4c52a8' },
  cyber: { center: '#8f86ec', edge: '#8a58d3', pattern: '#6a52c0' },
  steel: { center: '#a3b6cb', edge: '#5b6f86', pattern: '#d6e1ec' },
  jade: { center: '#62d3a8', edge: '#1f8a6a', pattern: '#b9f1dc' },
  ember: { center: '#ff8d5e', edge: '#c4351f', pattern: '#ffc9aa' },
  wine: { center: '#ab3752', edge: '#4a0f23', pattern: '#e48ba2' },
}

export const SYMBOLS: Record<string, string> = {
  star: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  heart: 'M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z',
  diamond: 'M12 2 21 12 12 22 3 12z',
  leaf: 'M12 22C6 18 4 12 5 4c7 0 12 4 12 11 0 3-2 5-5 7z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  cap: 'M4 14a8 8 0 0 1 16 0zM2 16h14c3 0 5 1 6 3H2z',
  flame: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 2 2 2 4 1-3 1-6 1-9z',
  crown: 'M2 8l5 4 5-8 5 8 5-4-2 12H4z',
  ring: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  drop: 'M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z',
}

const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6
  const long = i % 3 === 0
  const r1 = long ? 31 : 34
  return { x1: 100 + r1 * Math.sin(a), y1: 100 - r1 * Math.cos(a), x2: 100 + 38 * Math.sin(a), y2: 100 - 38 * Math.cos(a), long }
})

function Straps({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <>
      <rect x="80" y="10" width="40" height="58" rx="9" fill={fill} stroke={stroke} strokeWidth="3" />
      <rect x="80" y="132" width="40" height="58" rx="9" fill={fill} stroke={stroke} strokeWidth="3" />
    </>
  )
}

const CIGARS: Record<string, { a: string; b: string; band: string; star: string }> = {
  ruby: { a: '#e0392b', b: '#7a120d', band: '#f4efe6', star: '#c8281e' },
  havana: { a: '#b27a43', b: '#5e3a1a', band: '#e8c46a', star: '#7a4a14' },
  maduro: { a: '#5a3a28', b: '#24130b', band: '#c9c9d0', star: '#24130b' },
  emerald: { a: '#2f9a63', b: '#0d4a2c', band: '#f6e3a1', star: '#0d4a2c' },
}

function Cigar({ k, uid }: { k: string; uid: string }): ReactNode {
  const c = CIGARS[k]
  if (!c) return null
  return (
    <g transform="rotate(-12 100 100)">
      <defs>
        <linearGradient id={`cg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.a} /><stop offset=".55" stopColor={c.b} /><stop offset="1" stopColor={c.b} />
        </linearGradient>
        <radialGradient id={`em${uid}`} cx=".5" cy=".5" r=".6">
          <stop offset="0" stopColor="#fff3a0" /><stop offset=".6" stopColor="#ffc21f" /><stop offset="1" stopColor="#ff7a1a" />
        </radialGradient>
      </defs>
      <path d="M50 66c-6-12 10-22 2-38" fill="none" stroke="#ffd0dc" strokeWidth="5" strokeLinecap="round" opacity=".7" style={{ filter: 'drop-shadow(0 0 4px #ffb3c8)' }} />
      <rect x="48" y="82" width="104" height="36" rx="17" fill={`url(#cg${uid})`} />
      <rect x="64" y="86" width="82" height="5" rx="2.5" fill="#fff" opacity=".22" />
      <rect x="102" y="82" width="16" height="36" fill={c.band} />
      <circle cx="110" cy="100" r="6.5" fill={c.star} />
      <path transform="translate(104.5 94.5) scale(.46)" d={SYMBOLS.star} fill="#fff" />
      <ellipse cx="54" cy="100" rx="9" ry="18" fill={`url(#em${uid})`} style={{ filter: 'drop-shadow(0 0 5px #ffb020)' }} />
      <ellipse cx="54" cy="100" rx="9" ry="18" fill="none" stroke="#e8d9c0" strokeWidth="2" opacity=".7" />
    </g>
  )
}

function Model({ k, uid }: { k: string; uid: string }): ReactNode {
  if (k in CIGARS) return <Cigar k={k} uid={uid} />
  if (k === 'pixel') {
    return (
      <g>
        <Straps fill="#40586a" stroke="#22343f" />
        <rect x="153" y="93" width="9" height="14" rx="3" fill="#6e645e" />
        <circle cx="100" cy="100" r="55" fill="#908580" stroke="#4b423d" strokeWidth="4" />
        <circle cx="100" cy="100" r="45" fill="#6f6560" />
        <circle cx="100" cy="100" r="39" fill="#0f7a37" stroke="#86efa8" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" fontFamily="ui-monospace, Menlo, Consolas, monospace" fontWeight="700" fontSize="23"
          fill="#92ffb3" style={{ filter: 'drop-shadow(0 0 3px #4dff8a)' }}>12:50</text>
      </g>
    )
  }
  if (k === 'classic') {
    return (
      <g>
        <Straps fill="#6a4330" stroke="#3a2418" />
        <rect x="153" y="93" width="9" height="14" rx="3" fill="#c9c9d0" />
        <circle cx="100" cy="100" r="55" fill="#d9d9df" stroke="#8d8d98" strokeWidth="4" />
        <circle cx="100" cy="100" r="43" fill="#fbfbfd" stroke="#b9b9c4" strokeWidth="2" />
        {TICKS.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a2a33" strokeWidth={t.long ? 3 : 1.5} strokeLinecap="round" />)}
        <line x1="100" y1="100" x2="82" y2="87" stroke="#1d1d25" strokeWidth="4" strokeLinecap="round" />
        <line x1="100" y1="100" x2="128" y2="84" stroke="#1d1d25" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="100" cy="100" r="3.5" fill="#d23b4a" />
      </g>
    )
  }
  if (k === 'neon') {
    return (
      <g>
        <Straps fill="#1c1c33" stroke="#ff4fd8" />
        <rect x="153" y="93" width="9" height="14" rx="3" fill="#35e0ff" />
        <circle cx="100" cy="100" r="55" fill="#26263f" stroke="#35e0ff" strokeWidth="4" style={{ filter: 'drop-shadow(0 0 4px #35e0ff)' }} />
        <circle cx="100" cy="100" r="42" fill="#090914" />
        <text x="100" y="108" textAnchor="middle" fontFamily="ui-monospace, Menlo, Consolas, monospace" fontWeight="700" fontSize="24"
          fill="#ff6fe0" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }}>21:07</text>
      </g>
    )
  }
  if (k === 'gold') {
    return (
      <g>
        <defs>
          <linearGradient id={`gold${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbe58a" /><stop offset=".55" stopColor="#d9a62c" /><stop offset="1" stopColor="#a8761a" />
          </linearGradient>
        </defs>
        <Straps fill="#2b2b2f" stroke="#111114" />
        <rect x="153" y="93" width="9" height="14" rx="3" fill={`url(#gold${uid})`} />
        <circle cx="100" cy="100" r="55" fill={`url(#gold${uid})`} stroke="#8a5f12" strokeWidth="4" />
        <circle cx="100" cy="100" r="43" fill="#1b1b1f" stroke="#f3cf68" strokeWidth="2" />
        {TICKS.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#f3cf68" strokeWidth={t.long ? 3 : 1.5} strokeLinecap="round" />)}
        <line x1="100" y1="100" x2="82" y2="87" stroke="#f3cf68" strokeWidth="4" strokeLinecap="round" />
        <line x1="100" y1="100" x2="128" y2="84" stroke="#f3cf68" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="100" cy="100" r="3.5" fill="#fbe58a" />
      </g>
    )
  }
  return (
    <g>
      <circle cx="100" cy="100" r="50" fill="#555" />
      <text x="100" y="112" textAnchor="middle" fontSize="38" fill="#fff">?</text>
    </g>
  )
}

const CSS = '.ua-float{animation:ua-float 4.5s ease-in-out infinite}@keyframes ua-float{0%,100%{transform:translateY(2px)}50%{transform:translateY(-3px)}}@media (prefers-reduced-motion:reduce){.ua-float{animation:none}}'

interface Props { model: string; backdrop: string; symbol: string; className?: string; label?: string; variant?: 'full' | 'model' }

// Узор для CSS-фона (используется в карточке подарка в чате).
export function patternUri(backdrop: string, symbol: string): string {
  const b = BACKDROPS[backdrop] ?? BACKDROPS.ash
  const sym = SYMBOLS[symbol] ?? SYMBOLS.star
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><g fill="${b.pattern}" opacity=".35"><path transform="translate(2 2) scale(1.05)" d="${sym}"/><path transform="translate(30 30) scale(1.05)" d="${sym}"/></g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Картинка уникального подарка: фон с узором и модель по центру.
export default function UniqueArt({ model, backdrop, symbol, className = 'rounded-xl', label = 'Уникальный подарок', variant = 'full' }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const b = BACKDROPS[backdrop] ?? BACKDROPS.ash
  const sym = SYMBOLS[symbol] ?? SYMBOLS.star
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={`block aspect-square w-full ${className}`}>
      <style>{CSS}</style>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor={b.center} /><stop offset="1" stopColor={b.edge} />
        </radialGradient>
        <pattern id={`pt${uid}`} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill={b.pattern} opacity=".42">
            <path transform="translate(2 2) scale(1.05)" d={sym} />
            <path transform="translate(30 30) scale(1.05)" d={sym} />
          </g>
        </pattern>
      </defs>
      {variant === 'full' && <rect width="200" height="200" fill={`url(#bg${uid})`} />}
      {variant === 'full' && <rect width="200" height="200" fill={`url(#pt${uid})`} />}
      <ellipse cx="100" cy="176" rx="46" ry="6" fill="#000" opacity=".18" />
      <g className="ua-float"><Model k={model} uid={uid} /></g>
    </svg>
  )
}
