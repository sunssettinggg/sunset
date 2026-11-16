import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Админ ли текущий пользователь. Если функции is_admin ещё нет в базе, вернёт false, и кнопка просто не появится.
export function useIsAdmin(userId: string): boolean {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    let active = true
    setAdmin(false)
    void supabase.rpc('is_admin').then(({ data }) => { if (active) setAdmin(data === true) })
    return () => { active = false }
  }, [userId])
  return admin
}
