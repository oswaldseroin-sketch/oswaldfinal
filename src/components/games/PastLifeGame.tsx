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
  players: string[]
  userVote: { selected_index: number; is_correct: boolean } | null
  correctIndex: number | null
}

type YesterdayState = {
  question: string
  player_1: string
  player_2: string
  player_3: string
  correct_index: number
  correctCount: number
  totalCount: number
  userVote: { selected_index: number; is_correct: boolean } | null
}

export default function PastLifeGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [voteResult, setVoteResult] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('past_life', currentUser.id)
      setState(data)
      const today = (data?.today ?? null) as TodayState | null
      if (today?.userVote) setSelected(today.userVote.selected_index)
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
      const result = await api.submitGameVote('past_life', currentUser.id, { selectedIndex: selected })
      setVoteResult({ isCorrect: result.isCorrect!, correctIndex: result.correctIndex! })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка ответа')
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
  const hasAnswered = !!today?.userVote

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 4</p>
          <h1 className="text-xl font-extrabold text-ink">Прошлая жизнь</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {yesterday && (
  <div className="mb-5">
    <button
      onClick={() => setShowYesterdayResults((prev) => !prev)}
      className="flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 transition-all active:scale-[0.98]"
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
      <div
        className="mt-2 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md"
        style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}
      >
        <p className="mb-3 text-sm font-bold text-ink/90">
          {yesterday.question}
        </p>

        <div className="space-y-2">
          {[yesterday.player_1, yesterday.player_2, yesterday.player_3].map(
            (player, i) => {
              const isCorrect = i === yesterday.correct_index
              const isSelected = yesterday.userVote?.selected_index === i

              return (
                <div
                  key={player}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isCorrect
                      ? 'border-amber-400/40 bg-amber-400/10'
                      : 'border-line/50 bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      {player}
                    </span>

                    {isCorrect && <span>🏆</span>}

                    {isSelected && (
                      <Check
                        size={13}
                        className={isCorrect ? 'text-amber-300' : 'text-error'}
                      />
                    )}
                  </div>

                  {isCorrect && (
                    <span className="text-xs font-bold text-amber-200">
                      Правильный ответ
                    </span>
                  )}
                </div>
              )
            },
          )}
        </div>

        <div className="mt-3 text-center text-xs text-ink-muted">
          Правильных ответов: {yesterday.correctCount} из {yesterday.totalCount}
        </div>
      </div>
    )}
  </div>
)}
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
          <p className="text-[10px] font-bold tracking-widest text-neon">ВОПРОС ДНЯ</p>
          <h2 className="mt-1.5 mb-3 text-base font-extrabold leading-snug text-ink">{today.question}</h2>

          <div className="space-y-2">
            {today.players.map((player, i) => {
              const isSelected = selected === i
              const wasChosen = today.userVote?.selected_index === i
              const isCorrectAnswer = today.userVote?.is_correct && wasChosen
              const isWrongAnswer = today.userVote && wasChosen && !today.userVote.is_correct
              return (
                <button
                  key={player}
                  onClick={() => !hasAnswered && setSelected(i)}
                  disabled={hasAnswered}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    hasAnswered
                      ? isCorrectAnswer ? 'border-success/50 bg-success/10' : isWrongAnswer ? 'border-error/40 bg-error/10' : 'border-line/20 bg-black/20 opacity-40'
                      : isSelected ? 'border-neon/60 bg-neon/15 active:scale-95' : 'border-line/40 bg-black/20 hover:border-neon/30 active:scale-95'
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected || wasChosen ? 'border-neon bg-neon text-black' : 'border-line/50'}`}>
                    {(isSelected || wasChosen) && <Check size={14} />}
                  </div>
                  <span className={`text-sm font-bold ${isSelected || wasChosen ? 'text-ink' : 'text-ink/80'}`}>{player}</span>
                </button>
              )
            })}
          </div>

          {hasAnswered ? (
            <div className={`mt-4 rounded-xl border p-3 text-center ${voteResult?.isCorrect || today.userVote?.is_correct ? 'border-success/30 bg-success/10' : 'border-error/30 bg-error/10'}`}>
              <div className="flex items-center justify-center gap-2">
                <Check size={16} className={voteResult?.isCorrect || today.userVote?.is_correct ? 'text-success' : 'text-error'} />
                <p className={`text-sm font-extrabold ${voteResult?.isCorrect || today.userVote?.is_correct ? 'text-success' : 'text-error'}`}>
                  {voteResult?.isCorrect || today.userVote?.is_correct ? 'Правильно!' : 'Неправильно'}
                </p>
              </div>
              {(voteResult?.isCorrect || today.userVote?.is_correct) && (
                <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥇 +3 XP звания +3🪙</p>
              )}
              {!(voteResult?.isCorrect || today.userVote?.is_correct) && (
                <p className="mt-1 text-[11px] text-ink-muted">Правильный ответ: {today.players[today.correctIndex ?? 0]}</p>
              )}
            </div>
          ) : (
            <button onClick={handleVote} disabled={selected === null || voting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-extrabold text-black transition active:scale-95 disabled:opacity-40" style={{ boxShadow: '0 0 16px rgba(0,229,255,0.3)' }}>
              {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Ответить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
