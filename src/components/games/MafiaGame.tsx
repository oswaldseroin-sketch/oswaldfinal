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
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

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

  const handleGuess = async (selectedIndex: number) => {
    if (!currentUser) return
    const today = (state?.today ?? null) as TodayState | null
    if (today?.gameEnded) return
    setGuessing(true)
    setError('')
    try {
      const result = await api.submitGameVote('mafia', currentUser.id, { selectedIndex })
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
  console.log('MAFIA TODAY:', today)
console.log('MAFIA PLAYERS:', dailyPlayers)
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
          <button
  onClick={() => setShowYesterdayResults((prev) => !prev)}
  className="mb-3 flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 transition-all active:scale-[0.98]"
>
  <div className="flex items-center gap-2">
    <span className="text-sm">🎯</span>
    <p className="text-[11px] font-extrabold tracking-wide text-amber-300">
      Вчерашняя мафия
    </p>
  </div>

  <span
    className={`text-sm text-amber-300 transition-transform duration-300 ${
      showYesterdayResults ? 'rotate-180' : ''
    }`}
  >
    ▼
  </span>
</button>
          {showYesterdayResults && (
  <>
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
      </>
)}
        </div>
      )}

      {today && (
        <div
  className="rounded-2xl border border-red-500/25 bg-gradient-to-b from-red-950/20 via-zinc-950/80 to-black/50 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 26px rgba(220,38,38,0.10), inset 0 0 30px rgba(127,29,29,0.05)',
  }}
>
         <div className="mb-3 flex items-center justify-between border-b border-red-500/15 pb-2.5">
  <div className="flex items-center gap-2">
    <span className="text-sm">🕵️</span>

    <div>
      <p className="text-[9px] font-black tracking-[0.2em] text-red-400">
        СЕКРЕТНОЕ ДЕЛО
      </p>
      <p className="text-[10px] font-extrabold text-red-100">
        ВЫЧИСЛИ МАФИЮ
      </p>
    </div>
  </div>

  <div className="rounded-lg border border-red-500/20 bg-red-950/30 px-2.5 py-1.5">
    <p className="text-[9px] font-black tracking-wide text-red-200">
      {isCompleted
        ? 'ДЕЛО ЗАКРЫТО'
        : `ПОПЫТКА ${attemptsUsed + 1}/${MAX_ATTEMPTS}`}
    </p>
  </div>
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
                     onClick={() => handleGuess(index)}
                      disabled={today.gameEnded || isEliminated || guessing}
                     className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
  isMafiaRevealed
    ? 'scale-[1.02] border-amber-400/70 bg-amber-500/15 shadow-[0_0_22px_rgba(251,191,36,0.20)]'
    : isEliminated
      ? 'border-red-900/40 bg-red-950/20 opacity-40'
      : today.gameEnded
        ? 'border-zinc-800/40 bg-black/30 opacity-35'
        : 'border-red-500/15 bg-zinc-950/60 hover:border-red-400/50 hover:bg-red-950/25 hover:shadow-[0_0_18px_rgba(239,68,68,0.12)] active:scale-[0.98]'
}`}
                    >
                      <div
  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black transition-all duration-200 ${
    isMafiaRevealed
      ? 'border-amber-300/70 bg-amber-500/15 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
      : isEliminated
        ? 'border-red-800/50 bg-red-950/30 text-red-400'
        : 'border-red-500/20 bg-black/30 text-red-200'
  }`}
>
  {isMafiaRevealed ? '🕵️' : isEliminated ? <X size={14} /> : `#${index + 1}`}
</div>
                     <span
  className={`flex-1 text-sm font-extrabold tracking-wide transition-all ${
    isMafiaRevealed
      ? 'text-amber-200'
      : isEliminated
        ? 'text-red-500/60 line-through'
        : 'text-zinc-100'
  }`}
>
  {player.full_name}
</span>
                      {isMafiaRevealed && <span className="text-xs font-bold text-amber-300">МАФИЯ</span>}
                      {isEliminated && <span className="text-xs text-error">Не мафия</span>}
                    </button>
                  )
                })}
              </div>

            {lastResult && !lastResult.isMafia && !today.gameEnded && (
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
