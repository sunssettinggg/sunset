import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const P = 'src/features/chat/RightPanel.tsx'
if (!existsSync(P)) { console.error('Запускай из папки проекта (sunset-app).'); process.exit(1) }
const raw = readFileSync(P, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')
const old = '<section className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">'
if (s.includes('shrink-0 divide-y')) { console.log('Уже применено'); process.exit(0) }
if (!s.includes(old)) { console.error('Не нашёл карточку со строками в RightPanel.tsx. Нужен setup35 (проверь, что он применён).'); process.exit(1) }
s = s.replace(old, '<section className="shrink-0 divide-y divide-line overflow-hidden rounded-2xl bg-surface">')
writeFileSync(P, crlf ? s.replace(/\n/g, '\r\n') : s)
console.log('Готово: карточка со строками больше не схлопывается. Дальше: npm run build')
