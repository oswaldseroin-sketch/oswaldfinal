import { useCallback, useEffect, useState } from 'react'
import { Check, X, Loader as Loader2, Heart } from 'lucide-react'
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

export default function SecretLoveGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('secret_love', currentUser.id)
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
      await api.submitGameVote('secret_love', currentUser.id, { selectedIndex: selected })
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
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
  const hasAnswered = !!today?.userVote

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

     <div className="mb-4 flex items-center gap-2">
  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10">
    <span className="text-lg">👁️</span>
  </div>

  <div>
    <p className="text-[10px] font-black tracking-[0.2em] text-indigo-300/70">
      МИНИ-ИГРА 9
    </p>
    <h1 className="text-xl font-black text-slate-100">
      Что они думают о тебе?
    </h1>
  </div>
</div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {today && (
      <div
  className="rounded-2xl border border-indigo-400/20 bg-gradient-to-b from-indigo-950/25 via-slate-950/80 to-black/50 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 24px rgba(99,102,241,0.10), inset 0 0 28px rgba(226,232,240,0.025)',
  }}
>
          <div className="mb-3 flex items-center gap-2">
  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/5">
    <span className="text-xs">👁️</span>
  </div>

  <div>
    <p className="text-[9px] font-black tracking-[0.22em] text-indigo-300/70">
      КАСАЕТСЯ ЛИЧНО ТЕБЯ
    </p>
    <p className="text-[10px] font-bold text-slate-400">
      Психологический выбор
    </p>
  </div>
</div>
          <div className="mb-4 rounded-xl border border-indigo-400/15 bg-black/25 px-3.5 py-3.5">
  <p className="mb-1 text-[9px] font-black tracking-[0.2em] text-slate-500">
    ЛИЧНЫЙ ВОПРОС
  </p>

  <h2 className="text-base font-extrabold leading-snug text-slate-100">
    {today.question}
  </h2>
</div>

          <div className="space-y-2">
            {today.players.map((player, i) => {
              const isSelected = selected === i
              const wasChosen = today.userVote?.selected_index === i
              const isCorrect = today.userVote?.is_correct && wasChosen
              const isWrong = today.userVote && wasChosen && !today.userVote.is_correct
              const isRevealedCorrect = hasAnswered && i === today.correctIndex && !wasChosen
              return (
                <button
                  key={i}
                  onClick={() => !hasAnswered && setSelected(i)}
                  disabled={hasAnswered}
                 className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
  hasAnswered
    ? isCorrect
      ? 'scale-[1.02] border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.16)]'
      : isWrong
        ? 'border-red-400/35 bg-red-500/10 opacity-60'
        : isRevealedCorrect
          ? 'border-emerald-400/35 bg-emerald-500/5'
          : 'border-white/5 bg-black/20 opacity-30'
    : isSelected
      ? 'scale-[1.02] border-indigo-300/70 bg-indigo-500/15 shadow-[0_0_22px_rgba(129,140,248,0.22)] active:scale-95'
      : 'border-indigo-400/15 bg-slate-950/50 hover:border-indigo-300/40 hover:bg-indigo-500/10 active:scale-[0.98]'
}`}
                >
                  <div
  className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black tracking-wider transition-all ${
    isCorrect
      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
      : isWrong
        ? 'border-red-400/35 bg-red-500/10 text-red-300'
        : isRevealedCorrect
          ? 'border-emerald-400/30 bg-emerald-500/5 text-emerald-400'
          : isSelected
            ? 'border-indigo-300/60 bg-indigo-500/15 text-indigo-100'
            : 'border-indigo-400/20 bg-black/25 text-slate-400'
  }`}
>
  {isCorrect
    ? <Check size={14} />
    : isWrong
      ? <X size={14} />
      : `0${i + 1}`}
</div>
                  <span className={`flex-1 text-sm font-bold ${
                    isCorrect ? 'text-success' : isWrong ? 'text-error' : isRevealedCorrect ? 'text-success/80' : 'text-ink'
                  }`}>{player}</span>
                  {isCorrect && (
  <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300">
    СОВПАЛО
  </span>
)}
                  {isRevealedCorrect && <span className="text-xs text-success">Это он</span>}
                </button>
              )
            })}
          </div>

          {hasAnswered ? (
            <div
  className={`mt-4 rounded-xl border p-3 text-center ${
    today.userVote?.is_correct
      ? 'border-indigo-300/35 bg-gradient-to-b from-indigo-500/10 to-black/20 shadow-[0_0_20px_rgba(129,140,248,0.12)]'
      : 'border-slate-500/25 bg-gradient-to-b from-slate-800/30 to-black/30'
  }`}
>
              <p className={`text-sm font-extrabold ${today.userVote?.is_correct ? 'text-success' : 'text-error'}`}>
                {today.userVote?.is_correct ? 'Правильно!' : 'Неправильно'}
              </p>
              {today.userVote?.is_correct ? (
                <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥈 +2 XP звания +2🪙</p>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">Правильный ответ: {today.players[today.correctIndex || 0]}</p>
              )}
              <p className="mt-1 text-[11px] text-ink-muted">Базовая награда: +2 XP +1🪙</p>
            </div>
          ) : (
            <button
  onClick={handleVote}
  disabled={selected === null || voting}
  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-300/30 bg-gradient-to-r from-indigo-600 via-indigo-500 to-slate-500 py-3 text-sm font-black tracking-wide text-white transition-all active:scale-95 disabled:opacity-30"
  style={{
    boxShadow: selected !== null
      ? '0 0 22px rgba(99,102,241,0.24)'
      : 'none',
  }}
>
             {voting ? (
  <Loader2 size={16} className="animate-spin" />
) : (
  <span className="text-base">◈</span>
)}
Зафиксировать выбор
            </button>
          )}
        </div>
      )}
    </div>
  )
}
