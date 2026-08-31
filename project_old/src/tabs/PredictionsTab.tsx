import { useEffect, useState } from 'react'
import { LockKeyhole, Sparkles, X, Eye } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BackButton from '../components/BackButton'
import SwipeBack from '../components/SwipeBack'
import SpecialPrediction from '../components/SpecialPrediction'
import { getItem, removeItem, setItem, todayKey } from '../lib/storage'
import { getPredictionForWorker } from '../lib/workers'
import { api } from '../lib/api'

type SavedPrediction = {
  date: string
  name: string
  text: string
}

type PredictionCount = {
  name: string
  count: number
}

const predictionPrefix = 'daily-prediction-v2'

function getPredictionKey(playerId: string): string {
  return `${predictionPrefix}-${playerId}`
}

function getSavedPrediction(playerId: string): SavedPrediction | null {
  const key = getPredictionKey(playerId)
  const saved = getItem<SavedPrediction | null>(key, null)
  if (!saved || saved.date !== todayKey()) {
    removeItem(key)
    return null
  }
  return saved
}

function getMillisecondsUntilTomorrow(): number {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 50)
  return tomorrow.getTime() - Date.now()
}

export default function PredictionsTab({ onBack }: { onBack: () => void }) {
  const { isAdmin, unlock, lock, workers, currentUser } = useApp()
  const name = currentUser?.name ?? ''
  const playerId = currentUser?.name ?? 'unknown'
  const [prediction, setPrediction] = useState(() => getSavedPrediction(playerId)?.text ?? '')
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [counts, setCounts] = useState<PredictionCount[]>([])
  const [countsError, setCountsError] = useState(false)
  const [showSpecial, setShowSpecial] = useState(false)

  useEffect(() => {
    const saved = getSavedPrediction(playerId)
    setPrediction(saved?.text ?? '')
  }, [playerId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      removeItem(getPredictionKey(playerId))
      setPrediction('')
    }, getMillisecondsUntilTomorrow())

    return () => window.clearTimeout(timer)
  }, [playerId])

  const loadCounts = async (): Promise<void> => {
    try {
      const data = await api.getPredictionCounts()
      setCounts(data ?? [])
      setCountsError(false)
    } catch {
      setCountsError(true)
    }
  }

  useEffect(() => {
    if (adminOpen && isAdmin) void loadCounts()
  }, [adminOpen, isAdmin])

  const reveal = async (): Promise<void> => {
    if (!name || prediction) return
    const worker = workers.find((item) => item.name === name)
    if (!worker) return

    const text = getPredictionForWorker(worker, new Date(), 0, workers)
    setPrediction(text)
    setItem(getPredictionKey(playerId), { date: todayKey(), name: worker.name, text })
    void api.incrementPredictionCount(worker.name)
  }

  const openAdmin = (): void => {
    setAdminOpen(true)
    setAdminError('')
    if (isAdmin) void loadCounts()
  }

  const submitAdminPassword = (): void => {
    if (unlock(adminPassword)) {
      setAdminPassword('')
      setAdminError('')
      void loadCounts()
    } else {
      setAdminError('Неверный пароль')
    }
  }

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const locked = Boolean(prediction)

  if (showSpecial) {
    return (
      <SwipeBack onBack={() => setShowSpecial(false)} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
        <SpecialPrediction onBack={() => setShowSpecial(false)} />
      </SwipeBack>
    )
  }

  return (
    <div
      className="relative mx-auto min-h-screen max-w-md px-6 pb-10 pt-10"
      style={{
        backgroundImage: 'url(/predictions-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Light dark overlay for readability — keeps mystical details visible */}
      <div className="pointer-events-none fixed inset-0 bg-black/35" />

      <div className="relative z-10">
      <BackButton onBack={onBack} />
      <div className="mb-6">
        <p className="text-[10px] font-bold tracking-widest text-accent">АМАЛЬГАМА / 02</p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Предсказания</h1>
      </div>

      {/* Two magical modes side by side */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {/* Normal prediction */}
        <div className="flex flex-col items-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border border-accent/30 bg-black/40 backdrop-blur-sm"
            style={{ boxShadow: '0 0 28px rgba(255,43,214,0.35), inset 0 0 12px rgba(255,43,214,0.15)' }}
          >
            <div className="flex items-center justify-center rounded-full bg-accent/10" style={{ width: 72, height: 72 }}>
              <Sparkles size={34} color="#ff2bd6" strokeWidth={1.4} className="animate-pulseGlow" />
            </div>
          </div>
          <p className="mt-2 text-[11px] font-extrabold tracking-wide text-accent/80">ПРЕДСКАЗАНИЕ</p>
        </div>

        {/* Special prediction */}
        <button
          onClick={() => setShowSpecial(true)}
          className="flex flex-col items-center transition-transform active:scale-95"
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border border-purple-400/40 bg-black/40 backdrop-blur-sm"
            style={{ boxShadow: '0 0 28px rgba(168,85,247,0.35), inset 0 0 12px rgba(168,85,247,0.15)' }}
          >
            <div className="flex items-center justify-center rounded-full bg-purple-500/10" style={{ width: 72, height: 72 }}>
              <Eye size={34} color="#a855f7" strokeWidth={1.4} className="animate-pulseGlow" />
            </div>
          </div>
          <p className="mt-2 text-[11px] font-extrabold tracking-wide text-purple-300/80">ОСОБОЕ ПРЕДСКАЗАНИЕ</p>
        </button>
      </div>

      {/* Normal prediction button */}
      <div>
        <button
          onClick={reveal}
          disabled={locked || !name}
          className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-sm font-extrabold transition-transform active:scale-95 ${locked || !name ? 'border border-line bg-card/70 backdrop-blur-md text-ink-faint' : 'bg-accent text-white'}`}
          style={!locked && name ? { boxShadow: '0 4px 16px rgba(255,43,214,0.35)' } : undefined}
        >
          <Sparkles size={18} color={locked || !name ? '#5a6172' : '#ffffff'} />
          {locked ? 'СУДЬБА УЖЕ РЕШЕНА' : 'УЗНАТЬ СВОЮ СУДЬБУ'}
        </button>
      </div>

      {locked && (
        <div className="mt-5 rounded-2xl border border-accent/45 bg-accent/5 p-5 text-center backdrop-blur-md shadow-[0_0_24px_rgba(255,43,214,0.16)]">
          <p className="text-[10px] font-extrabold tracking-widest text-accent">🔮 ПРЕДСКАЗАНИЕ СУДЬБЫ НА СЕГОДНЯ</p>
          <p className="mt-1 text-[10px] tracking-wide text-ink-faint">{today}</p>
          <p className="mt-4 text-xl font-extrabold leading-relaxed text-ink">{prediction}</p>
          <p className="mt-5 text-xs leading-relaxed text-accent">Твоя судьба на сегодня уже решена! Приходи завтра</p>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={openAdmin}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/70 shadow-lg backdrop-blur-md transition-transform active:scale-90"
          title="Статистика предсказаний"
        >
          <LockKeyhole size={17} color={isAdmin ? '#22ff88' : '#8b92a3'} strokeWidth={2.2} />
        </button>
      </div>

      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setAdminOpen(false)}>
          <div className="relative max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-accent/30 bg-card/95 p-6 backdrop-blur-md" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setAdminOpen(false)} className="absolute right-4 top-4 text-ink-muted"><X size={19} /></button>

            {!isAdmin ? (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><LockKeyhole size={22} color="#ff2bd6" /></div>
                <h2 className="text-xl font-extrabold text-ink">Статистика предсказаний</h2>
                <p className="mt-1 text-sm text-ink-muted">Введите пароль, чтобы посмотреть количество гаданий</p>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && submitAdminPassword()}
                  placeholder="Пароль"
                  inputMode="numeric"
                  className="mt-4 h-13 w-full rounded-xl border border-line bg-input px-4 py-3 text-lg tracking-widest text-ink outline-none focus:border-accent"
                />
                {adminError && <p className="mt-2 text-xs text-error">{adminError}</p>}
                <button onClick={submitAdminPassword} className="mt-4 h-12 w-full rounded-xl bg-accent text-sm font-extrabold text-white transition-transform active:scale-95">Войти</button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-extrabold text-accent">Гадания по фамилиям</h2>
                <p className="mt-1 text-sm text-ink-muted">Сколько раз выбирали каждого сотрудника</p>
                {countsError ? (
                  <p className="mt-5 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">Не удалось загрузить статистику.</p>
                ) : counts.length === 0 ? (
                  <p className="mt-5 rounded-xl border border-line bg-black/30 p-4 text-center text-sm text-ink-muted">Пока никто не гадал.</p>
                ) : (
                  <div className="mt-5 space-y-2">
                    {counts.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                        <span className="w-6 text-center text-xs font-black text-ink-faint">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{item.name}</span>
                        <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-sm font-black text-accent">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { lock(); setAdminOpen(false) }}
                  className="mt-4 w-full text-center text-xs font-bold text-ink-muted transition-colors hover:text-error"
                >
                  Выйти из админа
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
