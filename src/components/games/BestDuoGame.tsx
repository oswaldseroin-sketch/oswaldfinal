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
  team1: string[]
  team2: string[]
  userVote: number | null
}

type YesterdayState = {
  question: string
  team1: string[]
  team2: string[]
  team1Votes: number
  team2Votes: number
  winner: number | null
  userVote: number | null
  reward: { participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number; coins_awarded: number } | null
}

export default function BestDuoGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<GameClaimResult | null>(null)
  const [resultsClaimed, setResultsClaimed] = useState(false)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('best_duo', currentUser.id)
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
    if (!currentUser || selected === null) return
    setVoting(true)
    setError('')
    try {
      await api.submitGameVote('best_duo', currentUser.id, { selectedTeam: selected })
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
      const result = await api.claimGameResults('best_duo', currentUser.id)
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

  const TeamCard = ({ team, teamNum, players, votes, isWinner, isSelected, isChosen, onClick }: {
    team: string; teamNum: number; players: string[]; votes?: number; isWinner?: boolean;
    isSelected: boolean; isChosen: boolean; onClick: () => void
  }) => (
    <button
      onClick={onClick}
      disabled={hasVoted}
      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
  hasVoted
    ? isChosen
      ? teamNum === 1
        ? 'scale-[1.02] border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.22)]'
        : 'scale-[1.02] border-red-400/70 bg-red-500/15 shadow-[0_0_20px_rgba(248,113,113,0.22)]'
      : 'border-line/20 bg-black/20 opacity-35'
    : isSelected
      ? teamNum === 1
        ? 'scale-[1.03] border-cyan-300/80 bg-cyan-500/20 shadow-[0_0_24px_rgba(34,211,238,0.30)] active:scale-95'
        : 'scale-[1.03] border-red-300/80 bg-red-500/20 shadow-[0_0_24px_rgba(248,113,113,0.30)] active:scale-95'
      : teamNum === 1
        ? 'border-cyan-500/25 bg-cyan-950/20 hover:border-cyan-400/50 hover:bg-cyan-500/10 active:scale-95'
        : 'border-red-500/25 bg-red-950/20 hover:border-red-400/50 hover:bg-red-500/10 active:scale-95'
} ${
  isWinner
    ? 'ring-2 ring-amber-300 border-amber-300/80 bg-amber-400/15 shadow-[0_0_28px_rgba(251,191,36,0.35)]'
    : ''
}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
       <span
  className={`text-[10px] font-black tracking-[0.18em] ${
    teamNum === 1
      ? 'text-cyan-300'
      : 'text-red-300'
  }`}
>
  {team}
</span>
       
      </div>
     <p
  className={`text-sm font-extrabold ${
    teamNum === 1 ? 'text-cyan-100' : 'text-red-100'
  }`}
>
  {players[0]}
</p>

<p
  className={`text-sm font-extrabold ${
    teamNum === 1 ? 'text-cyan-100' : 'text-red-100'
  }`}
>
  {players[1]}
</p>
    
  <div
   className={`${votes !== undefined ? 'hidden' : 'flex'} h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
      isSelected || isChosen
        ? teamNum === 1
          ? 'border-cyan-300 bg-cyan-400 text-black shadow-[0_0_14px_rgba(34,211,238,0.60)]'
          : 'border-red-300 bg-red-400 text-black shadow-[0_0_14px_rgba(248,113,113,0.60)]'
        : teamNum === 1
          ? 'border-cyan-500/30 bg-cyan-950/20'
          : 'border-red-500/30 bg-red-950/20'
    }`}
  >
    {isChosen ? (
      <span className="text-[8px] font-black tracking-tight">ВЫ</span>
    ) : isSelected ? (
      <Check size={13} />
    ) : null}
  </div>

    </button>
  )

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

     <div className="mb-4 flex items-center gap-2">
  <span className="text-2xl">⚔️</span>

  <div>
    <p className="text-[10px] font-black tracking-[0.18em] text-amber-300">
      МИНИ-ИГРА 5
    </p>

    <h1 className="text-xl font-black text-ink">
      Лучший дуэт
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
          <p className="mb-3 text-sm font-bold text-ink/90">{yesterday.question}</p>
    <div className="mb-2 flex items-center justify-center gap-3">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-400/50" />

  <span
    className="text-xl font-black italic tracking-wider text-amber-300"
    style={{
      textShadow:
        '0 0 8px rgba(251,191,36,0.8), 0 0 18px rgba(251,191,36,0.35)',
    }}
  >
    VS
  </span>

  <div className="h-px flex-1 bg-gradient-to-r from-red-400/50 to-transparent" />
</div>
          <div className="grid grid-cols-2 gap-2.5">
            <TeamCard team="КОМАНДА 1" teamNum={1} players={yesterday.team1} votes={yesterday.team1Votes} isWinner={yesterday.winner === 1} isSelected={false} isChosen={yesterday.userVote === 1} onClick={() => {}} />
            <TeamCard team="КОМАНДА 2" teamNum={2} players={yesterday.team2} votes={yesterday.team2Votes} isWinner={yesterday.winner === 2} isSelected={false} isChosen={yesterday.userVote === 2} onClick={() => {}} />
          </div>
          {!yesterday.winner && <p className="mt-2 text-center text-xs text-ink-muted">Ничья — награда не выдаётся</p>}
          {yesterday.winner && (
            <p className="mt-2 text-center text-xs font-bold text-amber-300">
              🏆 Победили: {(yesterday.winner === 1 ? yesterday.team1 : yesterday.team2).join(' + ')}
            </p>
          )}

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
            <div className="mt-3 rounded-lg border border-neon/20 bg-neon/5 p-2.5 text-center"><p className="text-[11px] font-bold text-neon/70">Награда получена</p></div>
          )}
      </>
)}
        </div>
      )}

      {today && (
        <div
  className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-slate-900/80 via-black/60 to-slate-950/80 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '-12px 0 28px rgba(34,211,238,0.08), 12px 0 28px rgba(248,113,113,0.08), inset 0 0 30px rgba(251,191,36,0.025)',
  }}
>
         <div className="mb-2 flex items-center gap-2">
  <span className="text-sm">⚔️</span>

  <p className="text-[10px] font-black tracking-[0.2em] text-amber-300">
    АРЕНА ДНЯ
  </p>

  <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
</div>
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-black/30 px-3 py-3 text-center">
  <p className="mb-1 text-[9px] font-black tracking-[0.2em] text-amber-400/70">
    ⚡ ИСПЫТАНИЕ ⚡
  </p>

  <h2 className="text-base font-black leading-snug text-ink">
    {today.question}
  </h2>
</div>

          <div className="grid grid-cols-2 gap-2.5">
            <TeamCard team="КОМАНДА 1" teamNum={1} players={today.team1} isSelected={selected === 1} isChosen={today.userVote === 1} onClick={() => setSelected(1)} />
            <TeamCard team="КОМАНДА 2" teamNum={2} players={today.team2} isSelected={selected === 2} isChosen={today.userVote === 2} onClick={() => setSelected(2)} />
          </div>

          {hasVoted ? (
          <div
  className="relative mt-4 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-black/45 to-slate-950/60 p-4 text-center"
  style={{
    boxShadow:
      '0 0 26px rgba(251,191,36,0.10), inset 0 0 24px rgba(251,191,36,0.035)',
  }}
>
  <div className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/5 blur-2xl" />
  <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-red-400/5 blur-2xl" />

  <div className="relative">
    <div className="flex items-center justify-center gap-2">
      <span className="text-amber-300">⚔</span>

      <p className="text-[9px] font-black tracking-[0.25em] text-amber-300">
        РЕШЕНИЕ ЗАФИКСИРОВАНО
      </p>

      <span className="text-amber-300">⚔</span>
    </div>

    <p
      className="mt-2 text-sm font-black tracking-wide text-amber-100"
      style={{ textShadow: '0 0 14px rgba(251,191,36,0.4)' }}
    >
      Твой выбор принят
    </p>

    {today.userVote && (
      <div className="mt-3 rounded-xl border border-amber-400/20 bg-black/30 px-3 py-2.5">
        <p className="text-[8px] font-black tracking-[0.2em] text-amber-400/60">
          ТЫ СТАВИШЬ НА
        </p>

        <p
          className={`mt-1 text-sm font-black ${
            today.userVote === 1 ? 'text-cyan-200' : 'text-red-200'
          }`}
        >
          {(today.userVote === 1 ? today.team1 : today.team2).join(' + ')}
        </p>
      </div>
    )}

    <div className="mx-auto mt-3 h-px w-32 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

    <p className="mt-2 text-[10px] text-ink-muted">
      Результат арены откроется завтра в 08:00
    </p>
  </div>
</div>
          ) : (
            <button
  onClick={handleVote}
  disabled={selected === null || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 py-3 text-sm font-black tracking-wide text-black transition-all duration-200 active:scale-95 disabled:opacity-30"
  style={{
    boxShadow:
      selected !== null
        ? '0 0 24px rgba(251,191,36,0.38)'
        : 'none',
  }}
>
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Проголосовать
            </button>
          )}
        </div>
      )}
    </div>
  )
}
