import { useCallback, useEffect, useState } from 'react'
import { Loader as Loader2, Swords, Check, X } from 'lucide-react'
import { api, type GameState } from '../../lib/api'
import { useApp } from '../../context/AppContext'

type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  opponent_name: string
  result: string | null
}

type YesterdayState = {
  wins: number
  losses: number
  total: number
}

const ROULETTE_STEPS = [
  'Ты играешь против...',
  'Твой ход...',
  'Щёлк...',
]

export default function RouletteGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [animStep, setAnimStep] = useState(-1)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('roulette', currentUser.id)
      setState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const handlePlay = async () => {
    if (!currentUser) return
    setPlaying(true)
    setError('')
    setAnimStep(0)

    // Dramatic animation sequence — result already determined by backend
    const stepDelay = 700
    for (let i = 0; i < ROULETTE_STEPS.length; i++) {
      setAnimStep(i)
      await new Promise((r) => setTimeout(r, stepDelay))
    }

    try {
      await api.submitGameVote('roulette', currentUser.id, {})
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setPlaying(false)
      setAnimStep(-1)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-neon" /></div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center"><p className="text-sm font-bold text-error">{error}</p></div>
      </div>
    )
  }

  const today = state?.today as TodayState
  const yesterday = state?.yesterday as YesterdayState | null
  const hasPlayed = !!today?.result

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">👑</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 10</p>
          <h1 className="text-xl font-extrabold text-ink">Русская рулетка</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {yesterday && (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}>
          <p className="mb-3 text-[10px] font-bold tracking-widest text-amber-300">ВЧЕРА В РУССКУЮ РУЛЕТКУ</p>
          <div className="space-y-2">
            <div className="flex justify-between rounded-lg border border-success/20 bg-success/10 px-3 py-2">
              <span className="text-sm font-bold text-success">Победили</span>
              <span className="text-sm font-extrabold text-success">{yesterday.wins}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-error/20 bg-error/10 px-3 py-2">
              <span className="text-sm font-bold text-error">Проиграли</span>
              <span className="text-sm font-extrabold text-error">{yesterday.losses}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-line/30 bg-black/20 px-3 py-2">
              <span className="text-xs text-ink-muted">Всего сыграли</span>
              <span className="text-xs font-bold text-ink">{yesterday.total}</span>
            </div>
          </div>
        </div>
      )}

      {today && (
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
          <div className="mb-4 text-center">
            <p className="text-[10px] font-bold tracking-widest text-neon">ТЫ ИГРАЕШЬ ПРОТИВ</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neon/40 bg-neon/10">
                <Swords size={24} className="text-neon" />
              </div>
              <div className="text-left">
                <p className="text-base font-extrabold text-ink">{today.opponent_name}</p>
              </div>
            </div>
          </div>

          {/* Animation sequence */}
          {playing && animStep >= 0 && (
            <div className="mb-4 text-center">
              <p className="animate-pulse text-lg font-extrabold text-amber-300" style={{ textShadow: '0 0 12px rgba(255,191,0,0.4)' }}>
                {ROULETTE_STEPS[animStep]}
              </p>
            </div>
          )}

          {/* Result */}
          {hasPlayed && !playing && (
            <div className={`mb-4 rounded-xl border p-4 text-center ${today.result === 'win' ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'}`}>
              <div className="flex items-center justify-center gap-2">
                {today.result === 'win' ? <Check size={20} className="text-success" /> : <X size={20} className="text-error" />}
                <p className={`text-xl font-extrabold ${today.result === 'win' ? 'text-success' : 'text-error'}`}>
                  {today.result === 'win' ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
                </p>
              </div>
              {today.result === 'win' && (
                <p className="mt-2 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥇 +3 XP звания +3🪙</p>
              )}
              <p className="mt-1 text-[11px] text-ink-muted">Базовая награда: +2 XP +1🪙</p>
            </div>
          )}

          {/* Play button */}
          {!hasPlayed && !playing && (
            <button
              onClick={handlePlay}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-error/40 bg-error/15 py-4 text-sm font-extrabold text-error transition hover:bg-error/25 active:scale-95"
              style={{ boxShadow: '0 0 16px rgba(239,68,68,0.15)' }}
            >
              <Swords size={18} />
              Сыграть
            </button>
          )}

          {hasPlayed && !playing && (
            <p className="text-center text-[11px] text-ink-muted">Повторно крутить рулетку сегодня нельзя</p>
          )}
        </div>
      )}
    </div>
  )
}
