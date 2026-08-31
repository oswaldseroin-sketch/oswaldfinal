import { useState, useMemo, useEffect } from 'react'
import { Search, Check, TriangleAlert as AlertTriangle, Save, Lock } from 'lucide-react'
import SwipeBack from './SwipeBack'
import { api, type TestBlockAssignment } from '../lib/api'
import { testQuestions, type TestQuestion } from '../lib/testQuestionsData'

type Props = {
  onBack: () => void
}

type DbQuestion = {
  question_id: string
  question_text: string
  options: string[]
  correct_answer: number | null
}

type BlockFilter = 'all' | 'block1' | 'block2' | 'block3' | 'block4' | 'noblock'

export default function AdminPanel({ onBack }: Props) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [dbQuestions, setDbQuestions] = useState<DbQuestion[]>([])
  const [blockAssignments, setBlockAssignments] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all')
  const [blockFilter, setBlockFilter] = useState<BlockFilter>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null)
  const [localSelections, setLocalSelections] = useState<Record<string, number>>({})
  const [localBlocks, setLocalBlocks] = useState<Record<string, number | null>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [blockSaveSuccess, setBlockSaveSuccess] = useState<string | null>(null)

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === '-3010') {
      setAuthed(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [rows, blocks] = await Promise.all([
          api.getTestQuestions(),
          api.getTestBlockAssignments(),
        ])
        if (cancelled) return
        setDbQuestions(rows as DbQuestion[])
        setBlockAssignments(new Map(blocks.map((b: TestBlockAssignment) => [b.question_id, b.block_number])))
      } catch {
        if (!cancelled) setDbQuestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authed])

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const payload = testQuestions.map(q => ({
        question_id: q.id,
        question_text: q.question,
        options: q.options,
      }))
      const result = await api.seedTestQuestions(payload)
      setSeedMsg(`Загружено: ${result.inserted} новых, ${result.updated} обновлено из ${result.total}`)
      const rows = await api.getTestQuestions()
      setDbQuestions(rows as DbQuestion[])
    } catch (err) {
      setSeedMsg(err instanceof Error ? `Ошибка: ${err.message}` : 'Ошибка при загрузке вопросов')
    } finally {
      setSeeding(false)
    }
  }

  const getEffectiveBlock = (qId: string): number | null => {
    if (qId in localBlocks) return localBlocks[qId]
    return blockAssignments.get(qId) ?? null
  }

  const mergedQuestions = useMemo(() => {
    const dbMap = new Map(dbQuestions.map(q => [q.question_id, q]))
    return testQuestions.map(q => {
      const dbRow = dbMap.get(q.id)
      if (dbRow) {
        return {
          id: q.id,
          question: dbRow.question_text,
          options: dbRow.options,
          correct_answer: dbRow.correct_answer,
          block_number: getEffectiveBlock(q.id),
        }
      }
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        correct_answer: null,
        block_number: getEffectiveBlock(q.id),
      }
    })
  }, [dbQuestions, blockAssignments, localBlocks])

  const filtered = useMemo(() => {
    let result = mergedQuestions
    if (filter === 'answered') {
      result = result.filter(q => q.correct_answer !== null || localSelections[q.id] !== undefined)
    } else if (filter === 'unanswered') {
      result = result.filter(q => q.correct_answer === null && localSelections[q.id] === undefined)
    }
    if (blockFilter === 'block1') {
      result = result.filter(q => q.block_number === 1)
    } else if (blockFilter === 'block2') {
      result = result.filter(q => q.block_number === 2)
    } else if (blockFilter === 'block3') {
      result = result.filter(q => q.block_number === 3)
    } else if (blockFilter === 'block4') {
      result = result.filter(q => q.block_number === 4)
    } else if (blockFilter === 'noblock') {
      result = result.filter(q => q.block_number === null)
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      result = result.filter(q =>
        q.id.toLowerCase().includes(s) ||
        q.question.toLowerCase().includes(s)
      )
    }
    return result
  }, [mergedQuestions, filter, blockFilter, search, localSelections])

  const stats = useMemo(() => {
    const answered = mergedQuestions.filter(q => q.correct_answer !== null).length
    const b1 = mergedQuestions.filter(q => q.block_number === 1).length
    const b2 = mergedQuestions.filter(q => q.block_number === 2).length
    const b3 = mergedQuestions.filter(q => q.block_number === 3).length
    const b4 = mergedQuestions.filter(q => q.block_number === 4).length
    const megaSet = new Set(mergedQuestions.filter(q => q.block_number !== null).map(q => q.id))
    return {
      total: mergedQuestions.length,
      answered,
      unanswered: mergedQuestions.length - answered,
      b1, b2, b3, b4,
      mega: megaSet.size,
    }
  }, [mergedQuestions])

  const handleSelect = (qId: string, optionIndex: number) => {
    setLocalSelections(prev => ({ ...prev, [qId]: optionIndex }))
  }

  const handleSelectBlock = (qId: string, blockNum: number | null) => {
    setLocalBlocks(prev => ({ ...prev, [qId]: blockNum }))
  }

  const handleSaveBlock = async (qId: string) => {
    const blockValue = localBlocks[qId]
    if (blockValue === undefined) return
    setSavingBlockId(qId)
    setSaveErrors(prev => { const n = { ...prev }; delete n[qId + '-block']; return n })
    try {
      await api.setTestBlockAssignment(qId, blockValue, '3010')
      if (blockValue === null) {
        setBlockAssignments(prev => {
          const next = new Map(prev)
          next.delete(qId)
          return next
        })
      } else {
        setBlockAssignments(prev => {
          const next = new Map(prev)
          next.set(qId, blockValue)
          return next
        })
      }
      setLocalBlocks(prev => {
        const next = { ...prev }
        delete next[qId]
        return next
      })
      setBlockSaveSuccess(qId)
      setTimeout(() => setBlockSaveSuccess(prev => prev === qId ? null : prev), 3000)
    } catch (err) {
      setSaveErrors(prev => ({ ...prev, [qId + '-block']: err instanceof Error ? err.message : 'Ошибка сохранения' }))
    } finally {
      setSavingBlockId(null)
    }
  }

  const handleSave = async (qId: string) => {
    const selected = localSelections[qId]
    if (selected === undefined) return
    setSavingId(qId)
    setSaveErrors(prev => { const n = { ...prev }; delete n[qId]; return n })
    try {
      const updated = await api.setCorrectAnswer(qId, selected)
      setDbQuestions(prev => prev.map(q =>
        q.question_id === qId
          ? { ...q, correct_answer: updated.correct_answer }
          : q
      ))
      setLocalSelections(prev => {
        const next = { ...prev }
        delete next[qId]
        return next
      })
      setSaveSuccess(qId)
      setTimeout(() => setSaveSuccess(prev => prev === qId ? null : prev), 3000)
    } catch (err) {
      setSaveErrors(prev => ({ ...prev, [qId]: err instanceof Error ? err.message : 'Ошибка сохранения' }))
    } finally {
      setSavingId(null)
    }
  }

  const getEffectiveAnswer = (q: TestQuestion): number | null => {
    if (q.correct_answer !== null) return q.correct_answer
    return localSelections[q.id] ?? null
  }

  if (!authed) {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-6 pb-10 pt-10">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          ← Назад
        </button>

        <form
          onSubmit={handlePassword}
          className="flex flex-col items-center gap-6 rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md"
          style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl border border-neon/40 bg-neon/10"
            style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}
          >
            <Lock size={28} color="#00e5ff" />
          </div>
          <h2
            className="text-lg font-extrabold tracking-wide text-ink"
            style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
          >
            АДМИН-ПАНЕЛЬ
          </h2>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPasswordError(false) }}
            placeholder="Введите пароль"
            autoFocus
            className="w-full rounded-xl border border-neon/30 bg-bg/60 px-4 py-3 text-center text-ink placeholder:text-ink/40 focus:border-neon/60 focus:outline-none"
          />
          {passwordError && (
            <p className="text-sm font-bold text-error">Неверный пароль</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
          >
            ВОЙТИ
          </button>
        </form>
      </SwipeBack>
    )
  }

  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <h2
        className="mb-4 text-lg font-extrabold tracking-wide text-ink"
        style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
      >
        Админ-панель тестов
      </h2>

      <div className="mb-3 flex items-center gap-3 rounded-xl border border-neon/20 bg-card/50 p-3 text-sm">
        <span className="font-bold text-neon">{stats.answered}</span>
        <span className="text-ink/60">/ {stats.total} отвечено</span>
        <span className="ml-auto font-bold text-warning">{stats.unanswered} без ответа</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-neon/15 bg-card/40 p-2.5 text-[11px]">
        <span className="font-bold text-neon/80">Б1: <span className="text-ink">{stats.b1}</span></span>
        <span className="font-bold text-neon/80">Б2: <span className="text-ink">{stats.b2}</span></span>
        <span className="font-bold text-neon/80">Б3: <span className="text-ink">{stats.b3}</span></span>
        <span className="font-bold text-neon/80">Б4: <span className="text-ink">{stats.b4}</span></span>
        <span className="font-bold text-neon/80">Марафон: <span className="text-ink">{stats.mega}</span></span>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search size={18} color="#00e5ff" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по номеру или тексту..."
            className="w-full rounded-xl border border-neon/30 bg-bg/60 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/40 focus:border-neon/60 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'answered', 'unanswered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                filter === f
                  ? 'border border-neon/50 bg-neon/15 text-neon'
                  : 'border border-neon/20 bg-card/40 text-ink/60'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'answered' ? 'С ответом' : 'Без ответа'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all', label: 'Все блоки' },
            { key: 'block1', label: 'Блок 1' },
            { key: 'block2', label: 'Блок 2' },
            { key: 'block3', label: 'Блок 3' },
            { key: 'block4', label: 'Блок 4' },
            { key: 'noblock', label: 'Без блока' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setBlockFilter(f.key)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                blockFilter === f.key
                  ? 'border border-neon/50 bg-neon/15 text-neon'
                  : 'border border-neon/15 bg-card/30 text-ink/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-xl border border-neon/40 bg-neon/10 px-4 py-2.5 text-sm font-bold text-neon transition hover:bg-neon/20 active:scale-[0.97] disabled:opacity-50"
        >
          {seeding ? 'Загрузка...' : 'Загрузить вопросы в базу'}
        </button>
        {seedMsg && <p className="text-xs text-ink/70">{seedMsg}</p>}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-ink/50">Загрузка вопросов...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(q => {
            const effective = getEffectiveAnswer(q)
            const hasAnswer = effective !== null
            const effectiveBlock = getEffectiveBlock(q.id)
            const hasLocalBlock = q.id in localBlocks
            return (
              <div
                key={q.id}
                className="rounded-xl border border-neon/20 bg-card/60 p-4 backdrop-blur-md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-extrabold text-neon">{q.id}</span>
                  {hasAnswer ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-success">
                      <Check size={14} /> Ответ назначен
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-warning">
                      <AlertTriangle size={14} /> Ответ ещё не назначен
                    </span>
                  )}
                  <span
                    className={`ml-auto rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                      effectiveBlock !== null
                        ? 'border-neon/40 bg-neon/10 text-neon'
                        : 'border-line/50 bg-black/20 text-ink-faint'
                    }`}
                  >
                    {effectiveBlock !== null ? `Блок ${effectiveBlock}` : 'Без блока'}
                  </span>
                </div>

                <p className="mb-3 text-sm text-ink/90">{q.question}</p>

                <div className="flex flex-col gap-2">
                  {q.options.map((opt, i) => {
                    const isSelected = effective === i
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(q.id, i)}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-neon/60 bg-neon/15 text-ink'
                            : 'border-neon/15 bg-bg/40 text-ink/70 hover:border-neon/30'
                        }`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? 'border-neon bg-neon' : 'border-neon/40'
                        }`}>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-bg" />}
                        </span>
                        <span>{i + 1}. {opt}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Block selector */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Блок:</span>
                  {[1, 2, 3, 4].map(bn => (
                    <button
                      key={bn}
                      onClick={() => handleSelectBlock(q.id, bn)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold transition active:scale-90 ${
                        effectiveBlock === bn
                          ? 'border-neon/60 bg-neon/20 text-neon'
                          : 'border-neon/20 bg-bg/40 text-ink/50 hover:border-neon/40'
                      }`}
                    >
                      {bn}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSelectBlock(q.id, null)}
                    className={`ml-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition active:scale-90 ${
                      effectiveBlock === null
                        ? 'border-line/50 bg-black/30 text-ink-muted'
                        : 'border-line/30 bg-bg/30 text-ink-faint hover:border-line/50'
                    }`}
                  >
                    Без блока
                  </button>
                  {hasLocalBlock && (
                    <button
                      onClick={() => handleSaveBlock(q.id)}
                      disabled={savingBlockId === q.id}
                      className="ml-auto flex items-center gap-1.5 rounded-lg border border-neon/40 bg-neon/15 px-3 py-1.5 text-xs font-bold text-neon transition hover:bg-neon/25 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {savingBlockId === q.id ? '...' : 'Блок'}
                    </button>
                  )}
                </div>

                {saveErrors[q.id] && (
                  <p className="mt-2 text-xs font-bold text-error">{saveErrors[q.id]}</p>
                )}
                {saveErrors[q.id + '-block'] && (
                  <p className="mt-1 text-xs font-bold text-error">{saveErrors[q.id + '-block']}</p>
                )}
                {saveSuccess === q.id && (
                  <p className="mt-2 text-xs font-bold text-success">Ответ сохранён</p>
                )}
                {blockSaveSuccess === q.id && (
                  <p className="mt-1 text-xs font-bold text-success">Блок сохранён</p>
                )}
                {localSelections[q.id] !== undefined && q.correct_answer === null && (
                  <button
                    onClick={() => handleSave(q.id)}
                    disabled={savingId === q.id}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-neon/40 bg-neon/15 px-4 py-2 text-sm font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97] disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingId === q.id ? 'Сохранение...' : 'Сохранить правильный'}
                  </button>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-ink/50">Вопросы не найдены</div>
          )}
        </div>
      )}
    </SwipeBack>
  )
}
