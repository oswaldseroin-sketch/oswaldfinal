import { useState, useEffect, useCallback, useRef } from 'react'
import SwipeBack from '../components/SwipeBack'
import { api, type TestQuestionRow, type TestBlockAssignment } from '../lib/api'
import {
  BLOCKS, sortQuestions, questionsForBlock, countAvailable,
  saveProgress, loadProgress, clearProgress,
  type AnswerRecord, type SavedProgress, type BlockDef,
} from '../lib/testProgress'
import { Check, X, ChevronLeft, ChevronRight, RotateCcw, Award, TriangleAlert as AlertTriangle, Layers, Sword, Shield, Flame, Sparkles, Crown } from 'lucide-react'

type Props = {
  onBack: () => void
}

type Phase = 'loading' | 'error' | 'menu' | 'resumePrompt' | 'playing' | 'finished' | 'review'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TestsPanelTab({ onBack }: Props) {
  const [allQuestions, setAllQuestions] = useState<TestQuestionRow[]>([])
  const [allSorted, setAllSorted] = useState<TestQuestionRow[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null)

  // Active test state
  const [activeBlock, setActiveBlock] = useState<BlockDef | null>(null)
  const [queue, setQueue] = useState<TestQuestionRow[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Review state
  const [reviewQueue, setReviewQueue] = useState<TestQuestionRow[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewAnswers, setReviewAnswers] = useState<AnswerRecord[]>([])
  const [reviewSelected, setReviewSelected] = useState<number | null>(null)
  const [reviewRevealed, setReviewRevealed] = useState(false)
  const [reviewStillWrong, setReviewStillWrong] = useState<Set<string>>(new Set())
  const [reviewFixed, setReviewFixed] = useState(0)
  const [reviewActive, setReviewActive] = useState(false)

  // ---- Load questions on mount ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPhase('loading')
      setErrorMsg('')
      try {
        const [rows, blocks] = await Promise.all([
          api.getActiveTestQuestions(),
          api.getTestBlockAssignments(),
        ])
        if (cancelled) return
        const blockMap = new Map(blocks.map((b: TestBlockAssignment) => [b.question_id, b.block_number]))
        const merged = rows.map((q: TestQuestionRow) => ({
          ...q,
          block_number: blockMap.get(q.question_id) ?? null,
        }))
        const sorted = sortQuestions(merged)
        setAllQuestions(merged)
        setAllSorted(sorted)
        const saved = loadProgress()
        if (saved && saved.queue.length > 0) {
          setSavedProgress(saved)
          setPhase('resumePrompt')
        } else {
          setPhase('menu')
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Ошибка загрузки')
          setPhase('error')
        }
      }
    })()
    return () => {
      cancelled = true
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  // ---- Save progress whenever state changes during play/review ----
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'review') return
    if (!activeBlock) return
    const progress: SavedProgress = {
      blockId: activeBlock.id,
      blockLabel: activeBlock.label,
      mode: activeBlock.isMega ? 'mega' : 'block',
      queue,
      index: idx,
      answers,
      phase: reviewActive ? 'review' : 'playing',
      reviewQueue,
      reviewIndex: reviewIdx,
      reviewAnswers,
      reviewFixed,
      reviewStillWrong: [...reviewStillWrong],
      savedAt: Date.now(),
    }
    saveProgress(progress)
  }, [phase, activeBlock, queue, idx, answers, reviewActive, reviewQueue, reviewIdx, reviewAnswers, reviewFixed, reviewStillWrong])

  // ---- Start a block ----
  const startBlock = useCallback((block: BlockDef) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    const blockQuestions = questionsForBlock(allSorted, block).filter(q => q.correct_answer !== null)
    if (blockQuestions.length === 0) return
    const shuffled = shuffle(blockQuestions)
    setActiveBlock(block)
    setQueue(shuffled)
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setRevealed(false)
    setReviewActive(false)
    setReviewQueue([])
    setReviewIdx(0)
    setReviewAnswers([])
    setReviewSelected(null)
    setReviewRevealed(false)
    setReviewStillWrong(new Set())
    setReviewFixed(0)
    setPhase('playing')
  }, [allSorted])

  // ---- Resume saved progress ----
  const resumeProgress = useCallback(() => {
    const saved = savedProgress
    if (!saved) {
      setPhase('menu')
      return
    }
    const block = BLOCKS.find(b => b.id === saved.blockId) || null
    setActiveBlock(block)
    setQueue(saved.queue)
    setIdx(saved.index)
    setAnswers(saved.answers)
    setReviewActive(saved.phase === 'review')
    setReviewQueue(saved.reviewQueue || [])
    setReviewIdx(saved.reviewIndex || 0)
    setReviewAnswers(saved.reviewAnswers || [])
    setReviewFixed(saved.reviewFixed || 0)
    setReviewStillWrong(new Set(saved.reviewStillWrong || []))
    if (saved.phase === 'review') {
      // Restore review question display state
      const rq = saved.reviewQueue?.[saved.reviewIndex]
      if (rq) {
        const ra = saved.reviewAnswers?.[saved.reviewIndex]
        setReviewSelected(ra ? ra.selected : null)
        setReviewRevealed(!!ra)
      }
      setPhase('review')
    } else {
      const a = saved.answers[saved.index]
      setSelected(a ? a.selected : null)
      setRevealed(!!a)
      setPhase('playing')
    }
    setSavedProgress(null)
  }, [savedProgress])

  const dismissSavedProgress = useCallback(() => {
    clearProgress()
    setSavedProgress(null)
    setPhase('menu')
  }, [])

  // ---- Answer selection (main test) ----
  const selectAnswer = useCallback((optionIdx: number) => {
    if (revealed) return
    const q = queue[idx]
    const isCorrect = optionIdx === q.correct_answer
    setSelected(optionIdx)
    setRevealed(true)
    setAnswers(prev => {
      const next = [...prev]
      next[idx] = {
        questionId: q.question_id,
        selected: optionIdx,
        correctAnswer: q.correct_answer ?? 0,
        isCorrect,
      }
      return next
    })
    advanceTimer.current = setTimeout(() => {
      if (idx + 1 >= queue.length) {
        setPhase('finished')
      } else {
        setIdx(i => i + 1)
        setSelected(null)
        setRevealed(false)
      }
    }, 500)
  }, [revealed, queue, idx])

  const goToPrev = useCallback(() => {
    if (idx === 0) return
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setIdx(i => i - 1)
    const prevAnswer = answers[idx - 1]
    if (prevAnswer) {
      setSelected(prevAnswer.selected)
      setRevealed(true)
    } else {
      setSelected(null)
      setRevealed(false)
    }
  }, [idx, answers])

  // ---- Review (Работа над ошибками) ----
  const startReview = useCallback(() => {
    const wrongAnswers = answers.filter(a => !a.isCorrect)
    const wrongQs = wrongAnswers
      .map(a => queue.find(q => q.question_id === a.questionId))
      .filter((q): q is TestQuestionRow => q !== undefined)
    if (wrongQs.length === 0) return
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setReviewQueue(wrongQs)
    setReviewIdx(0)
    setReviewAnswers([])
    setReviewSelected(null)
    setReviewRevealed(false)
    setReviewStillWrong(new Set())
    setReviewFixed(0)
    setReviewActive(true)
    setPhase('review')
  }, [answers, queue])

  const selectReviewAnswer = useCallback((optionIdx: number) => {
    if (reviewRevealed) return
    const q = reviewQueue[reviewIdx]
    const isCorrect = optionIdx === q.correct_answer
    setReviewSelected(optionIdx)
    setReviewRevealed(true)
    setReviewAnswers(prev => {
      const next = [...prev]
      next[reviewIdx] = {
        questionId: q.question_id,
        selected: optionIdx,
        correctAnswer: q.correct_answer ?? 0,
        isCorrect,
      }
      return next
    })
    if (isCorrect) {
      setReviewFixed(f => f + 1)
    } else {
      setReviewStillWrong(prev => new Set(prev).add(q.question_id))
    }
    advanceTimer.current = setTimeout(() => {
      if (reviewIdx + 1 >= reviewQueue.length) {
        setPhase('finished')
      } else {
        setReviewIdx(i => i + 1)
        setReviewSelected(null)
        setReviewRevealed(false)
      }
    }, 500)
  }, [reviewRevealed, reviewQueue, reviewIdx])

  const goToPrevReview = useCallback(() => {
    if (reviewIdx === 0) return
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setReviewIdx(i => i - 1)
    const prevAnswer = reviewAnswers[reviewIdx - 1]
    if (prevAnswer) {
      setReviewSelected(prevAnswer.selected)
      setReviewRevealed(true)
    } else {
      setReviewSelected(null)
      setReviewRevealed(false)
    }
  }, [reviewIdx, reviewAnswers])

  // ---- Return to menu ----
  const backToMenu = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    clearProgress()
    setActiveBlock(null)
    setQueue([])
    setIdx(0)
    setAnswers([])
    setSelected(null)
    setRevealed(false)
    setReviewActive(false)
    setReviewQueue([])
    setReviewIdx(0)
    setReviewAnswers([])
    setReviewSelected(null)
    setReviewRevealed(false)
    setReviewStillWrong(new Set())
    setReviewFixed(0)
    setPhase('menu')
  }, [])

  // ---- Finish: clear saved progress when test is fully done ----
  useEffect(() => {
    if (phase === 'finished' && !reviewActive) {
      // Main test finished, but review might still be needed — don't clear yet
      // Only clear if no wrong answers
      const wrongCount = answers.filter(a => !a.isCorrect).length
      if (wrongCount === 0) {
        clearProgress()
      }
    }
    if (phase === 'finished' && reviewActive) {
      // Review complete — check if all fixed
      clearProgress()
    }
  }, [phase, reviewActive, answers])

  // ====================== RENDER ======================

  // -- Loading / Error --
  if (phase === 'loading' || phase === 'error') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <h2 className="mb-4 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>Тесты</h2>
        {phase === 'loading' ? (
          <div className="py-10 text-center text-sm text-ink/50">Загрузка вопросов...</div>
        ) : (
          <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
            <p className="text-sm font-bold text-error">{errorMsg}</p>
            <p className="mt-2 text-xs text-ink/50">Проверьте подключение к серверу</p>
          </div>
        )}
      </SwipeBack>
    )
  }

  // -- Resume prompt --
  if (phase === 'resumePrompt' && savedProgress) {
    const isReview = savedProgress.phase === 'review'
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <h2 className="mb-6 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>Тесты</h2>
        <div className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}>
            <RotateCcw size={28} color="#00e5ff" />
          </div>
          <p className="text-center text-base font-bold text-ink">Продолжить последний тест?</p>
          <p className="mt-2 text-center text-xs text-ink/50">
            {isReview ? 'Работа над ошибками' : savedProgress.blockLabel} — вопрос {savedProgress.phase === 'review' ? savedProgress.reviewIndex + 1 : savedProgress.index + 1} из {savedProgress.phase === 'review' ? savedProgress.reviewQueue.length : savedProgress.queue.length}
          </p>
          <button onClick={resumeProgress} className="mt-6 w-full rounded-xl border border-neon/50 bg-neon/15 px-6 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]">Продолжить</button>
          <button onClick={dismissSavedProgress} className="mt-3 w-full rounded-xl border border-neon/20 bg-card/50 px-6 py-3 font-bold text-ink/60 transition hover:bg-card/80 active:scale-[0.97]">Выйти в меню</button>
        </div>
      </SwipeBack>
    )
  }

  // -- Menu (5 blocks as styled HTML/CSS buttons) --
  if (phase === 'menu') {
    const blockThemes = [
      { color: '#38bdf8', glow: 'rgba(56,189,248,0.25)', icon: Sword },
      { color: '#ef4444', glow: 'rgba(239,68,68,0.25)', icon: Shield },
      { color: '#22c55e', glow: 'rgba(34,197,94,0.25)', icon: Flame },
      { color: '#a855f7', glow: 'rgba(168,85,247,0.25)', icon: Sparkles },
      { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', icon: Crown },
    ]
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto w-full max-w-[520px] px-3 pb-6 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

        <div className="flex flex-col gap-3">
          {BLOCKS.map((block, i) => {
            const { available, total } = countAvailable(allSorted, block)
            const canStart = available > 0
            const theme = blockThemes[i]
            const Icon = theme.icon
            return (
              <button
                key={block.id}
                onClick={() => canStart ? startBlock(block) : undefined}
                disabled={!canStart}
                className="group relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 transition-all duration-200 active:scale-[0.97] disabled:opacity-30 disabled:active:scale-100"
                style={{
                  borderColor: `${theme.color}40`,
                  background: 'linear-gradient(135deg, rgba(15,18,25,0.95) 0%, rgba(10,12,18,0.98) 100%)',
                  boxShadow: `0 0 12px ${theme.glow}, inset 0 0 0 1px ${theme.color}15`,
                }}
                aria-label={block.label}
              >
                <div
                  className="absolute left-0 top-0 h-full w-1.5"
                  style={{ background: `linear-gradient(180deg, ${theme.color}, ${theme.color}40)` }}
                />
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-110 group-active:scale-95"
                  style={{
                    borderColor: `${theme.color}50`,
                    background: `${theme.color}12`,
                    boxShadow: `0 0 10px ${theme.glow}`,
                  }}
                >
                  <Icon size={24} color={theme.color} />
                </div>
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="text-base font-extrabold text-white" style={{ textShadow: `0 0 8px ${theme.glow}` }}>
                    {block.label}
                  </span>
                  <span className="mt-0.5 text-xs font-bold" style={{ color: `${theme.color}cc` }}>
                    {total} {total === 1 ? 'вопрос' : total < 5 ? 'вопроса' : 'вопросов'}
                  </span>
                </div>
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border opacity-40 transition-opacity group-hover:opacity-80"
                  style={{ borderColor: `${theme.color}40` }}
                >
                  <ChevronRight size={16} color={theme.color} />
                </div>
              </button>
            )
          })}
        </div>
      </SwipeBack>
    )
  }

  // -- Finished --
  if (phase === 'finished') {
    const isReviewComplete = reviewActive && reviewAnswers.length >= reviewQueue.length

    if (isReviewComplete) {
      const stillWrongCount = reviewStillWrong.size
      const fixedCount = reviewQueue.length - stillWrongCount
      return (
        <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
          <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
          <div className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-6 backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}>
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.25)' }}>
              <Award size={32} color="#00e5ff" />
            </div>
            <h2 className="text-lg font-extrabold text-ink">Работа над ошибками завершена</h2>
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              <div className="flex flex-col items-center rounded-xl border border-success/30 bg-success/10 p-3">
                <span className="text-2xl font-extrabold text-success">{fixedCount}</span>
                <span className="mt-0.5 text-xs text-ink/50">Исправлено</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-error/30 bg-error/10 p-3">
                <span className="text-2xl font-extrabold text-error">{stillWrongCount}</span>
                <span className="mt-0.5 text-xs text-ink/50">Осталось</span>
              </div>
            </div>
            <div className="mt-4 w-full">
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
                <div className="h-full rounded-full bg-neon transition-all duration-700" style={{ width: `${queue.length > 0 ? Math.round(((queue.length - stillWrongCount) / queue.length) * 100) : 100}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
              </div>
            </div>
            <div className="mt-5 flex w-full gap-3">
              <button onClick={backToMenu} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97]">
                <Layers size={18} /> К блокам
              </button>
              <button onClick={onBack} className="flex-1 rounded-xl border border-neon/30 bg-card/60 px-4 py-3 font-bold text-ink/70 transition hover:bg-card/80 active:scale-[0.97]">Назад</button>
            </div>
          </div>
        </SwipeBack>
      )
    }

    const correct = answers.filter(a => a.isCorrect).length
    const wrong = answers.length - correct
    const percentage = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0

    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-6 backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}>
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.25)' }}>
            <Award size={32} color="#00e5ff" />
          </div>
          <h2 className="text-lg font-extrabold text-ink">Тест завершён</h2>
          {activeBlock && <p className="mt-1 text-xs text-ink/50">{activeBlock.label}</p>}
          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-success/30 bg-success/10 p-3">
              <span className="text-2xl font-extrabold text-success">{correct}</span>
              <span className="mt-0.5 text-xs text-ink/50">Правильных</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-error/30 bg-error/10 p-3">
              <span className="text-2xl font-extrabold text-error">{wrong}</span>
              <span className="mt-0.5 text-xs text-ink/50">Ошибок</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/70">Процент правильных ответов: <span className="font-extrabold text-neon">{percentage}%</span></p>
          <div className="mt-3 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
              <div className="h-full rounded-full bg-neon transition-all duration-700" style={{ width: `${percentage}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
            </div>
          </div>

          {wrong > 0 ? (
            <button onClick={startReview} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-error/50 bg-error/15 px-4 py-4 font-extrabold text-error transition hover:bg-error/25 active:scale-[0.97]">
              <AlertTriangle size={20} /> РАБОТА НАД ОШИБКАМИ ({wrong})
            </button>
          ) : (
            <div className="mt-5 w-full rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-center">
              <p className="text-sm font-bold text-success">Ошибок нет — работа над ошибками не требуется</p>
            </div>
          )}

          <div className="mt-3 flex w-full gap-3">
            <button onClick={() => activeBlock && startBlock(activeBlock)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97]">
              <RotateCcw size={18} /> Заново
            </button>
            <button onClick={backToMenu} className="flex-1 rounded-xl border border-neon/30 bg-card/60 px-4 py-3 font-bold text-ink/70 transition hover:bg-card/80 active:scale-[0.97]">К блокам</button>
          </div>
        </div>
      </SwipeBack>
    )
  }

  // -- Review mode --
  if (phase === 'review') {
    const q = reviewQueue[reviewIdx]
    if (!q) return null
    const isCorrect = reviewRevealed && reviewSelected === q.correct_answer
    const isWrong = reviewRevealed && reviewSelected !== null && reviewSelected !== q.correct_answer
    const progress = { current: reviewIdx + 1, total: reviewQueue.length }

    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
          <span className="text-xs font-bold text-error">Работа над ошибками</span>
        </div>
        <div className="mb-1 text-xs font-bold text-neon">{progress.current} / {progress.total}</div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg/60">
          <div className="h-full rounded-full bg-error transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%`, boxShadow: '0 0 6px rgba(255,68,68,0.5)' }} />
        </div>

        <div key={q.question_id + '-rev'} className="animate-slideUp rounded-xl border border-neon/20 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}>
          <span className="mb-2 block text-xs font-extrabold text-neon/70">{q.question_id}</span>
          <p className="mb-3 text-sm leading-relaxed text-ink/90">{q.question_text}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              const isSelected = reviewSelected === i
              const isRight = reviewRevealed && i === q.correct_answer
              const isWrongSel = reviewRevealed && isSelected && i !== q.correct_answer
              let cls = 'border-neon/15 bg-bg/40 text-ink/70'
              if (isRight) cls = 'border-success/60 bg-success/15 text-ink'
              else if (isWrongSel) cls = 'border-error/60 bg-error/15 text-ink animate-shakeHit'
              else if (reviewRevealed) cls = 'border-neon/10 bg-bg/30 text-ink/40'
              return (
                <button
                  key={i}
                  onClick={() => selectReviewAnswer(i)}
                  disabled={reviewRevealed}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cls} ${!reviewRevealed ? 'active:scale-[0.98]' : ''}`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isRight ? 'border-success bg-success text-bg' : isWrongSel ? 'border-error bg-error text-bg' : 'border-neon/40'}`}>
                    {isRight ? <Check size={12} /> : isWrongSel ? <X size={12} /> : i + 1}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-2 min-h-[28px] flex items-center">
          {isCorrect && <span className="flex items-center gap-1 text-sm font-bold text-success animate-fadeIn"><Check size={14} /> Верно!</span>}
          {isWrong && <span className="flex items-center gap-1 text-sm font-bold text-error animate-fadeIn"><X size={14} /> Неправильный ответ</span>}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button onClick={goToPrevReview} disabled={reviewIdx === 0} className="flex items-center gap-1 rounded-lg border border-neon/20 bg-card/50 px-3 py-2 text-xs font-bold text-neon transition enabled:hover:bg-neon/10 disabled:opacity-30 active:scale-[0.97]">
            <ChevronLeft size={16} /> Предыдущий
          </button>
          <span className="text-xs text-ink/40">Исправлено: {reviewFixed} · Осталось: {reviewStillWrong.size}</span>
        </div>
      </SwipeBack>
    )
  }

  // -- Playing (main test) --
  const q = queue[idx]
  if (!q) return null
  const isCorrect = revealed && selected === q.correct_answer
  const isWrong = revealed && selected !== null && selected !== q.correct_answer
  const progress = { current: idx + 1, total: queue.length }

  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        {activeBlock && <span className="text-xs font-bold text-ink/40">{activeBlock.label}</span>}
      </div>
      <div className="mb-1 text-xs font-bold text-neon">{progress.current} / {progress.total}</div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg/60">
        <div className="h-full rounded-full bg-neon transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%`, boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
      </div>

<div
  key={q.question_id}
  className="animate-slideUp overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-950/20 via-card/80 to-black/40 backdrop-blur-md"
  style={{
    boxShadow:
      '0 12px 35px rgba(0,0,0,0.25), 0 0 18px rgba(0,229,255,0.07)',
  }}
>
  {/* Question */}
  <div className="border-b border-cyan-400/10 px-4 pb-4 pt-3.5">
    <div className="mb-3 flex items-center justify-between">
      <span className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-black tracking-wide text-cyan-300">
        {q.question_id}
      </span>

      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/30">
        вопрос
      </span>
    </div>

    <p className="text-[15px] font-semibold leading-[1.55] text-ink">
      {q.question_text}
    </p>
  </div>

  {/* Answers */}
  <div className="flex flex-col gap-2.5 p-3">
    {q.options.map((opt, i) => {
      const isSelected = selected === i
      const isRight = revealed && i === q.correct_answer
      const isWrongSel =
        revealed && isSelected && i !== q.correct_answer

      let cls =
        'border-white/10 bg-white/[0.035] text-ink/80 hover:border-cyan-400/30 hover:bg-cyan-400/[0.06]'

      if (isRight) {
        cls =
          'border-success/70 bg-success/15 text-ink shadow-[0_0_18px_rgba(34,197,94,0.12)]'
      } else if (isWrongSel) {
        cls =
          'border-error/70 bg-error/15 text-ink animate-shakeHit shadow-[0_0_18px_rgba(239,68,68,0.12)]'
      } else if (revealed) {
        cls = 'border-white/5 bg-black/20 text-ink/35'
      }

      return (
        <button
          key={i}
          onClick={() => selectAnswer(i)}
          disabled={revealed}
          className={`group flex min-h-[58px] w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${cls} ${
            !revealed
              ? 'active:scale-[0.985]'
              : ''
          }`}
        >
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-black transition-all ${
              isRight
                ? 'border-success bg-success text-bg'
                : isWrongSel
                  ? 'border-error bg-error text-bg'
                  : 'border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300'
            }`}
          >
            {isRight ? (
              <Check size={16} strokeWidth={3} />
            ) : isWrongSel ? (
              <X size={16} strokeWidth={3} />
            ) : (
              i + 1
            )}
          </span>

          <span className="flex-1 text-[14px] font-medium leading-[1.45]">
            {opt}
          </span>
        </button>
      )
    })}
  </div>
</div>

      <div className="mt-2 min-h-[28px] flex items-center">
        {isCorrect && <span className="flex items-center gap-1 text-sm font-bold text-success animate-fadeIn"><Check size={14} /> Верно!</span>}
        {isWrong && <span className="flex items-center gap-1 text-sm font-bold text-error animate-fadeIn"><X size={14} /> Неправильный ответ</span>}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button onClick={goToPrev} disabled={idx === 0} className="flex items-center gap-1 rounded-lg border border-neon/20 bg-card/50 px-3 py-2 text-xs font-bold text-neon transition enabled:hover:bg-neon/10 disabled:opacity-30 active:scale-[0.97]">
          <ChevronLeft size={16} /> Предыдущий вопрос
        </button>
      </div>
    </SwipeBack>
  )
}