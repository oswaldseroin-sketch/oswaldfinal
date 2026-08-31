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
  const [claiming, setClaiming] = useState(false)
const [claimMessage, setClaimMessage] = useState('')

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
const handleClaimYesterday = async () => {
  if (!currentUser || claiming) return

  setClaiming(true)
  setClaimMessage('')
  setError('')

  try {
    const result = await api.claimGameResults('rate_player', currentUser.id)

    if (!result.success) {
      setError(result.message || 'Не удалось получить награду')
      return
    }

    const xp = result.totalXp ?? 0
    const titleXp = result.totalTitleXp ?? 0
    const coins = result.totalCoins ?? 0

    setClaimMessage(`+${xp} XP · +${titleXp} XP звания · +${coins}🪙`)

    await loadState()
    onProfileUpdate()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Ошибка получения награды')
  } finally {
    setClaiming(false)
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
  const yesterdayDifference =
  yesterday?.userVote !== null && yesterday?.userVote !== undefined
    ? Math.abs(yesterday.userVote - yesterday.avgRating)
    : null

const yesterdayWon =
  yesterdayDifference !== null && yesterdayDifference <= 1

const yesterdayClaimed =
  yesterday?.reward?.result_rewarded === true

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
  <span className="text-2xl">◈</span>

  <div>
    <p className="text-[10px] font-black tracking-[0.18em] text-violet-300">
      МИНИ-ИГРА 6
    </p>

    <h1 className="text-xl font-black text-ink">
      Оцени
    </h1>
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
            {yesterday.userVote !== null && (
  <div className="mt-3">
    {yesterdayWon ? (
      yesterdayClaimed ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-2.5">
          <p className="text-xs font-extrabold text-success">
            ✓ Награда получена
          </p>
          <p className="mt-1 text-sm font-extrabold text-neon">
            +{yesterday.reward?.xp_awarded ?? 3} XP · +{yesterday.reward?.title_xp_awarded ?? 3} XP звания · +{yesterday.reward?.coins_awarded ?? 3}🪙
          </p>
        </div>
      ) : (
        <button
          onClick={handleClaimYesterday}
          disabled={claiming}
          className="w-full rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-extrabold text-black transition active:scale-95 disabled:opacity-50"
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              Получаем...
            </span>
          ) : (
            '🏆 Получить награду'
          )}
        </button>
      )
    ) : (
      <p className="text-xs font-bold text-ink-muted">
        До средней оценки больше 1 — без бонуса
      </p>
    )}

    {claimMessage && (
      <p className="mt-2 text-sm font-extrabold text-success">
        {claimMessage}
      </p>
    )}
  </div>
)}
          </div>
      </>
)}
        </div>

      )}

      {today && (
        <div
  className="rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-950/25 via-card/70 to-black/35 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 24px rgba(139,92,246,0.10), inset 0 0 24px rgba(251,191,36,0.025)',
  }}
>
       <div className="mb-2 flex items-center gap-2">
  <div className="h-7 w-1 rounded-full bg-gradient-to-b from-violet-400 to-amber-300" />

  <div>
    <p className="text-[9px] font-black tracking-[0.18em] text-violet-300/70">
      ОЦЕНИВАЕМ
    </p>

    <p className="text-sm font-extrabold tracking-wide text-violet-100">
      {today.player_name}
    </p>
  </div>
</div>

<div className="mb-3 rounded-xl border border-violet-400/15 bg-black/25 px-3 py-3">
  <p className="mb-1 text-[9px] font-black tracking-[0.18em] text-amber-300/60">
    КРИТЕРИЙ ОЦЕНКИ
  </p>

  <h2 className="text-base font-extrabold leading-snug text-ink">
    {today.question}
  </h2>
</div>
         <div className="rounded-2xl border border-violet-400/15 bg-black/25 p-2.5">
  <div className="mb-2 flex items-center justify-between px-1">
    <span className="text-[9px] font-black tracking-[0.18em] text-violet-300/70">
      ШКАЛА ОЦЕНКИ
    </span>

    <span className="text-[9px] font-bold text-amber-300/60">
      0 — 5
    </span>
  </div>

  <div className="grid grid-cols-6 gap-1.5">
    {RATINGS.map((rating) => {
      const isSelected = selected === rating
      const wasChosen = today.userVote === rating
      const active = isSelected || wasChosen

      return (
        <button
          key={rating}
          onClick={() => !hasVoted && setSelected(rating)}
          disabled={hasVoted}
          className={`relative flex h-12 items-center justify-center overflow-hidden rounded-xl border transition-all duration-200 ${
            hasVoted
              ? active
                ? 'scale-110 border-violet-300/80 bg-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,0.40)]'
                : 'border-white/5 bg-white/[0.03] opacity-30'
              : active
                ? 'scale-110 border-violet-300/80 bg-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,0.40)]'
                : 'border-white/10 bg-white/[0.04] hover:border-violet-400/35 hover:bg-violet-500/10 active:scale-95'
          }`}
        >
          {active && (
            <div className="absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-amber-300" />
          )}

          <span
            className={`relative z-10 text-lg font-black transition-all ${
              active
                ? 'text-white'
                : 'text-ink/70'
            }`}
          >
            {rating}
          </span>
        </button>
      )
    })}
  </div>
</div>

          {hasVoted ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
              <div className="flex items-center justify-center gap-2"><Check size={16} className="text-success" /><p className="text-sm font-extrabold text-success">Оценка принята!</p></div>
              {today.userVote !== null && today.userVote !== undefined && (
                <p className="mt-2 text-xs text-ink-muted">
                  Твоя оценка: <span className="font-bold text-neon">{today.userVote} / 5</span>
                </p>
              )}
              <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>+2 XP · +3🪙</p>
              <p className="mt-1 text-[11px] text-ink-muted">Средняя оценка будет доступна завтра в 08:00</p>
            </div>
          ) : (
            <button
  onClick={handleVote}
  disabled={selected === null || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/50 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 py-3 text-sm font-extrabold text-white transition-all duration-200 active:scale-95 disabled:opacity-30"
  style={{
    boxShadow:
      selected !== null
        ? '0 0 22px rgba(168,85,247,0.35)'
        : 'none',
  }}
>
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Оценить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
