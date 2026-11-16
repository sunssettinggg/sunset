import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

interface Props { me: Profile; onProfileChanged: () => void }

interface FoundUser { id: string; username: string; display_name: string; avatar_url: string | null; verified: boolean }
interface UserInfo { stars: number | string; premium_until: string | null }
interface Gift { id: string; title: string; description: string; image_url: string; price: number | string; active: boolean }
interface Lot {
  id: string; kind: 'number' | 'username'; value: string
  owner_id: string | null; owner_username: string | null; price: number | string | null
}

const ERRORS: Record<string, string> = {
  forbidden: 'Нет прав администратора.',
  'user not found': 'Пользователь не найден.',
  'not enough stars': 'У пользователя меньше Звёзд, чем нужно списать.',
  'bad amount': 'Сумма должна быть целым числом от 1 до 1 000 000 000.',
  'gift not found': 'Такого подарка нет в каталоге.',
  'bad id': 'ID подарка: латиница в нижнем регистре, цифры и «_», от 2 до 40 символов.',
  'bad title': 'Укажите название подарка.',
  'bad image': 'Укажите ссылку на картинку.',
  'bad price': 'Цена должна быть целым числом от 1 до 1 000 000 000.',
  'bad kind': 'Неизвестный тип лота.',
  'bad value': 'Значение не подходит: для ника латиница, цифры и «_» (2–30 символов), для номера 2–30 символов.',
  'username taken': 'Этот ник уже занят обычным пользователем.',
  'already exists': 'Такой лот уже есть.',
  'item not platform-owned': 'Лот не найден или принадлежит пользователю, им управляет владелец.',
}

function explain(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? ''
  return ERRORS[msg] ?? (msg || 'Не удалось выполнить действие.')
}

async function call(fn: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}

const field = 'w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-accent'
const btn = 'rounded-xl bg-surface px-3 py-2 text-sm transition hover:brightness-125 disabled:opacity-50'
const primary = 'sunset-gradient rounded-xl px-4 py-2 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:opacity-50'
const danger = 'rounded-xl px-3 py-2 text-sm text-pink transition hover:bg-surface disabled:opacity-50'
const card = 'space-y-3 rounded-2xl bg-bg2 p-4 ring-1 ring-line'

interface Notice { ok: boolean; text: string }

// Одно действие за раз: пока идёт запрос, повторные нажатия игнорируются.
function useRunner() {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const lock = useRef(false)
  const run = useCallback(async (fn: () => Promise<void>, okText: string): Promise<boolean> => {
    if (lock.current) return false
    lock.current = true
    setBusy(true); setNotice(null)
    try { await fn(); setNotice({ ok: true, text: okText }); return true }
    catch (e) { setNotice({ ok: false, text: explain(e) }); return false }
    finally { lock.current = false; setBusy(false) }
  }, [])
  return { busy, notice, setNotice, run }
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null
  return <p role="status" className={`text-sm ${notice.ok ? 'text-accent' : 'text-pink'}`}>{notice.text}</p>
}

function Mini({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
  return (
    <div className="sunset-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-on-accent">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

// ============ Пользователи ============
function UsersTab({ me, onProfileChanged }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoundUser[]>([])
  const [selected, setSelected] = useState<FoundUser | null>(null)
  const [info, setInfo] = useState<UserInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [gifts, setGifts] = useState<Gift[]>([])
  const [giftId, setGiftId] = useState('')
  const { busy, notice, setNotice, run } = useRunner()

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    let active = true
    const t = setTimeout(() => {
      call('admin_find_user', { p_query: q })
        .then((d) => { if (active) setResults((d ?? []) as FoundUser[]) })
        .catch((e) => { if (active) setNotice({ ok: false, text: explain(e) }) })
    }, 250)
    return () => { active = false; clearTimeout(t) }
  }, [query, setNotice])

  useEffect(() => {
    void supabase.from('gifts').select('id, title, description, image_url, price, active').eq('active', true)
      .then(({ data }) => setGifts((data ?? []) as Gift[]))
  }, [])

  async function pick(u: FoundUser) {
    setSelected(u); setInfo(null); setAmount(''); setNotice(null)
    try {
      const rows = (await call('admin_user_info', { p_user: u.id })) as UserInfo[] | null
      setInfo(rows?.[0] ?? null)
    } catch (e) { setNotice({ ok: false, text: explain(e) }) }
  }

  async function toggleVerified() {
    if (!selected) return
    const next = !selected.verified
    if (!window.confirm(`${next ? 'Выдать' : 'Снять'} галочку: @${selected.username}?`)) return
    const ok = await run(
      async () => { await call('admin_set_verified', { p_user: selected.id, p_value: next }) },
      next ? 'Галочка выдана.' : 'Галочка снята.',
    )
    if (!ok) return
    const updated = { ...selected, verified: next }
    setSelected(updated)
    setResults((r) => r.map((x) => (x.id === updated.id ? updated : x)))
    if (updated.id === me.id) onProfileChanged()
  }

  async function changeStars(sign: 1 | -1) {
    if (!selected) return
    const n = Number(amount)
    if (!Number.isSafeInteger(n) || n <= 0 || n > 1_000_000_000) { setNotice({ ok: false, text: ERRORS['bad amount'] }); return }
    if (!window.confirm(`${sign > 0 ? 'Выдать' : 'Списать'} ${n} ⭐: @${selected.username}?`)) return
    const out: { balance: number | null } = { balance: null }
    const ok = await run(
      async () => { out.balance = Number(await call('admin_grant_stars', { p_user: selected.id, p_amount: sign * n })) },
      sign > 0 ? 'Звёзды выданы.' : 'Звёзды списаны.',
    )
    if (ok && out.balance !== null) {
      const balance = out.balance
      setInfo((i) => ({ premium_until: i?.premium_until ?? null, stars: balance }))
      setAmount('')
    }
  }

  async function grantGift() {
    if (!selected || !giftId) return
    const g = gifts.find((x) => x.id === giftId)
    if (!window.confirm(`Выдать подарок «${g?.title ?? giftId}»: @${selected.username}?`)) return
    await run(async () => { await call('admin_grant_gift', { p_user: selected.id, p_gift: giftId }) }, 'Подарок выдан.')
  }

  const premium = info?.premium_until && Date.parse(info.premium_until) > Date.now() ? new Date(info.premium_until) : null

  return (
    <div className="space-y-4">
      <div className={card}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти по нику (регистр не важен)" className={field} />
        {query.trim() && results.length === 0 && <p className="text-sm text-muted">Никого не найдено.</p>}
        <div className="space-y-1">
          {results.map((u) => (
            <button key={u.id} onClick={() => void pick(u)}
              className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface ${selected?.id === u.id ? 'bg-surface' : ''}`}>
              <Mini name={u.display_name} url={u.avatar_url} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.display_name}{u.verified ? ' ✓' : ''}</div>
                <div className="truncate text-xs text-muted">@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className={card}>
          <div className="flex items-center gap-3">
            <Mini name={selected.display_name} url={selected.avatar_url} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{selected.display_name}</div>
              <div className="truncate text-xs text-muted">@{selected.username}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="text-sm">Галочка: {selected.verified ? 'есть' : 'нет'}</div>
            <button onClick={() => void toggleVerified()} disabled={busy} className={btn}>
              {selected.verified ? 'Снять галочку' : 'Выдать галочку'}
            </button>
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="text-sm">Звёзды: {info ? Number(info.stars).toLocaleString('ru-RU') : '…'} ⭐</div>
            <div className="flex gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
                placeholder="Сумма" className={field} />
              <button onClick={() => void changeStars(1)} disabled={busy} className={btn}>Выдать</button>
              <button onClick={() => void changeStars(-1)} disabled={busy} className={danger}>Списать</button>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="text-sm">Подарок из каталога</div>
            <div className="flex gap-2">
              <select value={giftId} onChange={(e) => setGiftId(e.target.value)} className={field}>
                <option value="">Выберите подарок</option>
                {gifts.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <button onClick={() => void grantGift()} disabled={busy || !giftId} className={btn}>Подарить</button>
            </div>
          </div>

          <div className="border-t border-line pt-3 text-sm">
            Premium: {premium ? `до ${premium.toLocaleDateString('ru-RU')}` : 'нет'}
            <span className="ml-2 text-xs text-muted">выдача Premium пока через SQL</span>
          </div>
        </div>
      )}
      <NoticeLine notice={notice} />
    </div>
  )
}

// ============ Подарки ============
interface GiftForm { id: string; title: string; description: string; image_url: string; price: string; active: boolean; isNew: boolean }
const EMPTY_GIFT: GiftForm = { id: '', title: '', description: '', image_url: '', price: '', active: true, isNew: true }

function GiftsTab() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [form, setForm] = useState<GiftForm>(EMPTY_GIFT)
  const { busy, notice, setNotice, run } = useRunner()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('gifts')
      .select('id, title, description, image_url, price, active').order('created_at', { ascending: false })
    if (error) setNotice({ ok: false, text: explain(error) })
    else setGifts((data ?? []) as Gift[])
  }, [setNotice])
  useEffect(() => { void load() }, [load])

  const upsert = (g: { id: string; title: string; description: string; image_url: string; price: number; active: boolean }) =>
    call('admin_upsert_gift', {
      p_id: g.id, p_title: g.title, p_description: g.description, p_image_url: g.image_url, p_price: g.price, p_active: g.active,
    })

  async function save() {
    const price = Number(form.price)
    if (!Number.isSafeInteger(price) || price < 1) { setNotice({ ok: false, text: ERRORS['bad price'] }); return }
    if (!form.isNew && !window.confirm(`Сохранить изменения подарка «${form.title}»? Цена изменится и у уже полученных подарков.`)) return
    const ok = await run(async () => {
      await upsert({ id: form.id.trim(), title: form.title, description: form.description, image_url: form.image_url, price, active: form.active })
    }, form.isNew ? 'Подарок добавлен.' : 'Подарок сохранён.')
    if (ok) { setForm(EMPTY_GIFT); await load() }
  }

  async function toggleActive(g: Gift) {
    const next = !g.active
    if (!window.confirm(`${next ? 'Вернуть в продажу' : 'Снять с продажи'}: «${g.title}»?`)) return
    const ok = await run(async () => {
      await upsert({ id: g.id, title: g.title, description: g.description, image_url: g.image_url, price: Number(g.price), active: next })
    }, next ? 'Подарок в продаже.' : 'Подарок снят с продажи.')
    if (ok) await load()
  }

  function edit(g: Gift) {
    setNotice(null)
    setForm({ id: g.id, title: g.title, description: g.description, image_url: g.image_url, price: String(g.price), active: g.active, isNew: false })
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="text-sm font-medium">{form.isNew ? 'Новый подарок' : `Редактирование: ${form.id}`}</div>
        <input value={form.id} disabled={!form.isNew} onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="ID (например, sunset_spring)" className={`${field} disabled:opacity-60`} />
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название" className={field} />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Описание" className={`${field} h-20 resize-none`} />
        <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="Картинка (например, /gifts/sunset-spring.webp)" className={field} />
        <div className="flex items-center gap-3">
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })}
            inputMode="numeric" placeholder="Цена в Звёздах" className={field} />
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> В продаже
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void save()} disabled={busy} className={primary}>{form.isNew ? 'Добавить' : 'Сохранить'}</button>
          {!form.isNew && <button onClick={() => setForm(EMPTY_GIFT)} className={btn}>Отмена</button>}
        </div>
        <NoticeLine notice={notice} />
      </div>

      <div className="space-y-2">
        {gifts.length === 0 && <p className="text-sm text-muted">Каталог пуст.</p>}
        {gifts.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-bg2 p-3 ring-1 ring-line">
            <img src={g.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{g.title}</div>
              <div className="truncate text-xs text-muted">{g.id} · {Number(g.price).toLocaleString('ru-RU')} ⭐ · {g.active ? 'в продаже' : 'снят'}</div>
            </div>
            <button onClick={() => edit(g)} className={btn}>Изменить</button>
            <button onClick={() => void toggleActive(g)} disabled={busy} className={g.active ? danger : btn}>
              {g.active ? 'Снять' : 'Вернуть'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Маркет ============
function LotRow({ lot, busy, onPrice, onDelete }: {
  lot: Lot; busy: boolean
  onPrice: (lot: Lot, price: number | null) => void
  onDelete: (lot: Lot) => void
}) {
  const [price, setPrice] = useState(lot.price === null ? '' : String(lot.price))
  const platform = lot.owner_id === null
  return (
    <div className="space-y-2 rounded-2xl bg-bg2 p-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{lot.kind === 'username' ? '@' : ''}{lot.value}</div>
          <div className="truncate text-xs text-muted">
            {lot.kind === 'username' ? 'ник' : 'номер'} · {platform ? 'платформа' : `владелец @${lot.owner_username ?? '?'}`} ·{' '}
            {lot.price === null ? 'не продаётся' : `${Number(lot.price).toLocaleString('ru-RU')} ⭐`}
          </div>
        </div>
      </div>
      {platform && (
        <div className="flex gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Цена" className={field} />
          <button disabled={busy || !price} onClick={() => onPrice(lot, Number(price))} className={btn}>Цена</button>
          <button disabled={busy || lot.price === null} onClick={() => onPrice(lot, null)} className={btn}>Снять</button>
          <button disabled={busy} onClick={() => onDelete(lot)} className={danger}>Удалить</button>
        </div>
      )}
    </div>
  )
}

function MarketTab() {
  const [lots, setLots] = useState<Lot[]>([])
  const [kind, setKind] = useState<'username' | 'number'>('username')
  const [value, setValue] = useState('')
  const [price, setPrice] = useState('')
  const { busy, notice, setNotice, run } = useRunner()

  const load = useCallback(async () => {
    try { setLots(((await call('admin_market_list')) ?? []) as Lot[]) }
    catch (e) { setNotice({ ok: false, text: explain(e) }) }
  }, [setNotice])
  useEffect(() => { void load() }, [load])

  async function create() {
    const p = Number(price)
    if (!Number.isSafeInteger(p) || p < 1) { setNotice({ ok: false, text: ERRORS['bad price'] }); return }
    if (!window.confirm(`Добавить лот «${value.trim()}» за ${p} ⭐?`)) return
    const ok = await run(async () => { await call('admin_market_create', { p_kind: kind, p_value: value, p_price: p }) }, 'Лот добавлен.')
    if (ok) { setValue(''); setPrice(''); await load() }
  }

  async function setLotPrice(lot: Lot, p: number | null) {
    const text = p === null ? `Снять с продажи «${lot.value}»?` : `Поставить цену ${p} ⭐ на «${lot.value}»?`
    if (!window.confirm(text)) return
    const ok = await run(async () => { await call('admin_market_set_price', { p_item: lot.id, p_price: p }) },
      p === null ? 'Лот снят с продажи.' : 'Цена обновлена.')
    if (ok) await load()
  }

  async function removeLot(lot: Lot) {
    if (!window.confirm(`Удалить лот «${lot.value}» безвозвратно?`)) return
    const ok = await run(async () => { await call('admin_market_delete', { p_item: lot.id }) }, 'Лот удалён.')
    if (ok) await load()
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="text-sm font-medium">Новый лот платформы</div>
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as 'username' | 'number')} className={`${field} !w-32 shrink-0`}>
            <option value="username">Ник</option>
            <option value="number">Номер</option>
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} className={field}
            placeholder={kind === 'username' ? 'ник без @' : '+888 1137 0000'} />
        </div>
        <div className="flex gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Цена в Звёздах" className={field} />
          <button onClick={() => void create()} disabled={busy} className={primary}>Добавить</button>
        </div>
        <NoticeLine notice={notice} />
      </div>
      <div className="space-y-2">
        {lots.length === 0 && <p className="text-sm text-muted">Лотов пока нет.</p>}
        {lots.map((l) => (
          <LotRow key={`${l.id}:${l.price ?? 'x'}`} lot={l} busy={busy} onPrice={(lot, p) => void setLotPrice(lot, p)} onDelete={(lot) => void removeLot(lot)} />
        ))}
      </div>
    </div>
  )
}

// ============ Страница ============
type Tab = 'users' | 'gifts' | 'market'
const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Пользователи' },
  { id: 'gifts', label: 'Подарки' },
  { id: 'market', label: 'Маркет' },
]

export default function AdminPage({ me, onProfileChanged }: Props) {
  const [tab, setTab] = useState<Tab>('users')
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h1 className="mr-3 text-lg font-semibold">Админка</h1>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-1.5 text-sm transition ${tab === t.id ? 'bg-surface text-accent' : 'text-muted hover:bg-surface hover:text-text'}`}>
            {t.label}
          </button>
        ))}
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl">
          {tab === 'users' && <UsersTab me={me} onProfileChanged={onProfileChanged} />}
          {tab === 'gifts' && <GiftsTab />}
          {tab === 'market' && <MarketTab />}
        </div>
      </div>
    </section>
  )
}
