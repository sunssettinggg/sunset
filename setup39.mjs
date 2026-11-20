import { existsSync, readFileSync, writeFileSync } from 'node:fs'

if (!existsSync('package.json') || !existsSync('src/features/chat/RightPanel.tsx')) {
  console.error('Запускай из папки проекта (sunset-app); нужны setup35 и setup36.')
  process.exit(1)
}
const patches = {"src/features/profile/ProfileModal.tsx":{"marker":"mt-1.5 whitespace-pre-wrap","steps":[["        <Card title=\"О себе\">\n          <div className=\"flex items-start gap-3\">\n            <Info size={16} className=\"mt-0.5 shrink-0 text-accent\" />\n            <p className=\"min-w-0 whitespace-pre-wrap break-words text-sm\">{me.bio || 'Не указано'}</p>\n          </div>\n        </Card>\n\n",""],["function Card({ title, children }: { title?: string; children: ReactNode }) {\n  return (\n    <section className=\"rounded-2xl bg-surface p-4\">\n      {title && <div className=\"mb-2 text-xs text-muted\">{title}</div>}\n      {children}\n    </section>\n  )\n}\n\n",""],["        <section className=\"divide-y divide-line overflow-hidden rounded-2xl bg-surface\">\n","        <section className=\"divide-y divide-line overflow-hidden rounded-2xl bg-surface\">\n          <div className=\"px-4 py-3\">\n            <div className=\"flex items-center gap-3 text-sm\"><Info size={18} className=\"text-muted\" /><span>О себе</span></div>\n            <p className=\"mt-1.5 whitespace-pre-wrap break-words pl-[30px] text-sm text-accent\">{me.bio || 'Не указано'}</p>\n          </div>\n"]]},"src/features/chat/RightPanel.tsx":{"marker":"mt-1.5 whitespace-pre-wrap","steps":[["      <Card title=\"О себе\">\n        <Line icon={<Info size={16} />}>{chat.bio || 'Описание не указано.'}</Line>\n      </Card>\n\n",""],["      <section className=\"shrink-0 divide-y divide-line overflow-hidden rounded-2xl bg-surface\">\n","      <section className=\"shrink-0 divide-y divide-line overflow-hidden rounded-2xl bg-surface\">\n        {chat.bio && (\n          <div className=\"px-4 py-3\">\n            <div className=\"flex items-center gap-3 text-sm\"><Info size={18} className=\"text-muted\" /><span>О себе</span></div>\n            <p className=\"mt-1.5 whitespace-pre-wrap break-words pl-[30px] text-sm text-accent\">{chat.bio}</p>\n          </div>\n        )}\n"]]}}

const loaded = {}
for (const [path, { marker, steps }] of Object.entries(patches)) {
  if (!existsSync(path)) { console.error('Нет файла ' + path + '. Ничего не менял.'); process.exit(1) }
  const raw = readFileSync(path, 'utf8')
  const f = { crlf: raw.includes('\r\n'), src: raw.replace(/\r\n/g, '\n') }
  if (f.src.includes(marker)) { console.log('уже применено: ' + path); continue }
  for (const [a, b] of steps) {
    if (!f.src.includes(a)) { console.error('Не нашёл в ' + path + ' место:\n' + a.slice(0, 300) + '\nНичего не менял. Пришли мне этот файл.'); process.exit(1) }
    f.src = f.src.replace(a, () => b)
  }
  loaded[path] = f
}
for (const [path, f] of Object.entries(loaded)) {
  writeFileSync(path, f.crlf ? f.src.replace(/\n/g, '\r\n') : f.src)
  console.log('обновлён ' + path)
}
console.log('Готово: «О себе» теперь в общей колонке. Дальше: npm run build')
