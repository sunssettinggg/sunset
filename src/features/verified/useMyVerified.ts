import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Подтверждён ли текущий пользователь (не зависит от того, какие поля грузит App).
export function useMyVerified(userId: string): boolean {
  const [verified, setVerified] = useState(false)
  useEffect(() => {
    let active = true
    void supabase.from('profiles').select('verified').eq('id', userId).single()
      .then(({ data }) => {
        if (active) setVerified(!!(data as { verified: boolean | null } | null)?.verified)
      })
    return () => { active = false }
  }, [userId])
  return verified
}
