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
  const { workers, currentUser, switchUser } = useApp()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleGameRoomClick = () => {
    setPasswordInput('')
    setPasswordError('')
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === '3010') {
      setShowPasswordModal(false)
      setPasswordInput('')
      setPasswordError('')
      onNavigate('newSection')
    } else {
      setPasswordError('Неверный пароль')
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordInput('')
    setPasswordError('')
  }

  const newsCountdown = useCountdown(msUntilNextMidnight)
  const workerCountdown = useCountdown(msUntilNextMonday)

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
              onClick={switchUser}
              className="max-w-[140px] truncate rounded-full border border-neon/40 bg-neon/10 px-3 py-1.5 text-xs font-bold text-neon transition-transform active:scale-95"
              title="Сменить пользователя"
            >
              {currentUser.name}
            </button>
          )}
          <img src="/app-icon.webp" alt="" className="h-11 w-11 rounded-full border border-neon/40 object-cover" />
        </div>
      </header>

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
        💬 ФЛУДИЛКА
      </button>

      <div className="space-y-4">
        <BannerButton src="/banner-tests.webp" alt="Тесты" onClick={() => onNavigate('tests')} />
        <div className="relative">
          <BannerButton src="/banner-new-section.webp" alt="Игровая комната" onClick={handleGameRoomClick} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
            <span
              className="rounded-lg border border-neon/50 bg-black/50 px-4 py-2 text-sm font-black tracking-widest text-neon backdrop-blur-sm"
              style={{ textShadow: '0 0 12px rgba(0,229,255,0.6)', boxShadow: '0 0 20px rgba(0,229,255,0.2)' }}
            >
              В РАЗРАБОТКЕ
            </span>
          </div>
        </div>
        {banners.map((banner) => (
          <BannerButton key={banner.id} src={banner.src} alt={banner.alt} onClick={() => onNavigate(banner.id)} />
        ))}
      </div>

      {/* Password modal for Game Room */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
          onClick={closePasswordModal}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-neon/30 bg-card p-5"
            style={{ boxShadow: '0 0 24px rgba(0,229,255,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-center text-base font-extrabold text-ink">Игровая комната</h3>
            <p className="mb-4 text-center text-xs text-ink-muted">Раздел находится в разработке</p>

            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
              placeholder="Введите пароль"
              className="mb-3 w-full rounded-xl border border-line/40 bg-black/30 px-3 py-2.5 text-center text-sm font-bold text-ink placeholder:text-ink-muted/50 focus:border-neon/50 focus:outline-none"
            />

            {passwordError && (
              <p className="mb-3 text-center text-xs font-bold text-error">{passwordError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={closePasswordModal}
                className="flex-1 rounded-xl border border-line/40 bg-black/20 py-2.5 text-sm font-bold text-ink-muted transition active:scale-95 hover:text-ink"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 rounded-xl bg-neon py-2.5 text-sm font-extrabold text-black transition active:scale-95"
                style={{ boxShadow: '0 0 14px rgba(0,229,255,0.3)' }}
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
