import { useCallback, useEffect, useState } from 'react'
import { Coins, Lock } from 'lucide-react'
import { api, type MiniGameProfile, type MiniGameProgress } from '../lib/api'
import { getLevelInfo, MINI_GAMES } from '../lib/miniGames'
import { getTitleInfo, isMaxTitle } from '../lib/titles'
import { useApp } from '../context/AppContext'
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

export default function MiniGamesPanel({ onBack }: Props) {
  const { currentUser } = useApp()
  const [profile, setProfile] = useState<MiniGameProfile | null>(null)
  const [progress, setProgress] = useState<MiniGameProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGame, setSelectedGame] = useState<number | null>(null)
  const [titlePopup, setTitlePopup] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getMiniGameData(currentUser.id)
      const prevProfile = profile
      setProfile(data.profile)
      setProgress(data.progress)

      // Title level-up popup
      if (prevProfile && data.profile.titleLevel > prevProfile.titleLevel) {
        setTitlePopup(data.profile.title)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser, profile])

  useEffect(() => { void loadData() }, [loadData])

  const refreshProfile = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getMiniGameData(currentUser.id)
      const prevProfile = profile
      setProfile(data.profile)
      setProgress(data.progress)
      if (prevProfile && data.profile.titleLevel > prevProfile.titleLevel) {
        setTitlePopup(data.profile.title)
      }
    } catch {
      // silent
    }
  }, [currentUser, profile])

  // -- Game screen --
  if (selectedGame !== null) {
    if (selectedGame === 1) {
      return <DailyPollGame onBack={() => setSelectedGame(null)} />
    }
    if (selectedGame === 2) {
      return <WhoOfThemGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 3) {
      return <WouldHeDoItGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 4) {
      return <PastLifeGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 5) {
      return <BestDuoGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 6) {
      return <RatePlayerGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 7) {
      return <MafiaGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 8) {
      return <YesNoGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 9) {
      return <SecretLoveGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }
    if (selectedGame === 10) {
      return <RouletteGame onBack={() => setSelectedGame(null)} onProfileUpdate={refreshProfile} />
    }

    // No more placeholders — all 10 games are implemented
    const game = MINI_GAMES.find((g) => g.number === selectedGame)
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button
          onClick={() => setSelectedGame(null)}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          ← Назад
        </button>

        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div
            className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-neon/30 bg-card/60 backdrop-blur-md"
            style={{ boxShadow: '0 0 24px rgba(0,229,255,0.15)' }}
          >
            <span className="text-5xl">{game?.icon}</span>
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-ink">{game?.title}</h2>
          <p className="mb-1 text-sm text-ink-muted">{game?.description}</p>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-neon/20 bg-card/50 px-5 py-3 backdrop-blur-md">
            <Lock size={16} className="text-neon/60" />
            <span className="text-sm font-bold text-neon/70">Скоро здесь появится опросник</span>
          </div>
        </div>
      </div>
    )
  }

  // -- Main panel --
  const levelInfo = profile ? getLevelInfo(profile.xp) : null
  const titleInfo = profile ? getTitleInfo(profile.titleXp) : null

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
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
        <div className="py-12 text-center text-sm text-ink-muted">Загрузка профиля...</div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-center">
          <p className="text-sm font-bold text-error">{error}</p>
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

          {/* Ordinary XP progress bar */}
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

          {/* Title XP progress bar */}
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
          const prog = progress.find((p) => p.game_number === game.number)
          return (
            <button
              key={game.number}
              onClick={() => setSelectedGame(game.number)}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-neon/25 bg-card/50 p-3 text-center backdrop-blur-md transition-all hover:border-neon/50 hover:bg-neon/8 active:scale-95"
              style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}
            >
              {prog?.completed && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
              <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{game.icon}</span>
              <span className="mt-1.5 text-[13px] font-extrabold text-ink">{game.title}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-ink-muted">{game.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
