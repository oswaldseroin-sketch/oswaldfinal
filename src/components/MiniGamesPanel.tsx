import { type ReactNode, useCallback, useEffect, useState } from 'react'
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
import ShopPanel, { RadioInbox } from './ShopPanel'

type Props = { onBack: () => void }
playerId: string
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
  const [showGameCompleteNav, setShowGameCompleteNav] = useState(false)
  const [lastCompletedGame, setLastCompletedGame] = useState<number | null>(null)
  const [titlePopup, setTitlePopup] = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState<CompletedToday>(() => getCompletedToday(playerId))
  const [shopOpen, setShopOpen] = useState(false)

  useEffect(() => {
  const completed = getCompletedToday(playerId)

  console.log('COMPLETED TODAY:', completed)

  setCompletedToday(completed)
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
      console.log('SERVER PROGRESS:', data.progress)
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
  setLastCompletedGame(gameNumber)
  await refreshProfile()
  setShowGameCompleteNav(true)
}, [playerId, refreshProfile])

  const handleNextGame = () => {
  const gameNumber = selectedGame ?? lastCompletedGame

  if (gameNumber === null) return

  setShowGameCompleteNav(false)

  if (gameNumber < 10) {
    setSelectedGame(gameNumber + 1)
  } else {
    setSelectedGame(null)
  }
}

const handleGamesMenu = () => {
  setSelectedGame(null)
  setCompletedToday(getCompletedToday(playerId))
}

const renderCompleteNav = () => {
  const gameNumber = selectedGame ?? lastCompletedGame

  if (gameNumber === null) return null

  const gameCompleted =
    showGameCompleteNav ||
    Boolean(completedToday[String(gameNumber)]) ||
    progress.some(
      (game) => game.game_number === gameNumber && game.completed,
    )

  if (!gameCompleted) return null

  return (
    <div className="relative z-[100] mx-auto -mt-2 max-w-md px-4 pb-4">
      <div
        className="rounded-2xl border border-cyan-400/20 bg-black/90 p-3 backdrop-blur-xl"
        style={{
          boxShadow:
            '0 -10px 40px rgba(0,0,0,0.55), 0 0 20px rgba(34,211,238,0.08)',
        }}
      >
        <p className="mb-2 text-center text-[9px] font-black tracking-[0.25em] text-cyan-300/60">
          ИСПЫТАНИЕ ЗАВЕРШЕНО
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGamesMenu}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-[11px] font-black tracking-wide text-zinc-300 transition active:scale-95"
          >
            В МЕНЮ ИГР
          </button>

          <button
            type="button"
            onClick={handleNextGame}
            className="rounded-xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 px-3 py-3 text-[11px] font-black tracking-wide text-white transition active:scale-95"
            style={{
              boxShadow: '0 0 14px rgba(34,211,238,0.14)',
            }}
          >
            {gameNumber < 10 ? 'ДАЛЕЕ →' : 'ЗАВЕРШИТЬ'}
          </button>
        </div>
      </div>
    </div>
  )
}

const renderGame = (game: ReactNode) => (
  <div className="relative">
    {game}
    {renderCompleteNav()}
  </div>
)
  // -- Game screen --
  if (selectedGame !== null) {
   const handleBack = () => {
  setSelectedGame(null)
  setCompletedToday(getCompletedToday(playerId))
}


    if (selectedGame === 1) {
  return renderGame(
    <DailyPollGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(1)}
    />
  )
}
   if (selectedGame === 2) {
  return renderGame(
    <WhoOfThemGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(2)}
    />
  )
}

if (selectedGame === 3) {
  return renderGame(
    <WouldHeDoItGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(3)}
    />
  )
}

if (selectedGame === 4) {
  return renderGame(
    <PastLifeGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(4)}
    />
  )
}

if (selectedGame === 5) {
  return renderGame(
    <BestDuoGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(5)}
    />
  )
}

if (selectedGame === 6) {
  return renderGame(
    <RatePlayerGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(6)}
    />
  )
}

if (selectedGame === 7) {
  return renderGame(
    <MafiaGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(7)}
    />
  )
}

if (selectedGame === 8) {
  return renderGame(
    <YesNoGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(8)}
    />
  )
}

if (selectedGame === 9) {
  return renderGame(
    <SecretLoveGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(9)}
    />
  )
}

if (selectedGame === 10) {
  return renderGame(
    <RouletteGame
      onBack={handleBack}
      onProfileUpdate={() => void handleGameComplete(10)}
    />
  )
}
}
  // -- Shop screen --
  if (shopOpen) {
    return (
     <ShopPanel
  onBack={() => setShopOpen(false)}
  profileCoins={profile?.coins ?? 0}
  playerId={String(playerId)}
  onPurchaseComplete={() => void refreshProfile()}
/>
    )
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
           className="relative mb-2 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/35 via-black/75 to-fuchsia-950/25 px-3 py-2 backdrop-blur-md"
            style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
          >
            <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
<div className="pointer-events-none absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="mb-1 flex items-center justify-between">
  <span className="text-[8px] font-black tracking-[0.28em] text-fuchsia-300/60">
    ПРОФИЛЬ ИГРОКА
  </span>

  <span className="flex items-center gap-1 text-[8px] font-black tracking-wider text-emerald-300/70">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.8)]" />
    ONLINE
  </span>
</div>            
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink/80">{currentUser?.name}</p>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <div
  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.07] px-1.5 py-0.5"
  style={{
    boxShadow: 'inset 0 0 14px rgba(0,229,255,0.05)',
  }}
>
  <span className="text-[8px] font-black tracking-[0.2em] text-cyan-300/50">
    LVL
  </span>

  <span
    className="text-base font-black leading-none text-cyan-200"
    style={{
      textShadow: '0 0 12px rgba(0,229,255,0.55)',
    }}
  >
    {levelInfo.level}
  </span>
</div>
                </div>
                <p className="mt-0.5 text-[11px] font-bold tracking-wide text-accent" style={{ textShadow: '0 0 8px rgba(255,43,214,0.4)' }}>
                  {profile.title}
                </p>
              </div>
              <div
  className="relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-orange-950/30 px-2 py-1"
  style={{
    boxShadow:
      '0 0 12px rgba(251,191,36,0.10), inset 0 0 10px rgba(251,191,36,0.05)',
  }}
>
  <Coins
    size={14}
    className="relative text-amber-300"
    style={{
      filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.55))',
    }}
  />

  <div className="relative">
    <p className="text-[7px] font-black leading-none tracking-[0.16em] text-amber-300/50">
      МОНЕТЫ
    </p>
    <p className="mt-0.5 text-xs font-black leading-none text-amber-100">
      {profile.coins}
    </p>
  </div>
</div>
            </div>

            <div className="mt-1.5">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold">
                <span className="text-neon/80">XP</span>
                <span className="text-ink-muted">
                  {levelInfo.level >= 49 ? 'MAX' : `${levelInfo.currentXp} / ${levelInfo.neededXp}`}
                </span>
              </div>
             <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-cyan-400/10 bg-black/60">
  <div
    className="relative h-full rounded-full transition-all duration-700"
    style={{
      width: `${levelInfo.progressPercent}%`,
      background:
        'linear-gradient(90deg, rgba(8,145,178,0.9), rgba(34,211,238,1), rgba(165,243,252,1))',
      boxShadow: '0 0 10px rgba(34,211,238,0.55)',
    }}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
  </div>
</div>
            </div>

            <div className="mt-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold">
                <span className="text-accent/80">XP ЗВАНИЯ</span>
                <span className="text-ink-muted">
                  {isMaxTitle(titleInfo.level) ? 'MAX' : `${titleInfo.currentXp} / ${titleInfo.neededXp}`}
                </span>
              </div>
             <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-fuchsia-400/10 bg-black/60">
  <div
    className="relative h-full rounded-full transition-all duration-700"
    style={{
      width: `${titleInfo.progressPercent}%`,
      background:
        'linear-gradient(90deg, rgba(126,34,206,0.9), rgba(217,70,239,1), rgba(251,207,232,1))',
      boxShadow: '0 0 10px rgba(217,70,239,0.5)',
    }}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
  </div>
</div>
            </div>
          </div>
        ) : null}
        
                {/* Магазиньш */}
        <button
          type="button"
          onClick={() => setShopOpen(true)}
          className="group relative mb-2 w-full overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/70 via-black/80 to-fuchsia-950/50 px-3 py-2 text-left backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
          style={{
            boxShadow:
              '0 0 16px rgba(251,191,36,0.12), inset 0 0 20px rgba(255,43,214,0.05)',
          }}
        >
          <div className="absolute -right-4 -top-6 h-16 w-16 rounded-full bg-amber-400/10 blur-2xl" />

          <div className="relative flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-400/10 text-base"
              style={{
                boxShadow: '0 0 12px rgba(251,191,36,0.18)',
              }}
            >
              🛒
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-black tracking-wide text-amber-100"
                style={{
                  textShadow: '0 0 10px rgba(251,191,36,0.30)',
                }}
              >
                МАГАЗИНЬШ
              </p>

              <p className="text-[10px] font-medium text-zinc-500">
                Таинственная лавка
              </p>
            </div>

            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1">
              <span className="text-[8px] font-black tracking-widest text-amber-300/80">
                ОТКРЫТЬ
              </span>
            </div>
          </div>
        </button>
   
        <RadioInbox playerId={playerId} onAllRead={() => {}} />
<div className="relative mb-2 flex items-end justify-between overflow-hidden rounded-xl border border-cyan-400/10 bg-black/25 px-3 py-1.5 backdrop-blur-sm">
  <div>
    <p className="text-[8px] font-black tracking-[0.28em] text-cyan-300/50">
      АРКАДНЫЙ СЕКТОР
    </p>

    <p
      className="mt-0.5 text-sm font-black tracking-wide text-white"
      style={{
        textShadow: '0 0 12px rgba(34,211,238,0.20)',
      }}
    >
      10 ИСПЫТАНИЙ
    </p>
  </div>

  <div className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5">
  <Check
    size={11}
    strokeWidth={3}
    className="text-emerald-400"
    style={{
      filter: 'drop-shadow(0 0 5px rgba(52,211,153,0.6))',
    }}
  />

  <div className="flex items-baseline gap-1">
    <span className="text-[11px] font-black text-emerald-200">
      {Object.values(completedToday).filter(Boolean).length}
    </span>

    <span className="text-[8px] font-black text-zinc-600">
      / 10
    </span>
  </div>
</div>
</div>
        {showGameCompleteNav && selectedGame === null && (
  <div className="mb-4">
    {renderCompleteNav()}
  </div>
)}
        {/* 10 mini-game cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {MINI_GAMES.map((game) => {
            const isDone = Boolean(completedToday[String(game.number)])
      const gameStyle: Record<number, {
  border: string
  bg: string
  glow: string
  accent: string
}> = {
  1: {
    border: 'border-purple-400/30',
    bg: 'bg-gradient-to-br from-purple-950/70 via-black/80 to-fuchsia-950/40',
    glow: '0 0 18px rgba(168,85,247,0.14)',
    accent: 'text-purple-200',
  },
  2: {
    border: 'border-orange-400/30',
    bg: 'bg-gradient-to-br from-orange-950/70 via-black/80 to-amber-950/40',
    glow: '0 0 18px rgba(251,146,60,0.14)',
    accent: 'text-orange-200',
  },
  3: {
    border: 'border-amber-400/30',
    bg: 'bg-gradient-to-br from-amber-950/70 via-black/80 to-yellow-950/30',
    glow: '0 0 18px rgba(245,158,11,0.14)',
    accent: 'text-amber-200',
  },
  4: {
    border: 'border-stone-400/25',
    bg: 'bg-gradient-to-br from-stone-900/80 via-black/85 to-amber-950/30',
    glow: '0 0 18px rgba(168,162,158,0.10)',
    accent: 'text-stone-200',
  },
  5: {
    border: 'border-cyan-400/30',
    bg: 'bg-gradient-to-br from-cyan-950/60 via-black/85 to-red-950/40',
    glow: '0 0 18px rgba(34,211,238,0.12)',
    accent: 'text-cyan-200',
  },
  6: {
    border: 'border-violet-400/30',
    bg: 'bg-gradient-to-br from-violet-950/70 via-black/80 to-fuchsia-950/40',
    glow: '0 0 18px rgba(139,92,246,0.14)',
    accent: 'text-violet-200',
  },
  7: {
    border: 'border-red-500/30',
    bg: 'bg-gradient-to-br from-red-950/70 via-black/90 to-zinc-950',
    glow: '0 0 18px rgba(239,68,68,0.14)',
    accent: 'text-red-200',
  },
  8: {
    border: 'border-slate-400/25',
    bg: 'bg-gradient-to-br from-slate-900/80 via-black/85 to-zinc-950',
    glow: '0 0 18px rgba(148,163,184,0.10)',
    accent: 'text-slate-200',
  },
  9: {
    border: 'border-indigo-400/30',
    bg: 'bg-gradient-to-br from-indigo-950/70 via-black/85 to-slate-950/50',
    glow: '0 0 18px rgba(99,102,241,0.14)',
    accent: 'text-indigo-200',
  },
  10: {
    border: 'border-amber-400/30',
    bg: 'bg-gradient-to-br from-amber-950/60 via-black/90 to-red-950/40',
    glow: '0 0 20px rgba(251,191,36,0.14)',
    accent: 'text-amber-200',
  },
}

const style = gameStyle[game.number]
            return (
              <button
                key={game.number}
                onClick={() => setSelectedGame(game.number)}
              className={`group relative flex min-h-[148px] flex-col items-center justify-center overflow-hidden rounded-xl border p-3 text-center backdrop-blur-md transition-all duration-300 active:scale-95 ${
  isDone
    ? 'border-success/40 bg-success/8'
    : `${style.border} ${style.bg}`
}`}
               style={{
  boxShadow: isDone
    ? '0 0 12px rgba(34,255,136,0.15)'
    : style.glow,
}}
              >
                <span
  className={`absolute left-2 top-2 text-[8px] font-black tracking-[0.18em] ${style.accent} opacity-60`}
>
  ИГРА {String(game.number).padStart(2, '0')}
</span>
                <div
  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
  style={{
    background:
      'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.10), transparent 55%)',
  }}
/>
                {isDone && (
                  <span
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-success/25"
                    style={{ boxShadow: '0 0 8px rgba(34,255,136,0.4)' }}
                  >
                    <Check size={12} strokeWidth={3} className="text-success" />
                  </span>
                )}
                <div
  className={`relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 ${style.accent} transition-all duration-300 group-hover:scale-110`}
  style={{
    boxShadow: isDone ? 'none' : style.glow,
  }}
>
  <div className="absolute inset-1 rounded-lg border border-white/[0.04]" />

  <span
    className="relative text-2xl"
    style={{
      filter: isDone ? 'none' : 'drop-shadow(0 0 7px currentColor)',
    }}
  >
    {game.icon}
  </span>
</div>
                <span
  className={`mt-2 text-[13px] font-black tracking-wide ${style.accent}`}
  style={{
    textShadow: isDone ? 'none' : '0 0 10px currentColor',
  }}
>
  {game.title}
</span>
                <span className="mt-0.5 text-[10px] leading-tight text-ink-muted">{game.description}</span>
                
               {isDone && (
  <span
    className="mt-2 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[8px] font-black tracking-[0.14em] text-success"
    style={{
      boxShadow: '0 0 10px rgba(34,255,136,0.10)',
    }}
  >
    ПРОЙДЕНО
  </span>
)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
