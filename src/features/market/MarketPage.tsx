import { useCallback, useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type { MarketItem, Profile } from '../../lib/types'
import GiftArt from './GiftArt'
import { buyGift, listGifts, myGifts, type Gift, type OwnedGift } from './gifts'
import { applyItem, buyItem, getStars, listItem, listMarket, myItems, unapplyItem, unlistItem } from '../chat/api'

interface Props { me: Profile; onProfileChanged: () => void }

function friendly(msg: string): string {
  if (msg.includes('not enough stars')) return 'Недостаточно Звёзд.'
  if (msg.includes('not for sale')) return 'Лот уже недоступен.'
  if (msg.includes('already yours')) return 'Это уже ваш лот.'
  if (msg.includes('bad price')) return 'Цена от 1 до 1 000 000 000.'
  if (msg.includes('unlist first')) return 'Сначала снимите лот с продажи.'
  if (msg.includes('handle limit')) return 'В профиле не больше 10 юзернеймов.'
  if (msg.includes('username in use')) return 'Этот юзернейм уже занят обычным аккаунтом.'
  return msg
}

const show = (it: MarketItem) => (it.kind === 'username' ? `@${it.value}` : it.value)
const chip = (active: boolean) =>
  `rounded-lg px-4 py-2 text-sm transition ${active ? 'bg-accent text-on-accent' : 'bg-surface text-muted hover:text-text'}`
const smallBtn = 'rounded-lg bg-bg px-3 py-1.5 text-xs transition hover:brightness-125 disabled:opacity-40'
const card = 'flex flex-col gap-3 rounded-2xl bg-surface p-4'

export default function MarketPage({ me, onProfileChanged }: Props) {
  const [stars, setStars] = useState(0)
  const [tab, setTab] = useState<'shop' | 'store' | 'mine'>('shop')
  const [kind, setKind] = useState<MarketItem['kind'] | 'gift'>('number')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [ownedGifts, setOwnedGifts] = useState<OwnedGift[]>([])
  const [shop, setShop] = useState<MarketItem[]>([])
  const [mine, setMine] = useState<MarketItem[]>([])
  const [sellId, setSellId] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [s, sh, mi, gf, og] = await Promise.all([getStars(), listMarket(), myItems(me.id), listGifts(), myGifts()])
      setStars(s); setShop(sh); setMine(mi); setGifts(gf); setOwnedGifts(og)
    } catch (e) { setError(friendly((e as Error).message)) }
  }, [me.id])

  useEffect(() => { void refresh() }, [refresh])

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onProfileChanged() }
    catch (e) { setError(friendly((e as Error).message)) }
    finally { setBusy(false) }
  }

  const applied = (it: MarketItem) => (it.kind === 'number' ? me.showcase_number === it.value : me.handles.includes(it.value))
  const itemKind = kind === 'gift' ? 'number' : kind
  const shopItems = shop.filter((i) => i.kind === itemKind)
  const myList = kind === 'gift' ? [] : mine.filter((i) => i.kind === kind)
  const giftById = new Map(gifts.map((g) => [g.id, g]))
  function openTab(t: 'shop' | 'store' | 'mine') { setTab(t); if (t !== 'mine' && kind === 'gift') setKind('number') }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-5 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Маркет</h1>
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
            <Star size={26} className="text-accent" fill="currentColor" />
            <div>
              <div className="text-xl font-semibold leading-tight">{stars.toLocaleString('ru-RU')}</div>
              <div className="text-xs text-muted">Звёзды</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={chip(tab === 'shop')} onClick={() => openTab('shop')}>Витрина</button>
          <button className={chip(tab === 'store')} onClick={() => openTab('store')}>Магазин</button>
          <button className={chip(tab === 'mine')} onClick={() => openTab('mine')}>Мои предметы</button>
          <div className="flex-1" />
          {tab !== 'store' && <>
            <button className={chip(kind === 'number')} onClick={() => setKind('number')}>Номера</button>
            <button className={chip(kind === 'username')} onClick={() => setKind('username')}>Юзернеймы</button>
            {tab === 'mine' && <button className={chip(kind === 'gift')} onClick={() => setKind('gift')}>Подарки</button>}
          </>}
        </div>

        {error && <p className="text-sm text-pink">{error}</p>}
        {tab === 'mine' && kind === 'username' && <p className="text-sm text-muted">В профиле: {me.handles.length} из 10</p>}

        {tab === 'shop' && shopItems.length === 0 && <p className="text-sm text-muted">Пока ничего не продаётся.</p>}
        {tab === 'mine' && kind === 'gift' && ownedGifts.length === 0 && <p className="text-sm text-muted">Подарков пока нет. Загляни в Магазин.</p>}
        {tab === 'mine' && kind !== 'gift' && myList.length === 0 && <p className="text-sm text-muted">Здесь появятся купленные предметы.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tab === 'store' && gifts.map((g) => (
            <div key={g.id} className={card}>
              <GiftArt gift={g} />
              <div>
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-muted">{g.description}</div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm">
                  <Star size={14} className="text-accent" fill="currentColor" />{g.price}
                </span>
                <button className={smallBtn} disabled={busy || stars < g.price} onClick={() => void run(() => buyGift(g.id))}>Купить</button>
              </div>
            </div>
          ))}

          {tab === 'mine' && kind === 'gift' && ownedGifts.map((og) => {
            const g = giftById.get(og.gift_id)
            return (
              <div key={og.id} className={card}>
                {g && <GiftArt gift={g} />}
                <div className="font-medium">{g?.title ?? 'Подарок'}</div>
                <div className="text-xs text-muted">Получен {new Date(og.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
            )
          })}

          {tab === 'shop' && shopItems.map((it) => (
            <div key={it.id} className={card}>
              <div className="break-all font-mono text-lg">{show(it)}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm">
                  <Star size={14} className="text-accent" fill="currentColor" />{it.price}
                </span>
                {it.owner_id === me.id ? <span className="text-xs text-muted">Ваш лот</span> : (
                  <button className={smallBtn} disabled={busy || stars < (it.price ?? 0)} onClick={() => void run(() => buyItem(it.id))}>Купить</button>
                )}
              </div>
            </div>
          ))}

          {tab === 'mine' && myList.map((it) => (
            <div key={it.id} className={card}>
              <div className="break-all font-mono text-lg">{show(it)}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {applied(it) && <span className="text-accent">в профиле</span>}
                {it.price !== null && <span className="text-muted">продаётся за {it.price}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {it.price !== null ? (
                  <button className={smallBtn} disabled={busy} onClick={() => void run(() => unlistItem(it.id))}>Снять с продажи</button>
                ) : (
                  <>
                    {applied(it)
                      ? <button className={smallBtn} disabled={busy} onClick={() => void run(() => unapplyItem(it.id))}>Убрать из профиля</button>
                      : <button className={smallBtn} disabled={busy || (it.kind === 'username' && me.handles.length >= 10)} onClick={() => void run(() => applyItem(it.id))}>В профиль</button>}
                    <button className={smallBtn} onClick={() => { setSellId(sellId === it.id ? null : it.id); setPrice('') }}>Продать</button>
                  </>
                )}
              </div>
              {sellId === it.id && (
                <div className="flex gap-2">
                  <input value={price} inputMode="numeric" placeholder="Цена в Звёздах"
                    onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="min-w-0 flex-1 rounded-lg bg-bg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent" />
                  <button className={smallBtn} disabled={busy || !price}
                    onClick={() => void run(async () => { await listItem(it.id, Number(price)); setSellId(null) })}>Выставить</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted">Номера и юзернеймы — украшения профиля. К регистрации и входу они не относятся.</p>
      </div>
    </div>
  )
}
