import { useCallback, useEffect, useState } from 'react'
import { Coins, Check } from 'lucide-react'
import { api, type MiniGameProfile, type MiniGameProgress } from '../lib/api'
import { getLevelInfo, MINI_GAMES } from '../lib/miniGames'
import { getTitleInfo, isMaxTitle } from '../lib/titles'
import { useApp } from '../context/AppContext'
import { getItem, setItem } from '../lib/storage'
import DailyPollGame from './DailyPollGame'
import WhoOfThemGame from './games/WhoOfThemGame'
import WouldHeDoItGame from './games/WouldHeDoItGame'
import PastLifeGame from './games/PastLifeGame'
import BestDuoGame from './games/BestDuoGame'
import RatePlayerGame from './games/RatePlayerGame'
import MafiaGame from './games/MafiaGame'
import YesNoGame from './games/YesNoGame'
import SecretLoveGame from './games/SecretLoveGame'
import RouletteGame from './games/RouletteGame'

type Props = { onBack: () => void }

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCompletedKey(playerId: string): string {
  return `gameroom-completed-${playerId}`
}

type CompletedToday = Record<string, string>

function getCompletedToday(playerId: string): CompletedToday {
  const key = getCompletedKey(playerId)
  const data = getItem<Record<string, string>>(key, {})
  const today = todayKey()
  const result: CompletedToday = {}
  for (const [gameNum, date] of Object.entries(data)) {
    if (date === today) {
      result[gameNum] = date
    }
  }
  return result
}

function markCompleted(playerId: string, gameNumber: number): void {
  const key = getCompletedKey(playerId)
  const data = getItem<Record<string, string>>(key, {})
  data[String(gameNumber)] = todayKey()
  setItem(key, data)
}

export default function MiniGamesPanel({ onBack }: Props) {
  const { currentUser } = useApp()
  const playerId = currentUser?.id ?? 'unknown'
  const [profile, setProfile] = useState<MiniGameProfile | null>(null)
  const [progress, setProgress] = useState<MiniGameProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<number | null>(null)
  const [titlePopup, setTitlePopup] = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState<CompletedToday>(() => getCompletedToday(playerId))

  useEffect(() => {
    setCompletedToday(getCompletedToday(playerId))
  }, [playerId])

  const loadData = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getMiniGameData(currentUser.id)
      setProfile((prev) => {
        if (prev && data.profile.titleLevel > prev.titleLevel) {
          setTitlePopup(data.profile.title)
        }
        return data.profile
      })
      setProgress(data.progress)
    } catch {
      // Profile unavailable — games still work without it
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadData() }, [loadData])

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getMiniGameData(currentUser.id)
      setProfile((prev) => {
        if (prev && data.profile.titleLevel > prev.titleLevel) {
          setTitlePopup(data.profile.title)
        }
        return data.profile
      })
      setProgress(data.progress)
    } catch {
      // silent
    }
  }, [currentUser])

  const handleGameComplete = useCallback(async (gameNumber: number) => {
    markCompleted(playerId, gameNumber)
    setCompletedToday(getCompletedToday(playerId))
    await refreshProfile()
  }, [playerId, refreshProfile])

  // -- Game screen --
  if (selectedGame !== null) {
    const handleBack = () => {
      setSelectedGame(null)
      setCompletedToday(getCompletedToday(playerId))
    }

    if (selectedGame === 1) {
      return <DailyPollGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(1)} />
    }
    if (selectedGame === 2) {
      return <WhoOfThemGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(2)} />
    }
    if (selectedGame === 3) {
      return <WouldHeDoItGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(3)} />
    }
    if (selectedGame === 4) {
      return <PastLifeGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(4)} />
    }
    if (selectedGame === 5) {
      return <BestDuoGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(5)} />
    }
    if (selectedGame === 6) {
      return <RatePlayerGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(6)} />
    }
    if (selectedGame === 7) {
      return <MafiaGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(7)} />
    }
    if (selectedGame === 8) {
      return <YesNoGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(8)} />
    }
    if (selectedGame === 9) {
      return <SecretLoveGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(9)} />
    }
    if (selectedGame === 10) {
      return <RouletteGame onBack={handleBack} onProfileUpdate={() => void handleGameComplete(10)} />
    }
  }

  // -- Main panel --
  const levelInfo = profile
  ? getLevelInfo(profile.xp, profile.level)
  : null
  const titleInfo = profile ? getTitleInfo(profile.titleXp) : null

  return (
    <div
      className="relative mx-auto min-h-screen max-w-md px-4 pb-10 pt-6"
      style={{
        backgroundImage: 'url(/gameroom-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="pointer-events-none fixed inset-0 bg-black/40" />

      <div className="relative z-10">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          ← Назад
        </button>

        {/* Title level-up popup */}
        {titlePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTitlePopup(null)}>
            <div className="mx-4 max-w-sm rounded-2xl border border-accent/50 bg-card/90 p-6 text-center backdrop-blur-md" style={{ boxShadow: '0 0 30px rgba(255,43,214,0.3)' }} onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] font-bold tracking-widest text-accent">НОВОЕ ЗВАНИЕ</p>
              <p className="mt-3 text-xl font-extrabold text-ink" style={{ textShadow: '0 0 12px rgba(255,43,214,0.4)' }}>{titlePopup}</p>
              <button onClick={() => setTitlePopup(null)} className="mt-4 rounded-xl bg-accent px-6 py-2 text-sm font-extrabold text-white transition active:scale-95">
                Отлично!
              </button>
            </div>
          </div>
        )}

        {/* Profile card */}
        {loading ? (
          <div className="py-6 text-center text-sm text-ink-muted">Загрузка профиля...</div>
        ) : !profile ? (
          <div className="mb-5 rounded-2xl border border-error/30 bg-error/10 p-4 text-center backdrop-blur-md">
            <p className="text-sm font-bold text-error">Профиль не найден</p>
            <p className="mt-1 text-xs text-ink-muted">Игрок «{currentUser?.name}» не зарегистрирован на сервере</p>
          </div>
        ) : profile && levelInfo && titleInfo ? (
          <div
            className="mb-5 rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md"
            style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink/80">{currentUser?.name}</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
                    Уровень {levelInfo.level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-bold tracking-wide text-accent" style={{ textShadow: '0 0 8px rgba(255,43,214,0.4)' }}>
                  {titleInfo.title}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
                <Coins size={15} className="text-amber-300" />
                <span className="text-sm font-extrabold text-amber-200">{profile.coins}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                <span className="text-neon/80">XP</span>
                <span className="text-ink-muted">
                  {levelInfo.level >= 49 ? 'MAX' : `${levelInfo.currentXp} / ${levelInfo.neededXp}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: 'linear-gradient(90deg, rgba(0,229,255,0.6), rgba(0,229,255,1))',
                    boxShadow: '0 0 8px rgba(0,229,255,0.5)',
                  }}
                />
              </div>
            </div>

            <div className="mt-2.5">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                <span className="text-accent/80">XP ЗВАНИЯ</span>
                <span className="text-ink-muted">
                  {isMaxTitle(titleInfo.level) ? 'MAX' : `${titleInfo.currentXp} / ${titleInfo.neededXp}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${titleInfo.progressPercent}%`,
                    background: 'linear-gradient(90deg, rgba(255,43,214,0.6), rgba(255,43,214,1))',
                    boxShadow: '0 0 8px rgba(255,43,214,0.4)',
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* 10 mini-game cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {MINI_GAMES.map((game) => {
            const isDone = Boolean(completedToday[String(game.number)])
            return (
              <button
                key={game.number}
                onClick={() => setSelectedGame(game.number)}
                className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 text-center backdrop-blur-md transition-all active:scale-95 ${
                  isDone
                    ? 'border-success/40 bg-success/8'
                    : 'border-neon/25 bg-card/50 hover:border-neon/50 hover:bg-neon/8'
                }`}
                style={{
                  boxShadow: isDone
                    ? '0 0 12px rgba(34,255,136,0.15)'
                    : '0 0 10px rgba(0,229,255,0.06)',
                }}
              >
                {isDone && (
                  <span
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-success/25"
                    style={{ boxShadow: '0 0 8px rgba(34,255,136,0.4)' }}
                  >
                    <Check size={12} strokeWidth={3} className="text-success" />
                  </span>
                )}
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{game.icon}</span>
                <span className="mt-1.5 text-[13px] font-extrabold text-ink">{game.title}</span>
                <span className="mt-0.5 text-[10px] leading-tight text-ink-muted">{game.description}</span>
                {isDone && (
                  <span className="mt-1 text-[8px] font-bold tracking-wide text-success/80">Сегодня пройдено</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
