import { useCallback, useEffect, useMemo, useState } from 'react'
import { AtSign, Gift as GiftIcon, LayoutGrid, List, Phone, Search, Star } from 'lucide-react'
import type { MarketItem, Profile } from '../../lib/types'
import Avatar from '../chat/Avatar'
import GiftArt from './GiftArt'
import SellModal from './SellModal'
import { useSellers } from './useSellers'
import { buyGift, listGifts, myGifts, setGiftShown, type Gift, type OwnedGift } from './gifts'
import { applyItem, buyItem, getStars, listItem, listMarket, myItems, unapplyItem, unlistItem } from '../chat/api'

interface Props { me: Profile; onProfileChanged: () => void }

type Tab = 'username' | 'gift' | 'number'
type Sort = 'price_asc' | 'price_desc' | 'length'
type MineKind = 'number' | 'username' | 'gift'

function friendly(msg: string): string {
  if (msg.includes('not enough stars')) return 'Недостаточно Звёзд.'
  if (msg.includes('not for sale')) return 'Лот уже недоступен.'
  if (msg.includes('already yours')) return 'Это уже ваш лот.'
  if (msg.includes('bad price')) return 'Цена от 1 до 1 000 000 000.'
  if (msg.includes('unlist first')) return 'Сначала снимите лот с продажи.'
  if (msg.includes('handle limit')) return 'В профиле не больше 10 юзернеймов.'
  if (msg.includes('not your gift')) return 'Этого подарка у вас уже нет.'
  if (msg.includes('username in use')) return 'Этот юзернейм уже занят обычным аккаунтом.'
  return msg
}

const show = (it: MarketItem) => (it.kind === 'username' ? '@' + it.value : it.value)
const digits = (s: string) => s.replace(/\D/g, '')
const codeOf = (value: string) => digits(value).slice(0, 3)
const fmt = (n: number) => n.toLocaleString('ru-RU')

const chip = (active: boolean) =>
  'rounded-lg px-4 py-2 text-sm transition ' + (active ? 'bg-accent text-on-accent' : 'bg-surface text-muted hover:text-text')
const pill = (active: boolean) =>
  'rounded-full px-3 py-1.5 text-xs transition ' + (active ? 'bg-accent text-on-accent' : 'bg-bg text-muted hover:text-text')
const smallBtn = 'rounded-lg bg-bg px-3 py-1.5 text-xs transition hover:brightness-125 disabled:opacity-40'
const card = 'flex flex-col gap-3 rounded-2xl bg-surface p-4'
const inputCls = 'w-full rounded-xl bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent'
const bigBtn = 'flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed '

const INFO: Record<Tab, { title: string; text: string; all: string }> = {
  username: { title: 'Юзернеймы', text: 'Короткие имена для профиля и каналов. Купили — имя сразу ваше.', all: 'Все юзернеймы' },
  gift: { title: 'Подарки', text: 'Подарки для друзей. Отправить можно из окна информации о чате.', all: 'Все подарки' },
  number: { title: 'Номера', text: 'Один номер на аккаунт. Купили — номер сразу на вашей карточке.', all: 'Все номера' },
}

export default function MarketPage({ me, onProfileChanged }: Props) {
  const [stars, setStars] = useState(0)
  const [section, setSection] = useState<'market' | 'mine'>('market')
  const [tab, setTab] = useState<Tab>('username')
  const [mineKind, setMineKind] = useState<MineKind>('number')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [ownedGifts, setOwnedGifts] = useState<OwnedGift[]>([])
  const [shop, setShop] = useState<MarketItem[]>([])
  const [mine, setMine] = useState<MarketItem[]>([])
  const [query, setQuery] = useState('')
  const [len, setLen] = useState<'all' | '3' | '4' | '5' | '6'>('all')
  const [code, setCode] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [only, setOnly] = useState<'all' | 'mine'>('all')
  const [sort, setSort] = useState<Sort>('price_asc')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [sellOpen, setSellOpen] = useState(false)
  const [sellId, setSellId] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [s, sh, mi, gf, og] = await Promise.all([getStars(), listMarket(), myItems(me.id), listGifts(), myGifts(me.id)])
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

  const sellers = useSellers(shop.map((i) => i.owner_id))

  const tabItems = useMemo(() => (tab === 'gift' ? [] : shop.filter((i) => i.kind === tab)), [shop, tab])
  const codes = useMemo(() => [...new Set(tabItems.map((i) => codeOf(i.value)))].filter(Boolean).sort(), [tabItems])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '')
    const qd = digits(q)
    const lo = from ? Number(from) : null
    const hi = to ? Number(to) : null
    const list = tabItems.filter((it) => {
      const p = it.price ?? 0
      if (q) {
        if (it.kind === 'number') { if (!qd || !digits(it.value).includes(qd)) return false }
        else if (!it.value.toLowerCase().includes(q)) return false
      }
      if (it.kind === 'username' && len !== 'all') {
        const n = it.value.length
        if (len === '6' ? n < 6 : n !== Number(len)) return false
      }
      if (it.kind === 'number' && code !== 'all' && codeOf(it.value) !== code) return false
      if (lo !== null && p < lo) return false
      if (hi !== null && p > hi) return false
      if (only === 'mine' && it.owner_id !== me.id) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'price_asc') sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    else if (sort === 'price_desc') sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    else sorted.sort((a, b) => a.value.length - b.value.length)
    return sorted
  }, [tabItems, query, len, code, from, to, only, sort, me.id])

  const visibleGifts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const lo = from ? Number(from) : null
    const hi = to ? Number(to) : null
    const list = gifts.filter((g) => g.active
      && (!q || g.title.toLowerCase().includes(q))
      && (lo === null || g.price >= lo)
      && (hi === null || g.price <= hi))
    return sort === 'price_desc' ? list.sort((a, b) => b.price - a.price) : list.sort((a, b) => a.price - b.price)
  }, [gifts, query, from, to, sort])

  const activeGifts = gifts.filter((g) => g.active)
  const forSale = tab === 'gift' ? activeGifts.length : tabItems.length
  const prices = tab === 'gift' ? activeGifts.map((g) => g.price) : tabItems.map((i) => i.price ?? 0)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const myLots = tabItems.filter((i) => i.owner_id === me.id).length
  const sellable = mine.filter((i) => i.price === null)

  const applied = (it: MarketItem) => (it.kind === 'number' ? me.showcase_number === it.value : me.handles.includes(it.value))
  const myList = mineKind === 'gift' ? [] : mine.filter((i) => i.kind === mineKind)
  const giftById = new Map(gifts.map((g) => [g.id, g]))

  function openTab(t: Tab) {
    setTab(t); setQuery(''); setLen('all'); setCode('all'); setFrom(''); setTo(''); setOnly('all')
    if (t === 'gift' && sort === 'length') setSort('price_asc')
  }

  function priceChip(label: string, lo: string, hi: string) {
    const on = from === lo && to === hi
    return <button key={label} type="button" className={pill(on)} onClick={() => { setFrom(on ? '' : lo); setTo(on ? '' : hi) }}>{label}</button>
  }

  function buyButton(it: MarketItem) {
    const p = it.price ?? 0
    if (it.owner_id === me.id) {
      return <button type="button" className={bigBtn + 'bg-bg hover:brightness-125'} disabled={busy} onClick={() => void run(() => unlistItem(it.id))}>Снять с продажи</button>
    }
    if (stars < p) return <button type="button" className={bigBtn + 'bg-bg text-muted'} disabled>Не хватает</button>
    return <button type="button" className={bigBtn + 'bg-accent text-on-accent hover:brightness-110'} disabled={busy} onClick={() => void run(() => buyItem(it.id))}>Купить</button>
  }

  function renderItem(it: MarketItem) {
    const s = it.owner_id ? sellers[it.owner_id] : undefined
    const name = it.owner_id === me.id ? 'Вы' : (s?.display_name ?? 'Продавец')
    const p = it.price ?? 0
    if (layout === 'list') {
      return (
        <div key={it.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-base font-semibold">{show(it)}</div>
            <div className="flex items-center gap-1.5 truncate text-xs text-muted">
              <Avatar name={name} url={s?.avatar_url ?? null} size={16} />{name}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="text-accent" fill="currentColor" />{fmt(p)}</div>
          <div className="w-36 shrink-0">{buyButton(it)}</div>
        </div>
      )
    }
    return (
      <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl bg-surface">
        <div className="flex h-24 items-center justify-center px-3 text-center font-mono text-xl font-semibold break-all">{show(it)}</div>
        <div className="space-y-2 bg-bg2 p-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <Avatar name={name} url={s?.avatar_url ?? null} size={18} /><span className="truncate">{name}</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-base font-semibold"><Star size={15} className="text-accent" fill="currentColor" />{fmt(p)}</div>
          {buyButton(it)}
        </div>
      </div>
    )
  }

  function renderGift(g: Gift) {
    if (layout === 'list') {
      return (
        <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{g.title}</div>
            <div className="truncate text-xs text-muted">{g.description}</div>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="text-accent" fill="currentColor" />{fmt(g.price)}</div>
          <div className="w-36 shrink-0">
            {stars < g.price
              ? <button type="button" className={bigBtn + 'bg-bg text-muted'} disabled>Не хватает</button>
              : <button type="button" className={bigBtn + 'bg-accent text-on-accent hover:brightness-110'} disabled={busy} onClick={() => void run(() => buyGift(g.id))}>Купить</button>}
          </div>
        </div>
      )
    }
    return (
      <div key={g.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
        <GiftArt gift={g} />
        <div>
          <div className="font-medium">{g.title}</div>
          <div className="text-xs text-muted">{g.description}</div>
        </div>
        <div className="flex items-center justify-center gap-1 text-base font-semibold"><Star size={15} className="text-accent" fill="currentColor" />{fmt(g.price)}</div>
        {stars < g.price
          ? <button type="button" className={bigBtn + 'bg-bg text-muted'} disabled>Не хватает</button>
          : <button type="button" className={bigBtn + 'bg-accent text-on-accent hover:brightness-110'} disabled={busy} onClick={() => void run(() => buyGift(g.id))}>Купить</button>}
      </div>
    )
  }

  const info = INFO[tab]
  const TabIcon = tab === 'username' ? AtSign : tab === 'number' ? Phone : GiftIcon
  const shownCount = tab === 'gift' ? visibleGifts.length : visible.length

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Маркет</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5">
            <Star size={22} className="text-accent" fill="currentColor" />
            <div>
              <div className="text-lg font-semibold leading-tight">{fmt(stars)}</div>
              <div className="text-xs text-muted">Звёзды</div>
            </div>
          </div>
          <button type="button" className={chip(section === 'mine')} onClick={() => setSection(section === 'mine' ? 'market' : 'mine')}>
            {section === 'mine' ? 'К маркету' : 'Мои предметы'}
          </button>
          <button type="button" onClick={() => setSellOpen(true)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110">Выставить</button>
        </div>

        {error && <p className="text-sm text-pink">{error}</p>}

        {section === 'market' && (
          <>
            <div className="flex flex-wrap gap-2 rounded-2xl bg-surface p-1.5">
              {(['username', 'gift', 'number'] as Tab[]).map((t) => (
                <button key={t} type="button" onClick={() => openTab(t)}
                  className={'rounded-xl px-5 py-2 text-sm font-medium transition ' + (tab === t ? 'bg-bg text-text ring-1 ring-accent' : 'text-muted hover:text-text')}>
                  {INFO[t].title}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg"><TabIcon size={22} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{info.title}</div>
                <div className="text-sm text-muted">{info.text}</div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-xl bg-bg px-4 py-2 text-center"><div className="font-semibold">{fmt(forSale)}</div><div className="text-xs text-muted">в продаже</div></div>
                <div className="rounded-xl bg-bg px-4 py-2 text-center"><div className="font-semibold">{minPrice === null ? '—' : fmt(minPrice)}</div><div className="text-xs text-muted">от</div></div>
                {tab !== 'gift' && <div className="rounded-xl bg-bg px-4 py-2 text-center"><div className="font-semibold">{myLots}</div><div className="text-xs text-muted">мои лоты</div></div>}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent">
                  <Search size={16} className="text-muted" />
                  <input value={query} onChange={(e) => setQuery(e.target.value.slice(0, 40))}
                    placeholder={tab === 'username' ? 'Поиск по юзернейму' : tab === 'number' ? 'Поиск по номеру' : 'Поиск по подаркам'}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
                </div>

                <div className="space-y-4 rounded-2xl bg-surface p-4">
                  <div className="text-xs font-semibold tracking-wide text-muted uppercase">Фильтры</div>

                  {tab === 'username' && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Длина</div>
                      <div className="flex flex-wrap gap-2">
                        {(['all', '3', '4', '5', '6'] as const).map((l) => (
                          <button key={l} type="button" className={pill(len === l)} onClick={() => setLen(l)}>{l === 'all' ? 'Все' : l === '6' ? '6+' : l}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'number' && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Код</div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={pill(code === 'all')} onClick={() => setCode('all')}>Все</button>
                        {codes.map((c) => <button key={c} type="button" className={pill(code === c)} onClick={() => setCode(c)}>{'+' + c}</button>)}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Цена</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={from} inputMode="numeric" placeholder="от" className={inputCls}
                        onChange={(e) => setFrom(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                      <input value={to} inputMode="numeric" placeholder="до" className={inputCls}
                        onChange={(e) => setTo(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {priceChip('до 100', '', '100')}
                      {priceChip('до 500', '', '500')}
                      {priceChip('до 1 000', '', '1000')}
                      {priceChip('1 000+', '1000', '')}
                    </div>
                  </div>

                  {tab !== 'gift' && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Что показать</div>
                      <div className="flex gap-2">
                        <button type="button" className={pill(only === 'all')} onClick={() => setOnly('all')}>Все лоты</button>
                        <button type="button" className={pill(only === 'mine')} onClick={() => setOnly('mine')}>Мои лоты · {myLots}</button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              <section className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold">{info.all} <span className="text-sm font-normal text-muted">{shownCount}</span></h2>
                  <div className="flex-1" />
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                    className="rounded-xl bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent">
                    <option value="price_asc">Сначала дешёвые</option>
                    <option value="price_desc">Сначала дорогие</option>
                    {tab === 'username' && <option value="length">Сначала короткие</option>}
                  </select>
                  <div className="flex rounded-xl bg-surface p-1">
                    <button type="button" title="Список" onClick={() => setLayout('list')}
                      className={'rounded-lg p-2 transition ' + (layout === 'list' ? 'bg-bg text-text' : 'text-muted hover:text-text')}><List size={16} /></button>
                    <button type="button" title="Сетка" onClick={() => setLayout('grid')}
                      className={'rounded-lg p-2 transition ' + (layout === 'grid' ? 'bg-bg text-text' : 'text-muted hover:text-text')}><LayoutGrid size={16} /></button>
                  </div>
                </div>

                {shownCount === 0 && <p className="text-sm text-muted">Ничего не найдено. Измени фильтры или выстави свой лот.</p>}

                <div className={layout === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
                  {tab === 'gift' ? visibleGifts.map(renderGift) : visible.map(renderItem)}
                </div>
              </section>
            </div>
          </>
        )}

        {section === 'mine' && (
          <>
            <div className="flex flex-wrap gap-2">
              <button className={chip(mineKind === 'number')} onClick={() => setMineKind('number')}>Номера</button>
              <button className={chip(mineKind === 'username')} onClick={() => setMineKind('username')}>Юзернеймы</button>
              <button className={chip(mineKind === 'gift')} onClick={() => setMineKind('gift')}>Подарки</button>
            </div>

            {mineKind === 'username' && <p className="text-sm text-muted">В профиле: {me.handles.length} из 10</p>}
            {mineKind === 'gift' && ownedGifts.length === 0 && <p className="text-sm text-muted">Подарков пока нет. Загляни во вкладку «Подарки» маркета, а друзьям их можно дарить из окна информации о чате.</p>}
            {mineKind !== 'gift' && myList.length === 0 && <p className="text-sm text-muted">Здесь появятся купленные предметы.</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mineKind === 'gift' && ownedGifts.map((og) => {
                const g = giftById.get(og.gift_id)
                return (
                  <div key={og.id} className={card}>
                    {g && <GiftArt gift={g} />}
                    <div>
                      <div className="font-medium">{g?.title ?? 'Подарок'}</div>
                      <div className="text-xs text-muted">
                        {og.sender ? 'От ' + og.sender.display_name + ' · ' : ''}{new Date(og.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      {og.note && <div className="mt-1 text-xs">{og.note}</div>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {og.shown && <span className="text-xs text-accent">в профиле</span>}
                      <div className="flex-1" />
                      <button className={smallBtn} disabled={busy} onClick={() => void run(() => setGiftShown(og.id, !og.shown))}>
                        {og.shown ? 'Скрыть из профиля' : 'В профиль'}
                      </button>
                    </div>
                  </div>
                )
              })}

              {mineKind !== 'gift' && myList.map((it) => (
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
          </>
        )}

        <p className="text-xs text-muted">Номера и юзернеймы — украшения профиля. К регистрации и входу они не относятся.</p>
      </div>

      {sellOpen && (
        <SellModal items={sellable} busy={busy} error={error} onClose={() => setSellOpen(false)}
          onSell={(id, p) => void run(async () => { await listItem(id, p); setSellOpen(false) })} />
      )}
    </div>
  )
}
