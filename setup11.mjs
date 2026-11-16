import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const path = 'src/App.tsx'
if (!existsSync('package.json') || !existsSync(path)) {
  console.error('Запусти скрипт из папки проекта (где лежит package.json).')
  process.exit(1)
}

let src = readFileSync(path, 'utf8')
if (src.includes('isAuthError')) {
  console.log('Правка уже применена.')
  process.exit(0)
}

const from = ".then(({ data, error }) => (error ? setError(error.message) : setMe(data as Profile)))"
const to = `.then(({ data, error }) => {
        if (!error) { setMe(data as Profile); return }
        const isAuthError = /jwt|refresh token/i.test(error.message)
        if (isAuthError) void supabase.auth.signOut()
        else setError(error.message)
      })`

if (!src.includes(from)) {
  console.error('Не нашёл нужное место в src/App.tsx — файл изменён. Пришли его мне.')
  process.exit(1)
}
writeFileSync(path, src.replace(from, to))
console.log('обновлён ' + path)
console.log('Готово! SQL для этой правки не нужен.')
