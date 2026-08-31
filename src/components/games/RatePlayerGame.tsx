import { useCallback, useEffect, useState } from 'react'
import { Check, Trophy, Loader as Loader2 } from 'lucide-react'
import { api, type GameState } from '../../lib/api'
import { useApp } from '../../context/AppContext'

type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  question: string
  player_name: string
  userVote: number | null
}

type YesterdayState = {
  question: string
  player_name: string
  avgRating: number
  totalVotes: number
  userVote: number | null
  reward?: {
    result_rewarded: boolean
    xp_awarded: number
    title_xp_awarded: number
    coins_awarded: number
  } | null
}

const RATINGS = [0, 1, 2, 3, 4, 5]

export default function RatePlayerGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('rate_player', currentUser.id)
      setState(data)
      const today = (data?.today ?? null) as TodayState | null
      if (today?.userVote !== null && today?.userVote !== undefined) setSelected(today.userVote)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const handleVote = async () => {
    if (!currentUser || selected === null) return
    setVoting(true)
    setError('')
    try {
      await api.submitGameVote('rate_player', currentUser.id, { rating: selected })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оценки')
    } finally {
      setVoting(false)
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
  const hasVoted = today?.userVote !== null && today?.userVote !== undefined

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🎭</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 6</p>
          <h1 className="text-xl font-extrabold text-ink">Оцени</h1>
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
    <Trophy size={16} className="text-amber-300" />
    <p className="text-[11px] font-extrabold tracking-wide text-amber-300">
      Вчера оценивали
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
          <p className="mb-1 text-sm font-bold text-ink/90">{yesterday.question}</p>
          <p className="mb-3 text-xs text-ink-muted">Игрок: <span className="font-bold text-ink">{yesterday.player_name}</span></p>
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-center">
            <p className="text-[10px] font-bold tracking-widest text-amber-300">СРЕДНЯЯ ОЦЕНКА</p>
            {yesterday.totalVotes > 0 ? (
              <p className="mt-1 text-2xl font-extrabold text-amber-200">{yesterday.avgRating.toFixed(1)} <span className="text-sm text-ink-muted">/ 5</span></p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">Нет оценок</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">Проголосовало: {yesterday.totalVotes}</p>
            {yesterday.userVote !== null && <p className="mt-1 text-xs text-ink-muted">Ваша оценка: {yesterday.userVote}</p>}
          </div>
      </>
)}
        </div>

      )}

      {today && (
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
        <p className="text-[10px] font-bold tracking-widest text-neon">
  {today.player_name}
</p>

<h2 className="mt-1.5 mb-3 text-base font-extrabold leading-snug text-ink">
  {today.question}
</h2>
          <div className="grid grid-cols-6 gap-1.5">
            {RATINGS.map((rating) => {
              const isSelected = selected === rating
              const wasChosen = today.userVote === rating
              return (
                <button
                  key={rating}
                  onClick={() => !hasVoted && setSelected(rating)}
                  disabled={hasVoted}
                  className={`flex flex-col items-center justify-center rounded-lg border py-3 transition-all ${
                    hasVoted
                      ? wasChosen ? 'border-neon/50 bg-neon/15' : 'border-line/20 bg-black/20 opacity-40'
                      : isSelected ? 'border-neon/60 bg-neon/15 active:scale-95' : 'border-line/40 bg-black/20 hover:border-neon/30 active:scale-95'
                  }`}
                >
                  <span className={`text-lg font-extrabold ${isSelected || wasChosen ? 'text-neon' : 'text-ink/80'}`}>{rating}</span>
                </button>
              )
            })}
          </div>

          {hasVoted ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
              <div className="flex items-center justify-center gap-2"><Check size={16} className="text-success" /><p className="text-sm font-extrabold text-success">Оценка принята!</p></div>
              {today.userVote !== null && today.userVote !== undefined && (
                <p className="mt-2 text-xs text-ink-muted">
                  Твоя оценка: <span className="font-bold text-neon">{today.userVote} / 5</span>
                </p>
              )}
              <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>+2 XP · +2 XP звания · +3🪙</p>
              <p className="mt-1 text-[11px] text-ink-muted">Средняя оценка будет доступна завтра в 08:00</p>
            </div>
          ) : (
            <button onClick={handleVote} disabled={selected === null || voting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-extrabold text-black transition active:scale-95 disabled:opacity-40" style={{ boxShadow: '0 0 16px rgba(0,229,255,0.3)' }}>
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Оценить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
