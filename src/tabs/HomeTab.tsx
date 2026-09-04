import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { getDailyNews, getWorkerOfWeek } from '../lib/workers'
import { useApp } from '../context/AppContext'

type Tab = 'applications' | 'predictions' | 'articles' | 'secret' | 'fludilka' | 'tests' | 'newSection'

type Banner = { id: Tab; src: string; alt: string }

const banners: Banner[] = [
  { id: 'predictions', src: '/banner-predictions.webp', alt: 'Предсказания' },
  { id: 'secret', src: '/banner-secret.webp', alt: 'Секретная комната' },
]

function BannerButton({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-neon/60"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
    >
      <img
        src={src}
        alt={alt}
        className="block aspect-square h-auto w-full object-contain transition duration-300 group-hover:brightness-110"
      />
    </button>
  )
}

function msUntilNextMidnight(): number {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  return tomorrow.getTime() - Date.now()
}

function msUntilNextMonday(): number {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() + (7 - day))
  monday.setHours(0, 0, 0, 0)
  return monday.getTime() - now.getTime()
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}д ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function useCountdown(getMs: () => number): string {
  const [remaining, setRemaining] = useState(getMs)
  useEffect(() => {
    const tick = (): void => setRemaining(getMs())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [getMs])
  return formatCountdown(remaining)
}

export default function HomeTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { workers, currentUser, logout } = useApp()

  const newsCountdown = useCountdown(msUntilNextMidnight)
  const workerCountdown = useCountdown(msUntilNextMonday)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [newChatMessages, setNewChatMessages] = useState(5)

  return (
    <div className="relative mx-auto max-w-md px-5 pb-8 pt-12">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] text-neon">АМАЛЬГАМА</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">Главная</h1>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => setLogoutOpen(true)}
              className="max-w-[140px] truncate rounded-full border border-neon/40 bg-neon/10 px-3 py-1.5 text-xs font-bold text-neon transition-transform active:scale-95"
              title="Сменить пользователя"
            >
              {currentUser.name}
            </button>
          )}
          <img src="/app-icon.webp" alt="" className="h-11 w-11 rounded-full border border-neon/40 object-cover" />
        </div>
      </header>
{logoutOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
    <div className="w-full max-w-sm rounded-2xl border border-neon/40 bg-black/90 p-5 text-center">

      <p className="text-lg font-black text-ink">
        Выйти из аккаунта?
      </p>

      <p className="mt-2 text-sm text-ink-muted">
        Вам нужно будет заново выбрать ФИО
      </p>

      <div className="mt-5 flex gap-3">

        <button
          onClick={() => setLogoutOpen(false)}
          className="flex-1 rounded-xl border border-line bg-input py-3 text-sm font-bold text-ink"
        >
          ОТМЕНА
        </button>

        <button
          onClick={() => {
            logout()
            setLogoutOpen(false)
          }}
          className="flex-1 rounded-xl bg-neon py-3 text-sm font-black text-bg"
        >
          ВЫЙТИ
        </button>

      </div>

    </div>
  </div>
)}
      <div className="mb-3 flex items-start gap-3 rounded-2xl border border-neon/30 bg-neon/5 p-3 backdrop-blur-md" style={{ boxShadow: '0 0 22px rgba(0,229,255,0.12)' }}>
        <Bell size={16} className="mt-0.5 shrink-0 text-neon" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-neon">НОВОСТЬ ДНЯ</p>
          <p className="mt-1 text-sm font-bold leading-snug text-ink" style={{ textShadow: '0 0 10px rgba(0,229,255,0.35)' }}>{getDailyNews(new Date(), workers)}</p>
          <p className="mt-1 text-[9px] font-bold tracking-widest text-neon/60">ОБНОВИТСЯ ЧЕРЕЗ <span className="font-mono text-neon/90">{newsCountdown}</span></p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-3 backdrop-blur-md" style={{ boxShadow: '0 0 22px rgba(255,43,214,0.12)' }}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-amber-300" style={{ textShadow: '0 0 14px rgba(255,215,0,0.9), 0 0 28px rgba(255,191,0,0.6)' }}>🏆 ЛУЧШИЙ РАБОТНИК НЕДЕЛИ</p>
          <p className="mt-1 text-sm font-bold leading-snug text-amber-200" style={{ textShadow: '0 0 12px rgba(255,236,150,0.95), 0 0 24px rgba(255,215,0,0.7)' }}>{getWorkerOfWeek(new Date(), workers)}</p>
          <p className="mt-1 text-[9px] font-bold tracking-widest text-amber-300/60">ОБНОВИТСЯ ЧЕРЕЗ <span className="font-mono text-amber-300/90">{workerCountdown}</span></p>
        </div>
      </div>

      <button
        onClick={() => onNavigate('fludilka')}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-neon/40 bg-black/50 py-2.5 text-sm font-extrabold text-neon backdrop-blur-md transition-transform active:scale-[0.97]"
        style={{ boxShadow: '0 0 16px rgba(0,229,255,0.18)' }}
      >
   <span className="flex flex-col items-center">
  <span>
    💬 ФЛУДИЛКА
  </span>

  {newChatMessages > 0 && (
    <span
      className="
        mt-1
        text-[9px]
        font-black
        uppercase
        tracking-widest
        text-red-400
        drop-shadow-[0_0_8px_rgba(255,0,0,0.7)]
        animate-pulse
      "
    >
      новые сообщения
    </span>
  )}
</span>
      </button>

      <div className="space-y-4">
        <BannerButton src="/banner-tests.webp" alt="Тесты" onClick={() => onNavigate('tests')} />
        <BannerButton src="/banner-new-section.webp" alt="Игровая комната" onClick={() => onNavigate('newSection')} />
        {banners.map((banner) => (
          <BannerButton key={banner.id} src={banner.src} alt={banner.alt} onClick={() => onNavigate(banner.id)} />
        ))}
      </div>
    </div>
  )
}
