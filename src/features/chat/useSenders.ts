import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { canSee, getContacts } from '../privacy/visibility'
import type { Message } from '../../lib/types'

export interface SenderProfile { display_name: string; avatar_url: string | null; verified: boolean }

interface Row { id: string; display_name: string; avatar_url: string | null; verified: boolean | null; avatar_visibility: string | null }

// Имя, аватарка и галочка авторов сообщений. Каждый автор запрашивается один раз.
export function useSenderProfiles(messages: Message[]): Record<string, SenderProfile> {
  const [people, setPeople] = useState<Record<string, SenderProfile>>({})
  const asked = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missing = [...new Set(messages.map((m) => m.sender_id))].filter((id) => !asked.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => asked.current.add(id))
    void supabase.from('profiles').select('id, display_name, avatar_url, verified, avatar_visibility').in('id', missing)
      .then(async ({ data, error }) => {
        if (error || !data) {
          missing.forEach((id) => asked.current.delete(id))
          return
        }
        const contacts = await getContacts()
        setPeople((prev) => {
          const next = { ...prev }
          for (const p of data as Row[]) {
            next[p.id] = { display_name: p.display_name, avatar_url: canSee(p.avatar_visibility, contacts.has(p.id)) ? p.avatar_url : null, verified: !!p.verified }
          }
          return next
        })
      })
  }, [messages])

  return people
}
