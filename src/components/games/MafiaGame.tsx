import { useCallback, useEffect, useState } from 'react'
import { X, Loader as Loader2 } from 'lucide-react'
import { api, type GameState, type PlayerRow } from '../../lib/api'
import { useApp } from '../../context/AppContext'

type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  players?: string[]
  attemptCount: number
  eliminated: number[]
  foundMafia: boolean
  gameEnded: boolean
  mafiaIndex: number | null
}

type YesterdayState = {
  mafia: string
  guessed: number
  notGuessed: number
  firstTry: number
  secondTry: number
  totalPlayed: number
}

const MAX_ATTEMPTS = 2

export default function MafiaGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [guessing, setGuessing] = useState(false)
  const [lastResult, setLastResult] = useState<{ isMafia: boolean; attemptNumber: number } | null>(null)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const [playersData, gameData] = await Promise.all([
        api.getPlayers(),
        api.getGameState('mafia', currentUser.id),
      ])
      setAllPlayers(playersData)
      setState(gameData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const handleGuess = async (playerId: number) => {
    if (!currentUser) return
    const today = (state?.today ?? null) as TodayState | null
    if (today?.gameEnded) return
    setGuessing(true)
    setError('')
    try {
      const result = await api.submitGameVote('mafia', currentUser.id, { selectedPlayerId: playerId })
      setLastResult({ isMafia: result.isMafia ?? false, attemptNumber: result.attemptNumber ?? 0 })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setGuessing(false)
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

  const today = (state?.today ?? null) as TodayState | null
  const yesterday = (state?.yesterday ?? null) as YesterdayState | null
  const dailyPlayers: string[] = (today?.players && Array.isArray(today.players)) ? today.players : []
  const attemptsUsed = today?.attemptCount ?? 0
  const isCompleted = (today?.gameEnded ?? false) || attemptsUsed >= MAX_ATTEMPTS

  const eliminatedNames = new Set<string>(
    (today?.eliminated ?? []).map((idx) => dailyPlayers[idx]).filter(Boolean)
  )
  const mafiaName = (today?.gameEnded && today?.mafiaIndex !== null && dailyPlayers[today.mafiaIndex]) || null

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 7</p>
          <h1 className="text-xl font-extrabold text-ink">Угадай мафию</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {yesterday && (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}>
          <p className="mb-3 text-[10px] font-bold tracking-widest text-amber-300">ВЧЕРАШНЯЯ МАФИЯ</p>
          <p className="mb-3 text-sm text-ink-muted">Мафия: <span className="font-bold text-ink">{yesterday.mafia}</span></p>
          <div className="space-y-1.5">
            <div className="flex justify-between rounded-lg border border-success/20 bg-success/10 px-3 py-1.5">
              <span className="text-xs font-bold text-success">Угадали с 1-й попытки</span>
              <span className="text-xs font-extrabold text-success">{yesterday.firstTry}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-neon/20 bg-neon/10 px-3 py-1.5">
              <span className="text-xs font-bold text-neon">Угадали со 2-й</span>
              <span className="text-xs font-extrabold text-neon">{yesterday.secondTry}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-error/20 bg-error/10 px-3 py-1.5">
              <span className="text-xs font-bold text-error">Не угадали</span>
              <span className="text-xs font-extrabold text-error">{yesterday.notGuessed}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-line/30 bg-black/20 px-3 py-1.5">
              <span className="text-xs text-ink-muted">Всего сыграли</span>
              <span className="text-xs font-bold text-ink">{yesterday.totalPlayed}</span>
            </div>
          </div>
        </div>
      )}

      {today && (
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-widest text-neon">НАЙДИ МАФИЮ</p>
            <p className="text-[10px] font-bold text-ink-muted">
              {isCompleted ? 'Игра окончена' : `Попытка ${attemptsUsed + 1} / ${MAX_ATTEMPTS}`}
            </p>
          </div>

          {isCompleted ? (
            <div className={`rounded-xl border p-4 text-center ${today.foundMafia ? 'border-success/30 bg-success/10' : 'border-error/30 bg-error/10'}`}>
              <p className={`text-sm font-extrabold ${today.foundMafia ? 'text-success' : 'text-error'}`}>
                {today.foundMafia
                  ? `Поймали мафию! ${today.attemptCount === 1 ? 'С первой попытки!' : 'Со второй попытки!'}`
                  : 'Мафия сбежала...'}
              </p>
              {today.foundMafia && today.attemptCount === 1 && (
                <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥇×3 +9 XP звания +9🪙</p>
              )}
              {today.foundMafia && today.attemptCount === 2 && (
                <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥈×2 +6 XP звания +6🪙</p>
              )}
              <p className="mt-1 text-[11px] text-ink-muted">Базовая награда: +2 XP +1🪙</p>
              <p className="mt-3 text-[11px] text-ink-muted">Попытки закончились. Результат будет завтра в 08:00.</p>

              {mafiaName && (
                <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center">
                  <p className="text-xs text-ink-muted">Мафия была:</p>
                  <p className="text-sm font-extrabold text-amber-200">{mafiaName}</p>
                </div>
              )}
            </div>
          ) : dailyPlayers.length > 0 ? (
  <>
    <div className="space-y-2">
      {dailyPlayers.map((playerName, index) => {
        const player = allPlayers.find((p) => p.full_name === playerName)

        if (!player) return null
                  const isEliminated = eliminatedNames.has(player.full_name)
                  const isMafiaRevealed = today.gameEnded && player.full_name === mafiaName
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleGuess(player.id)}
                      disabled={today.gameEnded || isEliminated || guessing}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        isMafiaRevealed
                          ? 'border-amber-400/60 bg-amber-400/15'
                          : isEliminated
                            ? 'border-error/30 bg-error/10 opacity-50'
                            : today.gameEnded
                              ? 'border-line/20 bg-black/20 opacity-40'
                              : 'border-line/40 bg-black/20 hover:border-neon/40 active:scale-95'
                      }`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        isMafiaRevealed ? 'border-amber-400 bg-amber-400/20 text-amber-300' :
                        isEliminated ? 'border-error/40 text-error' : 'border-line/50 text-ink-muted'
                      }`}>
                       {isMafiaRevealed ? '🕵️' : isEliminated ? <X size={14} /> : index + 1}
                      </div>
                      <span className={`flex-1 text-sm font-bold ${isMafiaRevealed ? 'text-amber-200' : isEliminated ? 'text-error' : 'text-ink'}`}>
                        {player.full_name}
                      </span>
                      {isMafiaRevealed && <span className="text-xs font-bold text-amber-300">МАФИЯ</span>}
                      {isEliminated && <span className="text-xs text-error">Не мафия</span>}
                    </button>
                  )
                })}
              </div>

              {lastResult && !today.gameEnded && (
                <div className="mt-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center">
                  <div className="flex items-center justify-center gap-2"><X size={16} className="text-error" /><p className="text-sm font-bold text-error">Не мафия!</p></div>
                  <p className="mt-1 text-[11px] text-ink-muted">Осталась 1 попытка</p>
                </div>
              )}

              {!today.gameEnded && !lastResult && (
                <p className="mt-3 text-center text-[11px] text-ink-muted">Выбери игрока, которого считаешь мафией</p>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-center">
              <p className="text-sm font-bold text-error">Список игроков недоступен</p>
              <p className="mt-1 text-[11px] text-ink-muted">Попробуй перезайти в игру</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
