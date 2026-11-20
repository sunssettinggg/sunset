import { existsSync, readFileSync, writeFileSync } from 'node:fs'

if (!existsSync('package.json') || !existsSync('src/features/profile/ProfileModal.tsx')) {
  console.error('Запускай из папки проекта (sunset-app).')
  process.exit(1)
}
const patches = {"src/features/profile/ProfileModal.tsx":{"marker":"Коллекционные юзернеймы","steps":[["            {me.handles.map((h) => (\n              <button key={h} type=\"button\" onClick={() => setCollectible({ kind: 'username', value: h })} title=\"О юзернейме\"\n                className=\"rounded-full bg-accent/15 px-2 py-0.5 text-[0.85em] text-accent transition hover:brightness-125\">@{h}</button>\n            ))}\n",""],["        <button type=\"button\" onClick={() => setStyleOpen(true)}","        {me.handles.length > 0 && (\n          <Card title=\"Коллекционные юзернеймы\">\n            <div className=\"flex flex-wrap gap-2\">\n              {me.handles.map((h) => (\n                <button key={h} type=\"button\" onClick={() => setCollectible({ kind: 'username', value: h })} title=\"О юзернейме\"\n                  className=\"rounded-full bg-accent/15 px-3 py-1 text-sm text-accent transition hover:brightness-125\">@{h}</button>\n              ))}\n            </div>\n          </Card>\n        )}\n\n        <button type=\"button\" onClick={() => setStyleOpen(true)}"]]},"src/features/chat/RightPanel.tsx":{"marker":"Коллекционные юзернеймы","steps":[["handles={chat.handles}\n          onHandleClick={(h) => setCollectible({ kind: 'username', value: h })} /></div>}","handles={[]} /></div>}"],["      {chat.number && (\n        <Card title=\"Номер\">","      {chat.handles.length > 0 && (\n          <Card title=\"Коллекционные юзернеймы\">\n            <div className=\"flex flex-wrap gap-2\">\n              {chat.handles.map((h) => (\n                <button key={h} type=\"button\" onClick={() => setCollectible({ kind: 'username', value: h })} title=\"О юзернейме\"\n                  className=\"rounded-full bg-accent/15 px-3 py-1 text-sm text-accent transition hover:brightness-125\">@{h}</button>\n              ))}\n            </div>\n          </Card>\n      )}\n\n      {chat.number && (\n        <Card title=\"Номер\">"]]},"src/features/settings/SettingsModal.tsx":{"marker":"Коллекционные юзернеймы","steps":[["username={p.me.username} handles={p.me.handles} />","username={p.me.username} handles={[]} />"],["{p.me.showcase_number && <Info label=\"Номер\" value={p.me.showcase_number} />}","{p.me.handles.length > 0 && <Info label=\"Коллекционные юзернеймы\" value={p.me.handles.map((h) => '@' + h).join(', ')} />}\n              {p.me.showcase_number && <Info label=\"Номер\" value={p.me.showcase_number} />}"]]}}

const loaded = {}
for (const [path, { marker, steps }] of Object.entries(patches)) {
  if (!existsSync(path)) { console.error('Нет файла ' + path + '. Ничего не менял.'); process.exit(1) }
  const raw = readFileSync(path, 'utf8')
  const f = { crlf: raw.includes('\r\n'), src: raw.replace(/\r\n/g, '\n') }
  if (f.src.includes(marker)) { console.log('уже применено: ' + path); continue }
  for (const [a, b] of steps) {
    if (!f.src.includes(a)) { console.error('Не нашёл в ' + path + ' место:\n' + a + '\nНичего не менял. Пришли мне этот файл.'); process.exit(1) }
    f.src = f.src.replace(a, () => b)
  }
  loaded[path] = f
}
for (const [path, f] of Object.entries(loaded)) {
  writeFileSync(path, f.crlf ? f.src.replace(/\n/g, '\r\n') : f.src)
  console.log('обновлён ' + path)
}
console.log('Готово: коллекционные юзернеймы вынесены в отдельную карточку. Дальше: npm run build')
