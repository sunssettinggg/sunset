import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'register'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function friendlyError(message: string): string {
  if (/database error saving new user/i.test(message)) return 'Этот username уже занят или недопустим.'
  if (/invalid login credentials/i.test(message)) return 'Неверная почта или пароль.'
  if (/already registered/i.test(message)) return 'Эта почта уже зарегистрирована.'
  return message
}

const inputClass =
  'w-full rounded-xl bg-surface px-4 py-3 text-sm text-text placeholder:text-muted outline-none ' +
  'ring-1 ring-white/5 transition focus:ring-2 focus:ring-accent'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password.length < 8) return setError('Пароль должен быть не короче 8 символов.')
    if (mode === 'register' && !USERNAME_RE.test(username.toLowerCase())) {
      return setError('Username: 3–20 символов, только a-z, 0-9 и _.')
    }

    setBusy(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendlyError(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.toLowerCase(), display_name: displayName.trim() || username } },
      })
      if (error) setError(friendlyError(error.message))
      else if (!data.session) setInfo('Проверь почту и подтверди адрес, затем войди.')
    }
    setBusy(false)
  }

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-purple/25 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass relative w-full max-w-sm rounded-3xl p-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="sunset-gradient flex h-10 w-10 items-center justify-center rounded-xl">
            <Sun size={22} className="text-bg" />
          </div>
          <span className="text-xl font-semibold tracking-[0.2em]">SUNSET</span>
        </div>

        <h1 className="mb-1 text-lg font-medium">{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h1>
        <p className="mb-6 text-sm text-muted">
          {mode === 'login' ? 'Войди, чтобы продолжить.' : 'Пара полей, и ты внутри.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input className={inputClass} type="email" placeholder="Email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div key="reg" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                <input className={inputClass} placeholder="Username (a-z, 0-9, _)" autoComplete="username"
                  value={username} onChange={(e) => setUsername(e.target.value)} />
                <input className={inputClass} placeholder="Имя" maxLength={50}
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>
          <input className={inputClass} type="password" placeholder="Пароль (от 8 символов)" required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <p className="text-sm text-pink">{error}</p>}
          {info && <p className="text-sm text-accent">{info}</p>}

          <button type="submit" disabled={busy}
            className="sunset-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold
                       text-bg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <button type="button" className="mt-5 w-full text-center text-sm text-muted transition hover:text-text"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setInfo(null) }}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </motion.div>
    </div>
  )
}
