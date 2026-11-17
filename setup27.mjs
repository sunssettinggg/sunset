import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const P = 'src/features/profile/ProfileModal.tsx'
if (!existsSync(P) || !existsSync('src/features/profile/ColorSettings.tsx')) {
  console.error('Запускай из папки проекта; сначала нужен setup26.')
  process.exit(1)
}
const raw = readFileSync(P, 'utf8')
const crlf = raw.includes('\r\n')
let s = raw.replace(/\r\n/g, '\n')
if (s.includes('ProfileStyleModal')) { console.log('Уже применено'); process.exit(0) }
for (const [a, b] of [["import ColorSettings from './ColorSettings'","import ProfileStyleModal from './ProfileStyleModal'"],["import { Camera, Info, Loader2, Phone, X } from 'lucide-react'","import { Camera, ChevronRight, Info, Loader2, Palette, Phone, X } from 'lucide-react'"],["  const colors = useColors(me.id)\n","  const colors = useColors(me.id)\n  const [styleOpen, setStyleOpen] = useState(false)\n"],["        <Card title=\"Цвета Premium\">\n          <ColorSettings userId={me.id} />\n        </Card>\n\n","        <button type=\"button\" onClick={() => setStyleOpen(true)}\n          className=\"flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left text-sm transition hover:brightness-110\">\n          <Palette size={16} className=\"text-accent\" />\n          <span className=\"flex-1\">Оформление профиля</span>\n          <ChevronRight size={16} className=\"text-muted\" />\n        </button>\n\n"],["      {collectible && <CollectibleModal","      {styleOpen && <ProfileStyleModal userId={me.id} onClose={() => setStyleOpen(false)} />}\n      {collectible && <CollectibleModal"]]) {
  if (!s.includes(a)) { console.error('Не нашёл место в ProfileModal.tsx:\n' + a + '\nНичего не менял. Пришли мне файл.'); process.exit(1) }
  s = s.replace(a, () => b)
}
writeFileSync('src/features/profile/ProfileStyleModal.tsx', "import { createPortal } from 'react-dom'\nimport { X } from 'lucide-react'\nimport ColorSettings from './ColorSettings'\n\nexport default function ProfileStyleModal({ userId, onClose }: { userId: string; onClose: () => void }) {\n  return createPortal(\n    <div className=\"fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center\"\n      onClick={(e) => { e.stopPropagation(); onClose() }}>\n      <div className=\"w-full max-w-xs space-y-3 rounded-3xl bg-bg2 p-4 shadow-xl\" onClick={(e) => e.stopPropagation()}>\n        <div className=\"flex items-center justify-between\">\n          <h2 className=\"text-sm font-medium\">Оформление профиля</h2>\n          <button type=\"button\" onClick={onClose} title=\"Закрыть\" className=\"rounded-lg p-1 text-muted transition hover:text-text\"><X size={18} /></button>\n        </div>\n        <ColorSettings userId={userId} />\n      </div>\n    </div>,\n    document.body,\n  )\n}\n")
writeFileSync(P, crlf ? s.replace(/\n/g, '\r\n') : s)
console.log('Готово: кнопка «Оформление профиля» в профиле, цвета теперь в отдельной плашке. Дальше: npm run build')
