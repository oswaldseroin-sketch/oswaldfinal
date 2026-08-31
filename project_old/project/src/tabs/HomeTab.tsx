import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { getDailyNews, getWorkerOfWeek } from '../lib/workers'
import TeamLifePanel from '../components/TeamLifePanel'
import GamePanel from '../components/GamePanel'
import SwipeBack from '../components/SwipeBack'
import { useApp } from '../context/AppContext'

type Tab = 'applications' | 'predictions' | 'articles' | 'secret' | 'fludilka' | 'team'

type Banner = { id: Tab; src: string; alt: string }

const banners: Banner[] = [
  { id: 'applications', src: '/banner-zayavki.webp', alt: 'Заявки' },
  { id: 'predictions', src: '/banner-predictions.webp', alt: 'Предсказания' },
  { id: 'articles', src: '/banner-articles.webp', alt: 'Статьи' },
  { id: 'secret', src: '/banner-secret.webp', alt: 'Секретная комната' },
  { id: 'team', src: '/banner-team.webp', alt: 'Командный режим' },
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
  const [showTeamLife, setShowTeamLife] = useState(false)
  const [showNewPanel, setShowNewPanel] = useState(false)
  const [newPanelFade, setNewPanelFade] = useState(false)
  const [homeDimmed, setHomeDimmed] = useState(false)

  const openTeamLife = () => {
    setShowTeamLife(true)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
  }

  const closeTeamLife = () => {
    setShowTeamLife(false)
  }

  const openNewPanel = () => {
    setHomeDimmed(true)
    setTimeout(() => {
      setShowNewPanel(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNewPanelFade(true)
        })
      })
    }, 250)
  }

  const closeNewPanel = () => {
    setNewPanelFade(false)
    setTimeout(() => {
      setShowNewPanel(false)
      setHomeDimmed(false)
    }, 250)
  }

  const { workers } = useApp()
  const newsCountdown = useCountdown(msUntilNextMidnight)
  const workerCountdown = useCountdown(msUntilNextMonday)

  if (showNewPanel) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black"
          style={{ opacity: homeDimmed ? 0.6 : 0, transition: 'opacity 250ms ease-out' }}
        />
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{
            opacity: newPanelFade ? 1 : 0,
            transition: 'opacity 250ms ease-out',
          }}
        >
          <div
            className="mx-auto max-w-md"
            style={{
              backgroundImage: 'url(/new-panel-inner.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              minHeight: '100dvh',
            }}
          >
            <div className="relative z-10 px-5 pb-8 pt-12">
              <GamePanel onBack={closeNewPanel} />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (showTeamLife) {
    return (
      <SwipeBack onBack={closeTeamLife} innerClassName="mx-auto max-w-md px-5 pb-8 pt-12">
        <button
          onClick={() => setShowTeamLife(false)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          ← Назад
        </button>
        <TeamLifePanel />
      </SwipeBack>
    )
  }

  return (
    <div className="relative mx-auto max-w-md px-5 pb-8 pt-12">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.25em] text-neon">АМАЛЬГАМА</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">Главная</h1>
        </div>
        <img src="/app-icon.webp" alt="" className="h-11 w-11 rounded-full border border-neon/40 object-cover" />
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
        <BannerButton src="/banner-zayavki.webp" alt="Заявки" onClick={() => onNavigate('applications')} />
        <BannerButton src="/banner-team-life.webp" alt="Панель жизни команды" onClick={() => setShowTeamLife(true)} />
        <BannerButton src="/banner-new-panel.webp" alt="Новая панель" onClick={openNewPanel} />
        {banners.slice(1).map((banner) => (
          <BannerButton key={banner.id} src={banner.src} alt={banner.alt} onClick={() => onNavigate(banner.id)} />
        ))}
      </div>

    </div>
  )
}
