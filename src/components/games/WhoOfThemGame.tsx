import { useCallback, useEffect, useState } from 'react'
import { Check, Trophy, Gift, Loader as Loader2, ChevronDown } from 'lucide-react'
import { api, type GameState, type GameClaimResult, type PlayerRow } from '../../lib/api'
import { useApp } from '../../context/AppContext'


type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  question: string
  player_1: string
  player_2: string
  userVote: string | null
  gameDay?: string | null
}

type YesterdayState = {
  question: string
  player_1: string
  player_2: string
  votes: Record<string, number>
  winner: string | null
  userVote: string | null
  reward: { participation_rewarded: boolean; result_rewarded: boolean; xp_awarded: number; title_xp_awarded: number; coins_awarded: number } | null
}





export default function WhoOfThemGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<GameClaimResult | null>(null)
  const [resultsClaimed, setResultsClaimed] = useState(false)
  const [playerMap, setPlayerMap] = useState<Record<string, number>>({}) 
  const [votedChoice, setVotedChoice] = useState<string | null>(null)
  const [yesterdayOpen, setYesterdayOpen] = useState(false)

  useEffect(() => {
    api.getPlayers().then((players: PlayerRow[]) => {
      const map: Record<string, number> = {}
      for (const p of players) map[p.full_name] = p.id
      setPlayerMap(map)
     
    }).catch(() => {})
  }, [currentUser])

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('who_of_them', currentUser.id)
      setState(data)
      const today = (data?.today ?? null) as TodayState | null
   
    if (today?.userVote) {
  setSelected(today.userVote)
  setVotedChoice(today.userVote)
} else {
  setSelected(null)
  setVotedChoice(null)
}
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
      const numericId = playerMap[selected]
      if (!numericId) { setError('Не удалось определить ID игрока'); return }
      const today = (state?.today ?? null) as TodayState | null
      
      try {
        await api.submitGameVote('who_of_them', currentUser.id, { chosenPlayerId: numericId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('ALREADY_VOTED') || msg.includes('уже проголосовали')) {
          setVotedChoice(selected)
          
          await loadState()
          onProfileUpdate()
          return
        }
        throw err
      }
      setVotedChoice(selected)
      
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
      const result = await api.claimGameResults('who_of_them', currentUser.id)
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
  const hasVoted = !!votedChoice || !!today?.userVote

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 2</p>
          <h1 className="text-xl font-extrabold text-ink">Кто из них?</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {yesterday && (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}>
          <button
  type="button"
  onClick={() => setYesterdayOpen((v) => !v)}
  className={`flex w-full items-center justify-between ${yesterdayOpen ? 'mb-3' : ''}`}
>
  <div className="flex items-center gap-2">
    <Trophy size={16} className="text-amber-300" />
    <p className="text-[10px] font-bold tracking-widest text-amber-300">
      ВЧЕРАШНИЙ РЕЗУЛЬТАТ
    </p>
  </div>

  <ChevronDown
    size={18}
    className={`text-amber-300 transition-transform duration-200 ${
      yesterdayOpen ? 'rotate-180' : ''
    }`}
  />
</button>
          {yesterdayOpen && (
  <>
          <p className="mb-3 text-sm font-bold text-ink/90">{yesterday.question}</p>
          <div className="space-y-2">
            {[yesterday.player_1, yesterday.player_2].map((player) => {
              const votes = yesterday.votes[player] || 0
              const isWinner = yesterday.winner === player
              const isSelected = yesterday.userVote === player
              return (
                <div key={player} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isWinner ? 'border-amber-400/40 bg-amber-400/10' : 'border-line/50 bg-black/20'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{player}</span>
                    {isWinner && <span>🏆</span>}
                    {isSelected && (
  <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-amber-300">
    ВАШ ГОЛОС
  </span>
)}
                  </div>
                  <span className="text-sm font-extrabold text-amber-200">{votes}</span>
                </div>
              )
            })}
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
              <p className="text-[11px] font-bold text-neon/70">Награда получена</p>
            </div>
          )}
      </>
)}
        </div>
      )}

      {today && (
       <div
  className="rounded-2xl border border-orange-400/35 bg-gradient-to-b from-orange-500/10 via-card/70 to-black/30 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 24px rgba(251,146,60,0.12), inset 0 0 24px rgba(251,146,60,0.04)',
  }}
>
          <div className="mb-2 flex items-center gap-2">
  <span className="text-lg">⚔️</span>
  <p className="text-[10px] font-black tracking-[0.18em] text-orange-300">
    ДУЭЛЬ ДНЯ
  </p>
  <div className="h-px flex-1 bg-gradient-to-r from-orange-400/40 to-transparent" />
</div>
          <h2 className="mt-1.5 mb-3 text-base font-extrabold leading-snug text-ink">{today.question}</h2>

          <div className="space-y-2">
            {[today.player_1, today.player_2].map((player) => {
              const isSelected = selected === player
              const wasChosen = votedChoice === player || today.userVote === player
              return (
                <button
                  key={player}
                  onClick={() => !hasVoted && setSelected(player)}
                  disabled={hasVoted}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
  hasVoted
    ? wasChosen
      ? 'scale-[1.02] border-orange-400/70 bg-orange-500/20 shadow-[0_0_18px_rgba(251,146,60,0.22)]'
      : 'border-line/20 bg-black/20 opacity-35'
    : isSelected
      ? 'scale-[1.02] border-orange-400/80 bg-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.28)]'
      : 'border-orange-400/20 bg-black/25 hover:border-orange-400/50 hover:bg-orange-500/10 active:scale-95'
}`}
                >
                  <div
  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black transition-all duration-200 ${
    isSelected || wasChosen
      ? 'border-orange-300 bg-orange-400 text-black shadow-[0_0_14px_rgba(251,146,60,0.65)]'
      : 'border-orange-400/30 bg-black/30 text-orange-200'
  }`}
>
  {isSelected || wasChosen ? <Check size={16} /> : '⚡'}
</div>
                   
                  <span
  className={`text-sm font-extrabold tracking-wide ${
    isSelected || wasChosen
      ? 'text-orange-100'
      : 'text-ink/85'
  }`}
>
  {player}
</span>
                </button>
              )
            })}
          </div>

          {hasVoted ? (
            <div
  className="relative mt-4 overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-black/40 to-amber-500/5 p-4 text-center"
  style={{
    boxShadow:
      '0 0 24px rgba(251,146,60,0.10), inset 0 0 24px rgba(251,146,60,0.04)',
  }}
>
  <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
  <div className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />

  <div className="relative">
    <div className="flex items-center justify-center gap-2">
      <span className="text-orange-300">⚡</span>

      <p className="text-[9px] font-black tracking-[0.24em] text-orange-300">
        ВЫБОР ЗАФИКСИРОВАН
      </p>

      <span className="text-orange-300">⚡</span>
    </div>

    <p
      className="mt-2 text-sm font-black text-orange-100"
      style={{ textShadow: '0 0 12px rgba(251,146,60,0.35)' }}
    >
      Ты сделал свой выбор
    </p>

    <div className="mx-auto mt-3 h-px w-28 bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />

    <p className="mt-2 text-[10px] text-ink-muted">
      Результат откроется завтра в 08:00
    </p>
  </div>
</div>
          ) : (
           <button
  onClick={handleVote}
  disabled={!selected || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300/50 bg-gradient-to-r from-orange-500 to-amber-400 py-3 text-sm font-extrabold text-black transition-all duration-200 active:scale-95 disabled:opacity-30"
  style={{
    boxShadow: selected
      ? '0 0 22px rgba(251,146,60,0.38)'
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
