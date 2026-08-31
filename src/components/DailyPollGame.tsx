import { useCallback, useEffect, useState } from 'react'
import { Check, Trophy, Gift, Loader as Loader2 } from 'lucide-react'
import { api, type DailyPollState, type DailyPollClaimResult } from '../lib/api'
import { useApp } from '../context/AppContext'
import { workersList } from '../lib/data'

type Props = { onBack: () => void; onProfileUpdate?: () => void }

const PLACEMENT_ICONS = ['🥇', '🥈', '🥉']
const MAX_SELECTION = 3

export default function DailyPollGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<DailyPollState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [voting, setVoting] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<DailyPollClaimResult | null>(null)
  const [resultsClaimed, setResultsClaimed] = useState(false)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getDailyPollState(currentUser.id)
      setState(data)
      if (data.today.userVote) {
        setSelected(data.today.userVote)
      }
      if (data.yesterday?.reward?.result_rewarded) {
        setResultsClaimed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const toggleCandidate = (name: string) => {
    if (state?.today.userVote) return
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name)
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, name]
    })
  }

  const handleVote = async () => {
    if (!currentUser || selected.length === 0) return
    setVoting(true)
    setError('')
    try {
      await api.voteDailyPoll(currentUser.id, selected)
      await loadState()
      onProfileUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка голосования')
    } finally {
      setVoting(false)
    }
  }

  const handleClaimResults = async () => {
    if (!currentUser || resultsClaimed) return
    setClaiming(true)
    setError('')
    try {
      const result = await api.claimDailyPollResults(currentUser.id)
      setClaimResult(result)
      setResultsClaimed(true)
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка получения награды')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-neon" />
        </div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      </div>
    )
  }

  const hasVoted = !!state?.today.userVote
  const yesterday = state?.yesterday
  const allWorkers = workersList.map((w) => w.name)

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        ← Назад
      </button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🔮</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 1</p>
          <h1 className="text-xl font-extrabold text-ink">Вопрос дня</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center">
          <p className="text-xs font-bold text-error">{error}</p>
        </div>
      )}

         {/* ─── Yesterday's results ─── */}
      {yesterday && (
        <div className="mb-5">
          <button
            onClick={() => setShowYesterdayResults((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 transition-all active:scale-[0.98]"
            style={{
              boxShadow: showYesterdayResults
                ? '0 0 18px rgba(255,191,0,0.18)'
                : '0 0 10px rgba(255,191,0,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <Trophy size={17} className="text-amber-300" />
              <span className="text-[12px] font-extrabold tracking-wide text-amber-300">
                Вчерашний результат
              </span>
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
                {yesterday.results
                  .filter((r) => r.votes > 0)
                  .slice(0, 3)
                  .map((r, i) => {
                    const isSelectedByUser = yesterday.userVote?.includes(r.candidate)

                    return (
                      <div
                        key={r.candidate}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          isSelectedByUser
                            ? 'border-amber-400/40 bg-amber-400/10'
                            : 'border-line/50 bg-black/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {PLACEMENT_ICONS[i] || '📦'}
                          </span>

                          <span className="text-sm font-bold text-ink">
                            {r.candidate}
                          </span>

                          {isSelectedByUser && (
                            <Check size={13} className="text-amber-300" />
                          )}
                        </div>

                        <span className="text-sm font-extrabold text-amber-200">
                          {r.votes}
                        </span>
                      </div>
                    )
                  })}
              </div>

              {yesterday.userVote && !resultsClaimed && (
                <button
                  onClick={handleClaimResults}
                  disabled={claiming}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 py-2.5 text-sm font-extrabold text-amber-200 transition hover:bg-amber-400/25 active:scale-95 disabled:opacity-50"
                >
                  {claiming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Gift size={16} />
                  )}
                  Получить награду
                </button>
              )}

              {claimResult && claimResult.totalXp > 0 && (
                <div className="mt-3 rounded-lg border border-neon/30 bg-neon/10 p-3 text-center">
                  <p className="text-xs font-bold text-neon">
                    Награда получена!
                  </p>

                  <p
                    className="mt-1 text-sm font-extrabold text-neon"
                    style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}
                  >
                    +{claimResult.totalXp} XP
                  </p>

                  {claimResult.breakdown?.map((b, i) => (
                    <p key={i} className="mt-1 text-[10px] text-ink-muted">
                      {PLACEMENT_ICONS[b.placement - 1]} {b.candidate} — +{b.xp} XP
                    </p>
                  ))}
                </div>
              )}

              {claimResult &&
                claimResult.totalXp === 0 &&
                claimResult.success && (
                  <div className="mt-3 rounded-lg border border-line/40 bg-black/20 p-3 text-center">
                    <p className="text-xs text-ink-muted">
                      {claimResult.message ||
                        'Ваши кандидаты не попали в ТОП-3'}
                    </p>
                  </div>
                )}

              {resultsClaimed && yesterday.reward && (
                <div className="mt-3 rounded-lg border border-neon/20 bg-neon/5 p-2.5 text-center">
                  <p className="text-[11px] font-bold text-neon/70">
                    Награда получена: +{yesterday.reward.xp_awarded} XP
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {state && (
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
          <p className="text-[10px] font-bold tracking-widest text-neon">ВОПРОС ДНЯ</p>
          <h2 className="mt-1.5 mb-3 text-base font-extrabold leading-snug text-ink">{state.today.question}</h2>

          {!hasVoted && (
            <p className="mb-3 text-xs font-bold text-ink-muted">
              Выберите до {MAX_SELECTION} человек:
            </p>
          )}

         {/* Full employee list — compact scroll */}
<div className="max-h-[176px] overflow-y-auto pr-1">
  <div className="grid grid-cols-2 gap-1.5">
            {allWorkers.map((name) => {
 
              const isSelected = selected.includes(name)
              const wasChosen = state.today.userVote?.includes(name)
              const isMaxed = !hasVoted && selected.length >= MAX_SELECTION && !isSelected
              return (
                <button
                  key={name}
                  onClick={() => toggleCandidate(name)}
                  disabled={hasVoted || isMaxed}
                 className={`relative flex min-h-[52px] items-center gap-2 overflow-hidden rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
  hasVoted
    ? wasChosen
      ? 'scale-[1.02] border-purple-400/70 bg-purple-500/20 shadow-[0_0_18px_rgba(168,85,247,0.22)]'
      : 'border-line/20 bg-black/20 opacity-35'
    : isSelected
      ? 'scale-[1.02] border-purple-400/80 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.28)]'
      : isMaxed
        ? 'border-line/20 bg-black/20 opacity-25'
        : 'border-purple-400/15 bg-black/25 hover:border-purple-400/45 hover:bg-purple-500/10 active:scale-95'
}`}
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected || wasChosen
                      ? 'border-neon bg-neon text-black'
                      : 'border-line/50'
                  }`}>
                    {(isSelected || wasChosen) && <Check size={13} />}
                  </div>
                 <span
  className={`truncate text-[10px] font-bold ${
    isSelected || wasChosen ? 'text-ink' : 'text-ink/80'
  }`}
>
  {name}
</span>
                </button>
              )
            })}
    </div>
          </div>

          {/* Vote button or confirmation */}
          {hasVoted ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Check size={16} className="text-success" />
                <p className="text-sm font-extrabold text-success">Голос учтён!</p>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">Результаты будут доступны завтра в 08:00</p>
              {state.today.userVote && state.today.userVote.length > 0 && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  Вы выбрали: {state.today.userVote.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                <span className="text-ink-muted">Выбрано: {selected.length} / {MAX_SELECTION}</span>
                {selected.length > 0 && (
                  <button onClick={() => setSelected([])} className="text-neon/60 hover:text-neon">
                    Очистить
                  </button>
                )}
              </div>
              <button
                onClick={handleVote}
                disabled={selected.length === 0 || voting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-extrabold text-black transition active:scale-95 disabled:opacity-40"
                style={{ boxShadow: '0 0 16px rgba(0,229,255,0.3)' }}
              >
                {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Проголосовать
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
