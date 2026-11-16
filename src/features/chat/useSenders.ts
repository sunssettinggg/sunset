import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Message } from '../../lib/types'

export interface SenderProfile { display_name: string; avatar_url: string | null; verified: boolean }

interface Row { id: string; display_name: string; avatar_url: string | null; verified: boolean | null }

// Имя, аватарка и галочка авторов сообщений. Каждый автор запрашивается один раз.
export function useSenderProfiles(messages: Message[]): Record<string, SenderProfile> {
  const [people, setPeople] = useState<Record<string, SenderProfile>>({})
  const asked = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.sender_id))].filter((id) => !asked.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => asked.current.add(id))
    void supabase.from('profiles').select('id, display_name, avatar_url, verified').in('id', missing)
      .then(({ data, error }) => {
        if (error || !data) {
          missing.forEach((id) => asked.current.delete(id))
          return
        }
        setPeople((prev) => {
          const next = { ...prev }
          for (const p of data as Row[]) {
            next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url, verified: !!p.verified }
          }
          return next
        })
      })
  }, [messages])

  return people
}
