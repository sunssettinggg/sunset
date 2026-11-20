import { ArrowRight, MessageCircle, Users, Radio, Sparkles } from 'lucide-react'

const features = [
  { icon: MessageCircle, title: 'Личные сообщения', text: 'Общайся с людьми в удобном интерфейсе и возвращайся к важным диалогам.' },
  { icon: Users, title: 'Группы', text: 'Создавай пространства для общения с друзьями и сообществами.' },
  { icon: Radio, title: 'Каналы', text: 'Публикуй новости и делись обновлениями с подписчиками.' },
  { icon: Sparkles, title: 'Персонализация', text: 'Настраивай оформление и делай Sunset комфортным для себя.' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b10] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <a href="/" className="flex items-center gap-3" aria-label="Sunset — главная">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#f29abf] text-lg font-black text-[#24121b]">s.</span>
          <span className="text-lg font-semibold tracking-tight">sunset</span>
        </a>
        <a href="/app" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:border-[#f29abf]/70 hover:text-white">
          Войти
        </a>
      </header>

      <section className="relative mx-auto grid min-h-[620px] max-w-6xl items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <div className="pointer-events-none absolute -left-40 top-10 size-[420px] rounded-full bg-[#b94f81]/15 blur-[110px]" />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f29abf]/25 bg-[#f29abf]/[0.07] px-4 py-2 text-xs font-medium tracking-wide text-[#f6b5d0]">
            <span className="size-1.5 rounded-full bg-[#f29abf]" /> МЕСТО ДЛЯ ТВОЕГО ОБЩЕНИЯ
          </div>
          <h1 className="max-w-xl text-6xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl lg:text-[88px]">
            Ближе, чем <span className="text-[#f29abf]">кажется.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-8 text-white/55 sm:text-lg">
            Sunset — пространство для личных диалогов, групп и каналов. Общайся, делись идеями и настраивай приложение под себя.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="/app" className="inline-flex items-center gap-3 rounded-full bg-[#f29abf] px-7 py-4 text-sm font-semibold text-[#24121b] transition hover:-translate-y-0.5 hover:bg-[#ffc3da]">
              Открыть Sunset <ArrowRight size={17} />
            </a>
            <a href="#features" className="rounded-full px-5 py-4 text-sm font-medium text-white/60 transition hover:text-white">Узнать больше</a>
          </div>
          <p className="mt-8 text-xs text-white/30">Открытая презентационная страница · Вход в приложение отдельно</p>
        </div>

        <div className="relative mx-auto w-full max-w-[470px]">
          <div className="absolute inset-8 rounded-[3rem] bg-[#e77eaa]/20 blur-3xl" />
          <div className="relative rotate-[2deg] rounded-[2.5rem] border border-white/10 bg-[#15151e] p-3 shadow-2xl shadow-black/50">
            <div className="rounded-[2rem] border border-white/[0.06] bg-[#101017] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                <div><p className="text-xs text-white/35">ТВОЁ ПРОСТРАНСТВО</p><p className="mt-1 text-lg font-semibold">Сообщения</p></div>
                <span className="grid size-10 place-items-center rounded-2xl bg-[#f29abf]/15 text-[#f29abf]"><MessageCircle size={19}/></span>
              </div>
              <div className="space-y-3 py-6">
                {[
                  ['M','Мои друзья','Новый разговор начинается здесь','bg-[#8f82c8]'],
                  ['S','Sunset community','Добро пожаловать в Sunset','bg-[#d77da3]'],
                  ['D','Дизайн и идеи','Поделись тем, что создаёшь','bg-[#729d9a]'],
                ].map(([letter,name,preview,color]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3.5">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-semibold text-white ${color}`}>{letter}</span>
                    <div className="min-w-0"><p className="text-sm font-medium">{name}</p><p className="mt-1 truncate text-xs text-white/40">{preview}</p></div>
                    <span className="ml-auto size-1.5 rounded-full bg-[#f29abf]" />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-gradient-to-r from-[#f29abf]/15 to-[#a66b9b]/10 p-4">
                <p className="text-xs font-medium text-[#f5b6d0]">SUNSET</p>
                <p className="mt-1 text-sm text-white/65">Общение в твоём ритме.</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-7 -left-5 rounded-2xl border border-white/10 bg-[#1a1922] p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-white/65"><Sparkles size={14} className="text-[#f29abf}"/> Твой стиль. Твои правила.</div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.25em] text-[#f29abf]">ВОЗМОЖНОСТИ</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Всё для общения. <span className="text-white/35">Без лишнего.</span></h2>
          <p className="mt-5 leading-7 text-white/45">Основные инструменты для общения и собственного пространства.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({icon: Icon,title,text}) => <article key={title} className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-[#f29abf]/30 hover:bg-white/[0.04]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f29abf]/10 text-[#f29abf]"><Icon size={20}/></span>
            <h3 className="mt-6 text-base font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/45">{text}</p>
          </article>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[2rem] border border-[#f29abf]/15 bg-gradient-to-br from-[#f29abf]/10 via-[#17141d] to-[#17141d] p-8 sm:p-12 md:flex-row md:items-center">
          <div><p className="text-xs font-semibold tracking-[0.2em] text-[#f29abf]">ТВОЙ SUNSET НАЧИНАЕТСЯ ЗДЕСЬ</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Загляни внутрь.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/45">Открой приложение и создай аккаунт, чтобы начать общаться.</p></div>
          <a href="/app" className="inline-flex shrink-0 items-center gap-3 rounded-full bg-[#f29abf] px-7 py-4 text-sm font-semibold text-[#24121b] transition hover:bg-[#ffc3da]">Начать <ArrowRight size={17}/></a>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {new Date().getFullYear()} Sunset. Создано для общения.</span>
          <a href="https://github.com/sunssettinggg/sunset" target="_blank" rel="noreferrer" className="transition hover:text-white/75">Исходный код на GitHub</a>
        </div>
      </footer>
    </main>
  )
}
