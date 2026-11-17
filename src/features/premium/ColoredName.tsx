import type { ReactNode } from 'react'
import { useColors } from './colors'

// Имя с цветом Premium. Без подписки или без выбранного цвета выглядит как обычный текст.
export default function ColoredName({ userId, name, className = '' }: { userId: string | null | undefined; name: string; className?: string }) {
  const c = useColors(userId)
  return <span className={className} style={c?.name ? { color: c.name } : undefined}>{name}</span>
}

// Кольцо вокруг аватарки: цвет профиля Premium или фирменный градиент.
export function ColorRing({ userId, children }: { userId: string | null | undefined; children: ReactNode }) {
  const c = useColors(userId)
  return (
    <div className="rounded-full bg-gradient-to-tr from-accent to-pink p-[3px]"
      style={c?.profile ? { backgroundImage: 'none', backgroundColor: c.profile } : undefined}>
      {children}
    </div>
  )
}
