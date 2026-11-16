import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface Seller { display_name: string; avatar_url: string | null }

interface Row { id: string; display_name: string; avatar_url: string | null }

// Имя и аватарка владельцев лотов. Каждый владелец запрашивается один раз.
export function useSellers(ids: (string | null)[]): Record<string, Seller> {
  const [sellers, setSellers] = useState<Record<string, Seller>>({})
  const asked = useRef<Set<string>>(new Set())
  const key = [...new Set(ids.filter((i): i is string => !!i))].sort().join(',')

  useEffect(() => {
    const missing = key ? key.split(',').filter((id) => !asked.current.has(id)) : []
    if (missing.length === 0) return
    missing.forEach((id) => asked.current.add(id))
    void supabase.from('profiles').select('id, display_name, avatar_url').in('id', missing)
      .then(({ data, error }) => {
        if (error || !data) {
          missing.forEach((id) => asked.current.delete(id))
          return
        }
        setSellers((prev) => {
          const next = { ...prev }
          for (const p of data as Row[]) next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }
          return next
        })
      })
  }, [key])

  return sellers
}
