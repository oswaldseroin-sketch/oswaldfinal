import SwipeBack from '../components/SwipeBack'

type Props = {
  onOpenApplications: () => void
  onOpenArticles: () => void
  onOpenTests: () => void
  onOpenAdmin: () => void
  onOpenNumbers: () => void
  onBack: () => void
}

export default function TestsTab({ onOpenApplications, onOpenArticles, onOpenTests, onOpenAdmin, onOpenNumbers, onBack }: Props) {
  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-3 pb-10 pt-10">
      

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenApplications}
          className="group relative overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-zayavki.webp"
            alt="Заявки"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>

        <button
          onClick={onOpenArticles}
          className="group relative overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-articles.webp"
            alt="Статьи"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>

        <button
          onClick={onOpenTests}
          className="group relative overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-tests-card.webp"
            alt="Тесты"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>

        <button
          onClick={onOpenNumbers}
          className="group relative overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-numbers.webp"
            alt="Числа"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onOpenAdmin}
          className="rounded-xl border border-neon/30 bg-card/60 px-6 py-3 text-sm font-extrabold text-neon backdrop-blur-md transition hover:bg-neon/15 active:scale-[0.97]"
          style={{ boxShadow: '0 0 12px rgba(0,229,255,0.1)' }}
        >
          Админ-панель
        </button>
      </div>
    </SwipeBack>
  )
}
