import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Image as ImageIcon, Lock, MessagesSquare, Palette, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'
import { getStars } from '../chat/api'
import { PremiumStar } from './PremiumBadge'
import { buyPremium, refreshPremium } from './premium'

interface Props { me: Profile; onProfileChanged: () => void }

// Цены должны совпадать с функцией buy_premium в supabase/migrations/0010_premium.sql
const PLANS = [
  { months: 1, price: 300, label: '1 месяц', note: '' },
  { months: 12, price: 2400, label: '12 месяцев', note: 'Выгоднее на 33%' },
]

interface Perk { icon: ReactNode; title: string; text: string; ready: boolean }
const PERKS: Perk[] = [
  { icon: <Star size={20} />, title: 'Значок Premium', text: 'Звёздочка рядом с именем. Нажмите на неё, и все увидят, что вы подписчик Premium.', ready: true },
  { icon: <Palette size={20} />, title: 'Цвета имени и профиля', text: 'Свой цвет имени, юзернейма и профиля. Их видят все, кто открывает ваш профиль или переписку с вами.', ready: true },
  { icon: <Palette size={20} />, title: 'Цвет сообщений', text: 'Свой цвет пузырей ваших сообщений. Собеседники видят его в переписке.', ready: true },
  { icon: <ImageIcon size={20} />, title: 'Обои для вас и собеседника', text: 'Установите обои в личном чате для себя и собеседника.', ready: true },
  { icon: <Lock size={20} />, title: 'Ограничение сообщений', text: 'Ограничьте входящие сообщения от незнакомых людей или сделайте их платными.', ready: false },
  { icon: <MessagesSquare size={20} />, title: 'Управление чатами', text: 'Папка по умолчанию, автоархивация и скрытие новых чатов с неконтактами.', ready: false },
]

function friendly(msg: string): string {
  if (msg.includes('not enough stars')) return 'Недостаточно Звёзд. Пополнить баланс можно в Маркете.'
  if (msg.includes('bad plan')) return 'Такого тарифа нет.'
  return msg
}

export default function PremiumPage({ me, onProfileChanged }: Props) {
  const [stars, setStars] = useState(0)
  const [until, setUntil] = useState<Date | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [s, row] = await Promise.all([
        getStars(),
        supabase.from('profiles').select('premium_until').eq('id', me.id).single(),
      ])
      setStars(s)
      const v = (row.data as { premium_until: string | null } | null)?.premium_until
      setUntil(v && Date.parse(v) > Date.now() ? new Date(v) : null)
    } catch (e) { setError(friendly((e as Error).message)) }
  }, [me.id])

  useEffect(() => { void refresh() }, [refresh])

  async function buy(months: number) {
    setBusy(months); setError(null)
    try {
      await buyPremium(months)
      refreshPremium(me.id)
      await refresh()
      onProfileChanged()
    } catch (e) { setError(friendly((e as Error).message)) }
    finally { setBusy(null) }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-5 md:p-8">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-accent/25 to-pink/25 p-8 text-center ring-1 ring-line">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-pink"><PremiumStar size={44} /></div>
          <h1 className="text-2xl font-bold">Sunset Premium</h1>
          <p className="max-w-md text-sm text-muted">Больше возможностей и особый значок рядом с вашим именем.</p>
          {until ? (
            <div className="rounded-full bg-surface px-4 py-1.5 text-sm">
              Подписка активна до {until.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          ) : (
            <div className="rounded-full bg-surface px-4 py-1.5 text-sm text-muted">Подписки пока нет</div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="px-1 text-sm text-muted">Что входит</h2>
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-start gap-4 rounded-2xl bg-surface p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">{p.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${p.ready ? 'bg-accent/15 text-accent' : 'bg-bg text-muted'}`}>
                    {p.ready ? 'Доступно' : 'Скоро'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted">{p.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm text-muted">Подписка</h2>
            <span className="flex items-center gap-1 text-sm"><Star size={14} className="text-accent" fill="currentColor" />{stars.toLocaleString('ru-RU')}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((pl) => (
              <div key={pl.months} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
                <div>
                  <div className="font-medium">{pl.label}</div>
                  <div className="text-xs text-accent">{pl.note || ' '}</div>
                </div>
                <div className="flex items-center gap-1 text-xl font-semibold">
                  <Star size={18} className="text-accent" fill="currentColor" />{pl.price.toLocaleString('ru-RU')}
                </div>
                <button disabled={busy !== null || stars < pl.price} onClick={() => void buy(pl.months)}
                  className="sunset-gradient rounded-full px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50">
                  {busy === pl.months ? 'Оформляем…' : until ? 'Продлить' : 'Подписаться'}
                </button>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-pink">{error}</p>}
          <p className="px-1 text-xs text-muted">Оплата Звёздами. Автопродления нет: когда срок закончится, значок пропадёт, пока вы не продлите подписку.</p>
        </div>
      </div>
    </div>
  )
}
