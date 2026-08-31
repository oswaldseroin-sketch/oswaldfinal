import { useCallback, useEffect, useState } from 'react'
import { Check, Trophy, Gift, Loader as Loader2 } from 'lucide-react'
import { api, type GameState, type GameClaimResult } from '../../lib/api'
import { useApp } from '../../context/AppContext'

type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  question: string
  player_name: string
  userVote: string | null
}

type YesterdayState = {
  question: string
  player_name: string
  yesVotes: number
  noVotes: number
  winner: string | null
  userVote: string | null
  reward: { participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number; coins_awarded: number } | null
}

export default function WouldHeDoItGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<GameClaimResult | null>(null)
  const [resultsClaimed, setResultsClaimed] = useState(false)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('would_he_do_it', currentUser.id)
      setState(data)
      const today = (data?.today ?? null) as TodayState | null
      if (today?.userVote) setSelected(today.userVote)
      const yesterday = (data?.yesterday ?? null) as YesterdayState | null
      if (yesterday?.reward?.result_rewarded) setResultsClaimed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const handleVote = async () => {
    if (!currentUser || !selected) return
    setVoting(true)
    setError('')
    try {
      await api.submitGameVote('would_he_do_it', currentUser.id, { vote: selected })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка голосования')
    } finally {
      setVoting(false)
    }
  }

  const handleClaim = async () => {
    if (!currentUser || resultsClaimed) return
    setClaiming(true)
    setError('')
    try {
      const result = await api.claimGameResults('would_he_do_it', currentUser.id)
      setClaimResult(result)
      setResultsClaimed(true)
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
  const hasVoted = !!today?.userVote
console.log('WOULD HE DO IT TODAY:', today)

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🌙</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 3</p>
          <h1 className="text-xl font-extrabold text-ink">Сделал бы за 100 000?</h1>
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
      Вчерашний результат
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
          <p className="mb-3 text-sm font-bold text-ink/90">{yesterday.question}</p>
          <p className="mb-2 text-xs text-ink-muted">Игрок: <span className="font-bold text-ink">{yesterday.player_name}</span></p>
          <div className="space-y-2">
            <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${yesterday.winner === 'yes' ? 'border-amber-400/40 bg-amber-400/10' : 'border-line/50 bg-black/20'}`}>
              <div className="flex items-center gap-2"><span className="text-sm font-bold text-ink">ДА</span>{yesterday.winner === 'yes' && <span>🏆</span>}{yesterday.userVote === 'yes' && <Check size={13} className="text-amber-300" />}</div>
              <span className="text-sm font-extrabold text-amber-200">{yesterday.yesVotes}</span>
            </div>
            <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${yesterday.winner === 'no' ? 'border-amber-400/40 bg-amber-400/10' : 'border-line/50 bg-black/20'}`}>
              <div className="flex items-center gap-2"><span className="text-sm font-bold text-ink">НЕТ</span>{yesterday.winner === 'no' && <span>🏆</span>}{yesterday.userVote === 'no' && <Check size={13} className="text-amber-300" />}</div>
              <span className="text-sm font-extrabold text-amber-200">{yesterday.noVotes}</span>
            </div>
          </div>
          {!yesterday.winner && <p className="mt-2 text-center text-xs text-ink-muted">Ничья — награда не выдаётся</p>}

          {yesterday.userVote && !resultsClaimed && yesterday.winner && (
            <button onClick={handleClaim} disabled={claiming} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 py-2.5 text-sm font-extrabold text-amber-200 transition hover:bg-amber-400/25 active:scale-95 disabled:opacity-50">
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              Получить награду
            </button>
          )}

          {claimResult && claimResult.totalTitleXp! > 0 && (
            <div className="mt-3 rounded-lg border border-neon/30 bg-neon/10 p-3 text-center">
              <p className="text-xs font-bold text-neon">Награда получена!</p>
              <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥉 +{claimResult.totalTitleXp} XP звания +{claimResult.totalCoins}🪙</p>
            </div>
          )}
          {resultsClaimed && yesterday.reward && (
            <div className="mt-3 rounded-lg border border-neon/20 bg-neon/5 p-2.5 text-center"><p className="text-[11px] font-bold text-neon/70">Награда получена</p></div>
          )}
      </>
)}
        </div>
      )}

      {today && (
        <div
  className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 via-card/70 to-black/30 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 24px rgba(16,185,129,0.10), inset 0 0 22px rgba(245,158,11,0.04)',
  }}
>
        <div className="mb-2 flex items-center gap-2">
  <span className="text-lg">💰</span>
  <p className="text-base font-extrabold tracking-wide text-amber-300">
    {today.player_name}
  </p>
</div>

<div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-3">
  <p className="mb-1 text-[9px] font-black tracking-[0.18em] text-amber-300/80">
    СТАВКА ДНЯ
  </p>

  <h2 className="text-base font-extrabold leading-snug text-ink">
    {today.question}
  </h2>
</div>

          <div className="grid grid-cols-2 gap-2.5">
            {['yes', 'no'].map((option) => {
              const isSelected = selected === option
              const wasChosen = today.userVote === option
              const label = option === 'yes' ? 'ДА' : 'НЕТ'
              return (
                <button
                  key={option}
                  onClick={() => !hasVoted && setSelected(option)}
                  disabled={hasVoted}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-4 text-base font-extrabold transition-all duration-200 ${
  hasVoted
    ? wasChosen
      ? option === 'yes'
        ? 'scale-[1.02] border-emerald-400/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.22)]'
        : 'scale-[1.02] border-red-400/70 bg-red-500/20 text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.22)]'
      : 'border-line/20 bg-black/20 text-ink/30'
    : isSelected
      ? option === 'yes'
        ? 'scale-[1.02] border-emerald-400/80 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.28)]'
        : 'scale-[1.02] border-red-400/80 bg-red-500/20 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.28)]'
      : option === 'yes'
        ? 'border-emerald-400/25 bg-black/25 text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 active:scale-95'
        : 'border-red-400/25 bg-black/25 text-red-200 hover:border-red-400/50 hover:bg-red-500/10 active:scale-95'
}`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {hasVoted ? (
           <div
  className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center"
  style={{ boxShadow: '0 0 16px rgba(16,185,129,0.10)' }}
>
              <div className="flex items-center justify-center gap-2"><Check size={16} className="text-success" /><p className="text-sm font-extrabold text-success">Ответ учтён!</p></div>
              <p className="mt-1 text-[11px] text-ink-muted">Результаты будут доступны завтра в 08:00</p>
            </div>
          ) : (
           <button
  onClick={handleVote}
  disabled={!selected || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-500 to-yellow-300 py-3 text-sm font-extrabold text-black transition-all duration-200 active:scale-95 disabled:opacity-30"
  style={{
    boxShadow: selected
      ? '0 0 22px rgba(245,158,11,0.35)'
      : 'none',
  }}
>
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Ответить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
