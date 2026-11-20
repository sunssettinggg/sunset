// SUNSET срез 21: визуал чата. Запуск: node setup21.mjs
// Что делает:
//  1) разделители дат между сообщениями («Сегодня», «Вчера», «16 ноября»);
//  2) группировка: подряд идущие сообщения одного автора плотнее, «хвостик» пузыря только у последнего,
//     в группах имя автора только у первого сообщения серии;
//  3) анимации: мягкое появление новых сообщений и «поп» у реакций (учитывает «уменьшить движение»).
// Меняет только ChatView.tsx точечно (+ новый файл chat-anim.css). Если якорь не найден, ничего не записывается.
// Старая версия сохраняется в .setup-backups/setup21/

import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

if (!existsSync('package.json') || !existsSync('src')) {
  console.error('ОШИБКА: запусти этот файл внутри папки sunset-app (где лежит package.json).')
  process.exit(1)
}

const SPEC = {"newFiles": {"src/features/chat/chat-anim.css": "/* Анимации чата. Учитывают системную настройку «уменьшить движение». */\n@keyframes msg-in {\n  from { opacity: 0; transform: translateY(8px) scale(0.98); }\n  to { opacity: 1; transform: none; }\n}\n@keyframes chip-pop {\n  0% { transform: scale(0.6); }\n  70% { transform: scale(1.12); }\n  100% { transform: scale(1); }\n}\n.msg-in { animation: msg-in 0.18s ease-out; transform-origin: bottom center; }\n.chip-pop { animation: chip-pop 0.2s ease-out; }\n@media (prefers-reduced-motion: reduce) {\n  .msg-in, .chip-pop { animation: none; }\n}\n"}, "patches": [["src/features/chat/ChatView.tsx", "chat-anim.css", [{"kind": "str", "from": "import VoiceMessage from './VoiceMessage'", "to": "import VoiceMessage from './VoiceMessage'\nimport { Fragment, useLayoutEffect } from 'react'\nimport './chat-anim.css'"}, {"kind": "str", "from": "interface Props {", "to": "const dayKey = (iso: string) => {\n  const d = new Date(iso)\n  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()\n}\n\nfunction dayLabel(iso: string): string {\n  const d = new Date(iso)\n  const now = new Date()\n  const yesterday = new Date(now)\n  yesterday.setDate(now.getDate() - 1)\n  if (d.toDateString() === now.toDateString()) return 'Сегодня'\n  if (d.toDateString() === yesterday.toDateString()) return 'Вчера'\n  const opts: Intl.DateTimeFormatOptions = d.getFullYear() === now.getFullYear()\n    ? { day: 'numeric', month: 'long' }\n    : { day: 'numeric', month: 'long', year: 'numeric' }\n  return d.toLocaleDateString('ru-RU', opts)\n}\n\n// Сообщения одного автора ближе пяти минут друг к другу склеиваются в серию.\nconst GROUP_GAP_MS = 5 * 60 * 1000\n\ninterface Props {"}, {"kind": "str", "from": "useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])", "to": "useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])\n\n  // Новые сообщения появляются с лёгкой анимацией (история при открытии чата не анимируется).\n  const knownIds = useRef<Set<string> | null>(null)\n  useLayoutEffect(() => {\n    if (loading) return\n    const known = knownIds.current\n    if (known === null) { knownIds.current = new Set(messages.map((m) => m.id)); return }\n    for (const m of messages) {\n      if (known.has(m.id)) continue\n      known.add(m.id)\n      document.getElementById('msg-' + m.id)?.classList.add('msg-in')\n    }\n  }, [messages, loading])"}, {"kind": "any", "options": [["{messages.map((m) => {", "{messages.map((m, idx) => {"], ["{messages.map((m, idx) => {", "{messages.map((m, idx) => {"]]}, {"kind": "str", "from": "const ticks = mine && direct", "to": "const ticks = mine && direct\n          const prevMsg = idx > 0 ? messages[idx - 1] : undefined\n          const nextMsg = messages[idx + 1]\n          const newDay = !prevMsg || dayKey(prevMsg.created_at) !== dayKey(m.created_at)\n          const sameAsPrev = !!prevMsg && !newDay && prevMsg.sender_id === m.sender_id\n            && Date.parse(m.created_at) - Date.parse(prevMsg.created_at) < GROUP_GAP_MS\n          const lastInRun = !nextMsg || nextMsg.sender_id !== m.sender_id\n            || dayKey(nextMsg.created_at) !== dayKey(m.created_at)\n            || Date.parse(nextMsg.created_at) - Date.parse(m.created_at) >= GROUP_GAP_MS"}, {"kind": "str", "from": "relative h-full space-y-3 overflow-y-auto p-4", "to": "relative h-full overflow-y-auto p-4"}, {"kind": "str", "from": "<div key={m.id} id={`msg-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}", "to": "<Fragment key={m.id}>\n          {newDay && (\n            <div className=\"mt-4 mb-1 flex justify-center\">\n              <span className=\"rounded-full bg-bg2/90 px-3 py-1 text-xs text-muted\">{dayLabel(m.created_at)}</span>\n            </div>\n          )}\n          <div id={`msg-${m.id}`} className={`flex ${sameAsPrev ? 'mt-0.5' : 'mt-3'} ${mine ? 'justify-end' : 'justify-start'}`}"}, {"kind": "close"}, {"kind": "str", "from": "{!mine && chat.kind === 'group' && (", "to": "{!mine && chat.kind === 'group' && !sameAsPrev && ("}, {"kind": "str", "from": "'rounded-br-md bg-accent text-on-accent'", "to": "(lastInRun ? 'rounded-br-md ' : '') + 'bg-accent text-on-accent'"}, {"kind": "str", "from": "'rounded-bl-md bg-surface'", "to": "(lastInRun ? 'rounded-bl-md ' : '') + 'bg-surface'"}, {"kind": "str", "from": "rounded-full px-2 py-0.5 text-xs transition", "to": "chip-pop rounded-full px-2 py-0.5 text-xs transition"}]]]}

const count = (src, s) => src.split(s).length - 1
const problems = []
const planned = [] // [path, content, isNew]

for (const [path, content] of Object.entries(SPEC.newFiles)) {
  if (existsSync(path)) { console.log('уже есть, пропускаю:', path); continue }
  planned.push([path, content, true])
}

for (const [path, marker, steps] of SPEC.patches) {
  if (!existsSync(path)) { problems.push(path + ': файл не найден'); continue }
  let src = readFileSync(path, 'utf8')
  if (src.includes(marker)) { console.log('уже применено, пропускаю:', path); continue }
  let ok = true
  for (const step of steps) {
    if (step.kind === 'str') {
      const c = count(src, step.from)
      if (c !== 1) { problems.push(path + ': якорь найден ' + c + ' раз (нужно 1): ' + step.from.slice(0, 70)); ok = false; break }
      src = src.replace(step.from, () => step.to)
    } else if (step.kind === 'any') {
      const hit = step.options.find(([f]) => count(src, f) === 1)
      if (!hit) { problems.push(path + ': не найден ни один вариант якоря: ' + step.options[0][0].slice(0, 70)); ok = false; break }
      src = src.replace(hit[0], () => hit[1])
    } else if (step.kind === 'close') {
      const re = /(\s*)\)(\s*)\}\)\}(\s*)<div ref=\{endRef\} \/>/g
      const found = src.match(re)
      if (!found || found.length !== 1) { problems.push(path + ': не найден конец списка сообщений (<div ref={endRef} />)'); ok = false; break }
      src = src.replace(re, (_m, a, b, c) => a + '</Fragment>' + a + ')' + b + '})}' + c + '<div ref={endRef} />')
    }
  }
  if (ok) planned.push([path, src, false])
}

if (problems.length > 0) {
  console.error('\nОШИБКА: ничего не записано, потому что файл отличается от ожидаемого:')
  for (const p of problems) console.error(' -', p)
  console.error('\nПришли мне актуальный ChatView.tsx текстом, и я подгоню патч.')
  process.exit(1)
}

const backupDir = join('.setup-backups', 'setup21')
for (const [path, content, isNew] of planned) {
  if (!isNew) {
    const b = join(backupDir, path)
    mkdirSync(dirname(b), { recursive: true })
    writeFileSync(b, readFileSync(path, 'utf8'), 'utf8')
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
  console.log(isNew ? 'создан ' : 'изменён', path)
}

if (existsSync('.gitignore') && !readFileSync('.gitignore', 'utf8').includes('.setup-backups')) {
  appendFileSync('.gitignore', '\n.setup-backups\n')
}

console.log('\nГотово. SQL выполнять не нужно.')
console.log('Проверь: npm run build && npm run lint, затем коммит и пуш.')
console.log('Откат: старая версия лежит в .setup-backups/setup21/ (или git restore до коммита).')
