import { useEffect, useState, useCallback, useRef } from 'react'
import { Lock, Save, ArrowLeft, Check, SquareX, Type } from 'lucide-react'
import { api, type KnowledgeNumber } from '../lib/api'
import {
  type Mark, type BorderColor, type TextColor, type Line,
  getLines, parseContent, buildContentString,
  applyBorder, applyTextColor, removeBorderAt, removeTextColorAt,
  BORDER_STYLES, TEXT_STYLES,
} from '../lib/textFormat'

type Props = { onBack: () => void }

const BORDER_COLORS: { key: BorderColor; label: string; color: string }[] = [
  { key: 'red', label: 'Красная', color: '#ff4444' },
  { key: 'green', label: 'Зелёная', color: '#39ff14' },
  { key: 'yellow', label: 'Жёлтая', color: '#facc15' },
]

const TEXT_COLORS: { key: TextColor; label: string; color: string }[] = [
  { key: 'orange', label: 'Оранжевый', color: '#ff9933' },
  { key: 'purple', label: 'Пурпурный', color: '#c084fc' },
  { key: 'green', label: 'Зелёный', color: '#39ff14' },
]

export default function NumbersPanel({ onBack }: Props) {
  const [numbers, setNumbers] = useState<KnowledgeNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [editText, setEditText] = useState('')
  const [editMarks, setEditMarks] = useState<Mark[]>([])
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadNumbers = useCallback(async () => {
    try {
      const data = await api.getKnowledgeNumbers()
      setNumbers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadNumbers() }, [loadNumbers])

  const current = numbers.find((n) => n.number === selected)

  const openNumber = (n: number) => {
    const item = numbers.find((it) => it.number === n)
    const parsed = parseContent(item?.content ?? '')
    if (parsed) {
      setEditText(parsed.text)
      setEditMarks(parsed.marks)
    } else {
      setEditText(item?.content ?? '')
      setEditMarks([])
    }
    setSelected(n)
  }

  const handleAdminLogin = () => {
    if (adminPassword === '3010') {
      setIsAdmin(true)
      setAdminOpen(false)
      setAdminPassword('')
      setAdminError('')
    } else {
      setAdminError('Неверный пароль')
    }
  }

  const getSelectionRange = (): { start: number; end: number } | null => {
    const ta = textareaRef.current
    if (!ta) return null
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (start === end) return null
    return { start, end }
  }

  const handleApplyBorder = (color: BorderColor) => {
    const sel = getSelectionRange()
    if (!sel) return
    setEditMarks((prev) => applyBorder(prev, sel.start, sel.end, color))
  }

  const handleApplyTextColor = (color: TextColor) => {
    const sel = getSelectionRange()
    if (!sel) return
    setEditMarks((prev) => applyTextColor(prev, sel.start, sel.end, color))
  }

  const handleRemoveBorder = () => {
    const sel = getSelectionRange()
    if (!sel) return
    setEditMarks((prev) => removeBorderAt(prev, sel.start, sel.end))
  }

  const handleRemoveTextColor = () => {
    const sel = getSelectionRange()
    if (!sel) return
    setEditMarks((prev) => removeTextColorAt(prev, sel.start, sel.end))
  }

  const handleSave = async () => {
    if (selected === null) return
    setSaving(true)
    setSavedFlash(false)
    try {
      const contentStr = buildContentString(editText, editMarks)
      const updated = await api.updateKnowledgeNumber(selected, contentStr, '3010')
      setNumbers((prev) => prev.map((n) => (n.number === selected ? updated : n)))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // -- Number detail view --
  if (selected !== null) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button
          onClick={() => setSelected(null)}
          className="mb-5 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Назад к числам
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-widest text-neon">ЧИСЛА</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">{selected} число</h1>
        </div>

        <div className="rounded-2xl border border-neon/25 bg-card/70 backdrop-blur-md p-5" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.08)' }}>
          {isAdmin ? (
            <>
              {/* Format toolbar */}
              <div className="mb-3 rounded-xl border border-line/50 bg-black/40 p-2.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Рамка:</span>
                  {BORDER_COLORS.map((bc) => (
                    <button
                      key={bc.key}
                      onClick={() => handleApplyBorder(bc.key)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-90"
                      style={{ borderColor: bc.color, boxShadow: `0 0 6px ${bc.color}40` }}
                      title={`${bc.label} рамка`}
                    >
                      <span className="text-xs" style={{ color: bc.color }}>⬚</span>
                    </button>
                  ))}
                  <button
                    onClick={handleRemoveBorder}
                    className="ml-1 flex h-7 items-center gap-1 rounded-lg border border-line/50 bg-black/30 px-2 text-[10px] font-bold text-ink-muted transition active:scale-90 hover:text-ink"
                    title="Убрать рамку"
                  >
                    <SquareX size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Текст:</span>
                  {TEXT_COLORS.map((tc) => (
                    <button
                      key={tc.key}
                      onClick={() => handleApplyTextColor(tc.key)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border transition active:scale-90"
                      style={{ borderColor: tc.color, boxShadow: `0 0 6px ${tc.color}40` }}
                      title={`${tc.label} текст`}
                    >
                      <span className="text-xs font-black" style={{ color: tc.color, textShadow: `0 0 6px ${tc.color}` }}>A</span>
                    </button>
                  ))}
                  <button
                    onClick={handleRemoveTextColor}
                    className="ml-1 flex h-7 items-center gap-1 rounded-lg border border-line/50 bg-black/30 px-2 text-[10px] font-bold text-ink-muted transition active:scale-90 hover:text-ink"
                    title="Обычный цвет"
                  >
                    <Type size={13} />
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] text-ink-faint">Выделите фрагмент текста и нажмите нужную кнопку</p>
              </div>

              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onSelect={(e) => {
                  const ta = e.currentTarget
                  if (ta.selectionStart !== ta.selectionEnd) {
                    ta.focus()
                  }
                }}
                placeholder="Введите текст для этого числа..."
                className="min-h-[200px] w-full resize-y rounded-xl border border-line bg-input px-4 py-3 text-sm leading-[1.3] text-ink outline-none focus:border-neon/50"
              />

              {/* Preview */}
              {editText.trim() && (
                <div className="mt-3 rounded-xl border border-line/40 bg-black/30 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Предпросмотр:</p>
                  <CompactText lines={getLines(buildContentString(editText, editMarks))} />
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                {savedFlash ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-success">
                    <Check size={16} /> Сохранено
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">
                    {saving ? 'Сохранение...' : 'Режим редактирования'}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border border-neon/40 bg-neon/15 px-5 py-2.5 text-sm font-extrabold text-neon transition hover:bg-neon/25 active:scale-95 disabled:opacity-50"
                >
                  <Save size={16} /> Сохранить
                </button>
              </div>
            </>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto">
              {current?.content?.trim() ? (
                <CompactText lines={getLines(current.content)} />
              ) : (
                <p className="text-sm text-ink-muted">Текст для этого числа ещё не добавлен.</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // -- Grid of 31 numbers --
  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button
  onClick={onBack}
  className="
    mb-5
    flex items-center justify-center gap-2
    mx-auto
    rounded-xl
    border border-neon/30
    bg-black/40
    px-5 py-2
    text-xs font-black
    tracking-wide
    text-neon
    shadow-[0_0_15px_rgba(0,229,255,0.15)]
    backdrop-blur-md
    transition-all
    active:scale-95
  "
>
  <span className="text-lg">←</span>
  НАЗАД В МЕНЮ
</button>
      <div className="mb-5 flex justify-end">
        <div>
         
        </div>
        <button
          onClick={() => { if (isAdmin) setIsAdmin(false); else setAdminOpen(true) }}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-transform active:scale-90 ${
            isAdmin ? 'border-success/50 bg-success/10' : 'border-line bg-card/70'
          }`}
          title={isAdmin ? 'Выйти из админа' : 'Администратор'}
        >
          <Lock size={17} color={isAdmin ? '#22ff88' : '#8b92a3'} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-muted">Загрузка...</div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {numbers.map((n) => (
            <button
              key={n.number}
              onClick={() => openNumber(n.number)}
              className="flex flex-col items-center justify-center rounded-xl border border-neon/25 bg-card/60 py-5 text-center backdrop-blur-md transition-all hover:border-neon/50 hover:bg-neon/8 active:scale-95"
              style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}
            >
              <span className="text-lg font-extrabold text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.3)' }}>
                {n.number} число
              </span>
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <p className="mt-4 text-center text-xs font-bold text-success">
          Режим администратора активен
        </p>
      )}

      {/* Admin login modal */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={() => setAdminOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-neon/30 bg-card/95 p-6 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAdminOpen(false)} className="absolute right-4 top-4 text-ink-muted hover:text-ink">✕</button>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}>
                <Lock size={24} color="#00e5ff" />
              </div>
            </div>
            <h2 className="mb-4 text-center text-lg font-extrabold text-ink">Администратор</h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAdminError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Пароль"
              inputMode="numeric"
              autoFocus
              className="h-12 w-full rounded-xl border border-line bg-input px-4 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
            />
            {adminError && <p className="mt-2 text-xs text-error">{adminError}</p>}
            <button
              onClick={handleAdminLogin}
              className="mt-4 h-12 w-full rounded-xl bg-neon text-sm font-extrabold text-black transition active:scale-95"
            >
              ВОЙТИ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactText({ lines }: { lines: Line[] }) {
  return (
    <div className="text-[15px] leading-[1.3] text-ink/90">
      {lines.map((segs, lineIdx) => (
        <p key={lineIdx} className="mb-1 last:mb-0">
          {segs.length === 0 ? (
            '\u00A0'
          ) : (
            segs.map((seg, segIdx) => {
              let style: React.CSSProperties = {}
              let className = ''
              if (seg.c) {
                const ts = TEXT_STYLES[seg.c]
                style = { color: ts.color, textShadow: `0 0 6px ${ts.glow}` }
              }
              if (seg.b) {
                const bs = BORDER_STYLES[seg.b]
                return (
                  <span
                    key={segIdx}
                    className={`inline-block rounded-md ${className}`}
                    style={{
                      ...style,
                      border: `1px solid ${bs.border}`,
                      boxShadow: `0 0 8px ${bs.glow}, inset 0 0 4px ${bs.glow}`,
                      background: bs.bg,
                      padding: '0.05em 0.35em',
                      margin: '0 0.05em',
                    }}
                  >
                    {seg.text}
                  </span>
                )
              }
              return (
                <span key={segIdx} className={className} style={style}>
                  {seg.text}
                </span>
              )
            })
          )}
        </p>
      ))}
    </div>
  )
}
