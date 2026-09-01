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
  selfQuestion: boolean
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

export default function YesNoGame({ onBack, onProfileUpdate }: Props) {
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
      const data = await api.getGameState('yes_no', currentUser.id)
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
      await api.submitGameVote('yes_no', currentUser.id, { vote: selected })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setVoting(false)
    }
  }

  const handleClaim = async () => {
    if (!currentUser || resultsClaimed) return
    setClaiming(true)
    setError('')
    try {
      const result = await api.claimGameResults('yes_no', currentUser.id)
      setClaimResult(result)
      setResultsClaimed(true)
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
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
  const isSelfQuestion = !!today?.selfQuestion

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

     <div className="mb-4 flex items-center gap-2">
  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-400/20 bg-slate-400/5">
    <span className="text-lg font-black text-slate-300">?</span>
  </div>

  <div>
    <p className="text-[10px] font-black tracking-[0.2em] text-slate-500">
      МИНИ-ИГРА 8
    </p>
    <h1 className="text-xl font-black text-zinc-100">
      Да или Нет
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
         <p className="mb-2 text-sm font-bold text-ink/90">
  {yesterday.question}
</p>

<div className="mb-3 rounded-xl border border-amber-400/25 bg-black/25 px-3 py-2.5 text-center">
  <p className="text-[9px] font-black tracking-[0.18em] text-amber-400/60">
    ВОПРОС БЫЛ ПРО
  </p>

  <p className="mt-0.5 text-sm font-black text-amber-100">
    {yesterday.player_name}
  </p>
</div>
         <div className="space-y-2">
  <div
    className={`rounded-xl border px-3 py-2.5 ${
      yesterday.winner === 'yes'
        ? 'border-amber-300/60 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.16)]'
        : 'border-emerald-500/20 bg-emerald-950/15'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-black text-emerald-200">ДА</span>

      <span className="text-[10px] font-black tracking-wide text-zinc-300">
        ГОЛОСА: {yesterday.yesVotes}
      </span>
    </div>

    <div className="mt-2 flex flex-wrap gap-1.5">
      {yesterday.userVote === 'yes' && (
        <span className="rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-[9px] font-black text-cyan-200">
          ВАШ ГОЛОС
        </span>
      )}

      {yesterday.winner === 'yes' && (
        <span className="rounded-md border border-amber-300/50 bg-amber-400/15 px-2 py-1 text-[9px] font-black text-amber-200">
          🏆 БОЛЬШИНСТВО
        </span>
      )}
    </div>
  </div>

  <div
    className={`rounded-xl border px-3 py-2.5 ${
      yesterday.winner === 'no'
        ? 'border-amber-300/60 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.16)]'
        : 'border-red-500/20 bg-red-950/15'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-black text-red-200">НЕТ</span>

      <span className="text-[10px] font-black tracking-wide text-zinc-300">
        ГОЛОСА: {yesterday.noVotes}
      </span>
    </div>

    <div className="mt-2 flex flex-wrap gap-1.5">
      {yesterday.userVote === 'no' && (
        <span className="rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-[9px] font-black text-cyan-200">
          ВАШ ГОЛОС
        </span>
      )}

      {yesterday.winner === 'no' && (
        <span className="rounded-md border border-amber-300/50 bg-amber-400/15 px-2 py-1 text-[9px] font-black text-amber-200">
          🏆 БОЛЬШИНСТВО
        </span>
      )}
    </div>
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
              <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥈 +{claimResult.totalTitleXp} XP звания +{claimResult.totalCoins}🪙</p>
            </div>
          )}
        {resultsClaimed && yesterday.reward && (
  <div className="mt-3 rounded-lg border border-neon/20 bg-neon/5 p-2.5 text-center">
    <p className="text-[11px] font-bold text-neon/70">
      Награда получена
    </p>
  </div>
)}

  </>
)}

</div>
)}

      {today && (
        <div
  className="rounded-2xl border border-slate-400/20 bg-gradient-to-b from-slate-900/80 via-zinc-950/80 to-black/60 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 24px rgba(148,163,184,0.07), inset 0 0 30px rgba(255,255,255,0.015)',
  }}
>
          <div className="mb-3">
  <p className="text-[9px] font-black tracking-[0.22em] text-slate-500">
    КОНТРОЛЬНЫЙ ВОПРОС
  </p>

  <p className="mt-1 text-sm font-black tracking-wide text-slate-200">
    {today.player_name}
  </p>
</div>

<div className="mb-4 rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3.5">
  <h2 className="text-base font-extrabold leading-snug text-zinc-100">
    {today.question}
  </h2>
</div>
{isSelfQuestion && (
  <div className="mb-3 rounded-2xl border border-amber-300/35 bg-gradient-to-br from-amber-500/15 via-black/40 to-violet-500/10 px-4 py-4 text-center shadow-[0_0_24px_rgba(251,191,36,0.12)]">
    <p className="text-[10px] font-black tracking-[0.22em] text-amber-300">
      ВОПРОС ПРО ТЕБЯ
    </p>

    <p className="mt-2 text-sm font-bold text-white">
      Сегодня ты не можешь голосовать в этом вопросе
    </p>

    <div className="mt-3 rounded-xl border border-amber-300/20 bg-black/30 px-3 py-2.5">
      <p className="text-[9px] font-black tracking-[0.18em] text-amber-300/70">
        УТЕШИТЕЛЬНЫЙ ПРИЗ
      </p>

      <p className="mt-1 text-sm font-black text-amber-100">
        +10 XP · +10 XP ЗВАНИЯ · +10 🪙
      </p>
    </div>
  </div>
)}
         <div className={`grid grid-cols-2 gap-2.5 ${isSelfQuestion ? 'hidden' : ''}`}>
            {['yes', 'no'].map((option) => {
              const isSelected = selected === option
              const wasChosen = today.userVote === option
              const label = option === 'yes' ? 'ДА' : 'НЕТ'
              return (
                <button
                  key={option}
                  onClick={() => !hasVoted && setSelected(option)}
                  disabled={hasVoted}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-5 text-lg font-black tracking-wide transition-all duration-200 ${
  hasVoted
    ? wasChosen
      ? option === 'yes'
        ? 'scale-[1.02] border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.20)]'
        : 'scale-[1.02] border-red-400/70 bg-red-500/15 text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.20)]'
      : 'border-white/5 bg-white/[0.02] text-zinc-600 opacity-35'
    : isSelected
      ? option === 'yes'
        ? 'scale-[1.03] border-emerald-300/80 bg-emerald-500/20 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.28)] active:scale-95'
        : 'scale-[1.03] border-red-300/80 bg-red-500/20 text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.28)] active:scale-95'
      : option === 'yes'
        ? 'border-emerald-500/20 bg-emerald-950/15 text-emerald-200 hover:border-emerald-400/45 hover:bg-emerald-500/10 active:scale-95'
        : 'border-red-500/20 bg-red-950/15 text-red-200 hover:border-red-400/45 hover:bg-red-500/10 active:scale-95'
}`}
                >
                  {label}
                </button>
              )
            })}
          </div>

         {!isSelfQuestion && (hasVoted ? (
  <div className="mt-4 rounded-xl border border-slate-400/15 bg-white/[0.03] p-3 text-center">
    <p className="text-[9px] font-black tracking-[0.2em] text-slate-500">
      РЕШЕНИЕ ЗАФИКСИРОВАНО
    </p>

    <div className="mt-2 flex items-center justify-center gap-2">
      <Check size={15} className="text-slate-300" />
      <p className="text-sm font-black text-zinc-100">
        ТВОЙ ВЫБОР:
        <span className={`ml-1 ${
          today.userVote === 'yes'
            ? 'text-emerald-300'
            : 'text-red-300'
        }`}>
          {today.userVote === 'yes' ? 'ДА' : 'НЕТ'}
        </span>
      </p>
    </div>

    <p className="mt-1.5 text-[10px] text-zinc-500">
      Результат откроется завтра в 08:00
    </p>
  </div>
) : (
            <button
  onClick={handleVote}
  disabled={!selected || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-slate-200 via-zinc-100 to-slate-200 py-3 text-sm font-black tracking-wide text-black transition-all active:scale-95 disabled:opacity-30"
  style={{
    boxShadow: selected
      ? '0 0 20px rgba(226,232,240,0.12)'
      : 'none',
            )}
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
