import { useEffect, useState } from 'react'
import { X, Lock, Loader as Loader2, Check } from 'lucide-react'
import { api, type PlayerRow, type SecretRoomQuestion } from '../lib/api'

type Props = {
  onClose: () => void
  onSaved: () => void
}

const ADMIN_PASSWORD = '3010'

const NEON = {
  border: 'rgba(168,85,247,0.7)',
  glow: 'rgba(168,85,247,0.45)',
  text: '#a855f7',
}

export default function SecretAdminPanel({ onClose, onSaved }: Props) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [questions, setQuestions] = useState<SecretRoomQuestion[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState<Record<number, { title: string; correctPlayerId: number | null }>>({})
  const [savingSlot, setSavingSlot] = useState<number | null>(null)
  const [savedSlot, setSavedSlot] = useState<number | null>(null)

  const handleAuth = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setAuthError('')
    } else {
      setAuthError('Неверный пароль')
    }
  }

  useEffect(() => {
    if (!authed) return
    void loadData()
  }, [authed])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [qs, ps] = await Promise.all([
        api.getSecretRoomQuestions(),
        api.getPlayers(),
      ])
      setQuestions(qs)
      setPlayers(ps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (slot: number, q: SecretRoomQuestion) => {
    setEditing((prev) => ({
      ...prev,
      [slot]: { title: q.title, correctPlayerId: q.correct_player_id },
    }))
    setSavedSlot(null)
  }

  const saveSlot = async (slot: number) => {
    const ed = editing[slot]
    if (!ed) return
    setSavingSlot(slot)
    setError('')
    try {
      await api.updateSecretRoomQuestion(slot, ed.title, ed.correctPlayerId ?? 0)
      setQuestions((prev) =>
        prev.map((q) =>
          q.slot_number === slot
            ? {
                ...q,
                title: ed.title,
                correct_player_id: ed.correctPlayerId,
                correct_player_name: players.find((p) => p.id === ed.correctPlayerId)?.full_name ?? null,
              }
            : q
        )
      )
      setSavedSlot(slot)
      setEditing((prev) => {
        const next = { ...prev }
        delete next[slot]
        return next
      })
      onSaved()
      window.setTimeout(() => setSavedSlot(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSavingSlot(null)
    }
  }

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
        <div
          className="mx-4 w-full max-w-xs rounded-2xl border-2 bg-black/90 p-6 backdrop-blur-md"
          style={{ borderColor: NEON.border, boxShadow: `0 0 24px ${NEON.glow}` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={18} style={{ color: NEON.text }} />
              <h2 className="text-base font-extrabold text-white">Админ-доступ</h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={18} /></button>
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAuth() }}
            placeholder="Введите пароль"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-center text-lg font-bold tracking-widest text-white outline-none focus:border-purple-400/60 placeholder:text-white/25"
            style={{ letterSpacing: '0.3em' }}
            autoFocus
          />
          {authError && <p className="mt-2 text-center text-xs font-bold text-red-400">{authError}</p>}
          <button
            onClick={handleAuth}
            className="mt-4 w-full rounded-xl border border-purple-400/60 bg-purple-500/20 py-3 text-sm font-extrabold text-white transition-all hover:bg-purple-500/30 active:scale-95"
            style={{ boxShadow: `0 0 12px ${NEON.glow}` }}
          >
            Войти
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="mx-auto max-w-md px-4 pb-10 pt-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest" style={{ color: NEON.text }}>АДМИН · НОМИНАЦИИ</p>
            <h2 className="text-lg font-extrabold text-white">Редактирование 10 номинаций</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={20} /></button>
        </div>

        {loading && (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: NEON.text }} /></div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center">
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="space-y-2.5">
            {questions.map((q) => {
              const slot = q.slot_number
              const ed = editing[slot]
              const isEditing = !!ed
              return (
                <div
                  key={slot}
                  className="rounded-xl border bg-black/60 p-3 backdrop-blur-md"
                  style={{ borderColor: 'rgba(168,85,247,0.3)', boxShadow: `0 0 10px rgba(168,85,247,0.12)` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                      style={{ background: 'rgba(168,85,247,0.2)', color: NEON.text, border: `1px solid ${NEON.border}` }}
                    >
                      {String(slot).padStart(2, '0')}
                    </span>
                    {isEditing ? (
                      <input
                        value={ed.title}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [slot]: { ...prev[slot], title: e.target.value } }))}
                        className="flex-1 rounded-lg border border-purple-400/40 bg-black px-2.5 py-1.5 text-sm font-bold text-white outline-none"
                        placeholder="Текст номинации"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-bold text-white">{q.title}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[11px] text-white/40">Ответ:</span>
                    {isEditing ? (
                      <select
                        value={ed.correctPlayerId ?? ''}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [slot]: { ...prev[slot], correctPlayerId: e.target.value ? Number(e.target.value) : null } }))}
                        className="flex-1 rounded-lg border border-purple-400/30 bg-black px-2.5 py-1.5 text-sm font-bold text-white outline-none"
                      >
                        <option value="">— не выбран —</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex-1 truncate text-sm font-extrabold" style={{ color: NEON.text }}>
                        {q.correct_player_name ?? '— не выбран —'}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[slot]; return next })}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/50 transition-all hover:text-white/80 active:scale-95"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => void saveSlot(slot)}
                          disabled={savingSlot === slot}
                          className="flex items-center gap-1.5 rounded-lg border border-purple-400/60 bg-purple-500/20 px-3 py-1.5 text-[11px] font-extrabold text-white transition-all hover:bg-purple-500/30 active:scale-95"
                          style={{ boxShadow: `0 0 8px ${NEON.glow}` }}
                        >
                          {savingSlot === slot ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Сохранить
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(slot, q)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/50 transition-all hover:text-white/80 active:scale-95"
                      >
                        Изменить
                      </button>
                    )}
                  </div>

                  {savedSlot === slot && (
                    <p className="mt-1.5 text-right text-[10px] font-bold text-green-400">Сохранено ✓</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
