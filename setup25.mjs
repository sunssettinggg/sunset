import fs from 'node:fs'
const f = 'src/features/chat/ChatView.tsx'
if (!fs.existsSync(f)) { console.error('Запусти в папке проекта (sunset-app)'); process.exit(1) }
const raw = fs.readFileSync(f, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')
if (s.includes('firstScrollDone')) { console.log('Уже применено'); process.exit(0) }
const old = "  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])\n"
if (!s.includes(old)) { console.error('Не нашёл строку автопрокрутки — ничего не изменено'); process.exit(1) }
const neu = `  const firstScrollDone = useRef(false)
  useLayoutEffect(() => {
    if (messages.length === 0) return
    if (!firstScrollDone.current) {
      // первое открытие чата: сразу внизу, без анимации сверху вниз
      firstScrollDone.current = true
      endRef.current?.scrollIntoView({ behavior: 'auto' })
      const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto' }), 150)
      return () => clearTimeout(t)
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])
`
s = s.replace(old, neu)
const m = s.match(/import \{([^}]*)\} from 'react'/)
if (!m) { console.error('Не нашёл import из react — ничего не изменено'); process.exit(1) }
if (!/\buseLayoutEffect\b/.test(m[1])) s = s.replace(m[0], `import {${m[1].replace(/\s+$/, '')}, useLayoutEffect } from 'react'`)
fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s)
console.log('Готово: ChatView.tsx обновлён')
