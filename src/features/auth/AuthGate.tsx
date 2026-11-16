import { useState } from 'react'
import AuthPage from './AuthPage'
import { getReturnTo, switchAccount } from './accounts'

// Экран входа. Если человек пришёл из меню «Добавить аккаунт», показываем кнопку возврата.
export default function AuthGate() {
  const back = getReturnTo()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goBack(id: string) {
    setBusy(true)
    setError(null)
    void switchAccount(id).then((err) => {
      if (err) setError(err)
      setBusy(false)
    })
  }

  return (
    <>
      <AuthPage />
      {back && (
        <div className="fixed top-4 left-4 z-50 flex flex-col items-start gap-2">
          <button type="button" disabled={busy} onClick={() => goBack(back)}
            className="rounded-xl bg-surface px-4 py-2 text-sm transition hover:brightness-125 disabled:opacity-50">
            ← Вернуться в аккаунт
          </button>
          {error && <p className="text-xs text-pink">{error}</p>}
        </div>
      )}
    </>
  )
}
