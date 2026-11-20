import { existsSync, readFileSync, appendFileSync } from 'node:fs'

const P = 'src/index.css'
if (!existsSync(P)) { console.error('Запускай из папки проекта (sunset-app).'); process.exit(1) }
const raw = readFileSync(P, 'utf8')
if (raw.includes('::-webkit-scrollbar')) { console.log('Уже применено'); process.exit(0) }
const css = "\n/* \u0421\u0432\u043e\u0438 \u043f\u043e\u043b\u043e\u0441\u044b \u043f\u0440\u043e\u043a\u0440\u0443\u0442\u043a\u0438 \u0432 \u0441\u0442\u0438\u043b\u0435 Sunset */\n* { scrollbar-width: auto; }\n@supports (-moz-appearance: none) {\n  * { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--muted) 45%, transparent) transparent; }\n}\n::-webkit-scrollbar { width: 12px; height: 12px; background: transparent; }\n::-webkit-scrollbar-track { background: transparent; }\n::-webkit-scrollbar-corner { background: transparent; }\n::-webkit-scrollbar-button { display: none; width: 0; height: 0; }\n::-webkit-scrollbar-thumb {\n  background-color: color-mix(in srgb, var(--muted) 40%, transparent);\n  background-clip: padding-box;\n  border: 4px solid transparent;\n  border-radius: 999px;\n  transition: background-color 0.15s;\n}\n::-webkit-scrollbar-thumb:hover { background-color: var(--accent); border-width: 3px; }\n::-webkit-scrollbar-thumb:active { background-color: var(--accent); }\n"
appendFileSync(P, raw.includes('\r\n') ? css.replace(/\n/g, '\r\n') : css)
console.log('Готово: свои полосы прокрутки. Дальше: npm run build')
