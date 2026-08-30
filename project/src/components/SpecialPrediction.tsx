import { useEffect, useMemo, useState } from 'react'
import { Eye, Moon, Skull, KeyRound, Gem, Flame, Star, Scroll, Sparkles, Snowflake, ChevronLeft } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { useApp } from '../context/AppContext'

const SPECIAL_PREDICTION_IMAGE = 'https://drive.google.com/uc?id=PLACEHOLDER_REPLACE_LATER'

const SPECIAL_PREDICTION_TEXT = `Послание Всевидящего Фрасимаха открывается лишь тому, кто прошёл все десять врат. Ты сжёг каждый символ, и туман рассеялся. Теперь ты видишь то, что скрыто от остальных. Запомни эти слова, [Имя] — они написаны именно для тебя.`

type SymbolId = 'eye' | 'rune' | 'moon' | 'skull' | 'key' | 'crystal' | 'flame' | 'star' | 'scroll' | 'snowflake'

type MagicalSymbol = {
  id: SymbolId
  label: string
  icon: typeof Eye
}

const SYMBOLS: MagicalSymbol[] = [
  { id: 'eye', label: 'Всевидящий глаз', icon: Eye },
  { id: 'rune', label: 'Древняя руна', icon: Sparkles },
  { id: 'moon', label: 'Луна', icon: Moon },
  { id: 'skull', label: 'Череп', icon: Skull },
  { id: 'key', label: 'Ключ', icon: KeyRound },
  { id: 'crystal', label: 'Кристалл', icon: Gem },
  { id: 'flame', label: 'Пламя', icon: Flame },
  { id: 'star', label: 'Звезда', icon: Star },
  { id: 'scroll', label: 'Свиток', icon: Scroll },
  { id: 'snowflake', label: 'Печать', icon: Snowflake },
]

const COOLDOWN_MS = 24 * 60 * 60 * 1000

type RitualState = {
  destroyed: SymbolId[]
  nextAvailableAt: number
  completed: boolean
}

function getStorageKey(userId: string): string {
  return `special-prediction-${userId}`
}

function getRitualState(userId: string): RitualState {
  return getItem<RitualState>(getStorageKey(userId), {
    destroyed: [],
    nextAvailableAt: 0,
    completed: false,
  })
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SpecialPrediction({ onBack }: { onBack: () => void }) {
  const { currentUser } = useApp()
  const userId = currentUser?.name ?? 'unknown'
  const userName = currentUser?.name ?? ''

  const [state, setState] = useState<RitualState>(() => getRitualState(userId))
  const [now, setNow] = useState(Date.now())
  const [burningId, setBurningId] = useState<SymbolId | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const cooldownRemaining = Math.max(0, state.nextAvailableAt - now)
  const canDestroy = cooldownRemaining <= 0 && !state.completed && state.destroyed.length < SYMBOLS.length

  const persist = (next: RitualState): void => {
    setState(next)
    setItem(getStorageKey(userId), next)
  }

  const destroySymbol = (symbol: MagicalSymbol): void => {
    if (!canDestroy || burningId) return
    if (state.destroyed.includes(symbol.id)) return

    setBurningId(symbol.id)
    window.setTimeout(() => {
      const newDestroyed = [...state.destroyed, symbol.id]
      const completed = newDestroyed.length === SYMBOLS.length
      persist({
        destroyed: newDestroyed,
        nextAvailableAt: completed ? 0 : Date.now() + COOLDOWN_MS,
        completed,
      })
      setBurningId(null)
    }, 800)
  }

  const remainingCount = SYMBOLS.length - state.destroyed.length

  const personalizedText = useMemo(() => {
    return SPECIAL_PREDICTION_TEXT.replaceAll('[Имя]', userName)
  }, [userName])

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-8">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        <ChevronLeft size={18} />
        Назад к Предсказаниям
      </button>

      <div className="mb-4 text-center">
        <p className="text-[10px] font-bold tracking-widest text-accent">АМАЛЬГАМА / 02</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Особое предсказание</h1>
      </div>

      {/* ─── Final message card ─── */}
      {state.completed && (
        <div
          className="animate-scaleIn rounded-2xl border-2 border-purple-500/50 bg-black/60 p-5 text-center backdrop-blur-md"
          style={{ boxShadow: '0 0 30px rgba(168,85,247,0.4), inset 0 0 16px rgba(168,85,247,0.15)' }}
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-400/60 bg-purple-500/15" style={{ boxShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
            <Eye size={30} className="text-purple-300" style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' }} />
          </div>
          <p className="text-[10px] font-extrabold tracking-widest text-purple-300">ПОСЛАНИЕ ВСЕВИДЯЩЕГО ФРАСИМАХА</p>
          <p className="mt-4 text-base font-bold leading-relaxed text-ink">{personalizedText}</p>
        </div>
      )}

      {/* ─── Ritual card ─── */}
      {!state.completed && (
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-purple-500/40 bg-black/50 p-4 backdrop-blur-md"
          style={{ boxShadow: '0 0 24px rgba(168,85,247,0.25), inset 0 0 12px rgba(20,0,30,0.5)' }}
        >
          {/* Background image — replace SPECIAL_PREDICTION_IMAGE constant to swap */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${SPECIAL_PREDICTION_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <div className="relative z-10">
            {/* Progress */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-purple-300">Ритуал сгорания</p>
              <p className="text-sm font-black text-white">
                <span className="text-purple-300">{remainingCount}</span>
                <span className="text-white/40">/{SYMBOLS.length}</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-4 flex gap-1">
              {SYMBOLS.map((s) => (
                <div
                  key={s.id}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: state.destroyed.includes(s.id) ? 'rgba(80,40,100,0.3)' : 'rgba(168,85,247,0.6)',
                    boxShadow: state.destroyed.includes(s.id) ? 'none' : '0 0 4px rgba(168,85,247,0.5)',
                  }}
                />
              ))}
            </div>

            {/* 5x2 grid of magical symbols */}
            <div className="grid grid-cols-5 gap-2">
              {SYMBOLS.map((symbol) => {
                const isDestroyed = state.destroyed.includes(symbol.id)
                const isBurning = burningId === symbol.id
                const isDisabled = !canDestroy || isDestroyed || burningId !== null
                const Icon = symbol.icon

                if (isDestroyed) {
                  return (
                    <div key={symbol.id} className="flex aspect-square items-center justify-center">
                      <div className="flex h-full w-full items-center justify-center rounded-xl border border-purple-900/30 bg-black/40">
                        <Icon size={20} className="text-purple-900/40" />
                      </div>
                    </div>
                  )
                }

                return (
                  <button
                    key={symbol.id}
                    onClick={() => destroySymbol(symbol)}
                    disabled={isDisabled}
                    className={`group relative flex aspect-square items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                      isBurning
                        ? 'animate-symbolBurn border-orange-400/80 bg-orange-500/20'
                        : isDisabled
                          ? 'border-white/10 bg-black/40 opacity-40'
                          : 'border-purple-400/50 bg-purple-500/10 hover:bg-purple-500/20 active:scale-90'
                    }`}
                    style={
                      isBurning
                        ? { boxShadow: '0 0 20px rgba(255,140,0,0.7)' }
                        : !isDisabled
                          ? { boxShadow: '0 0 10px rgba(168,85,247,0.3)' }
                          : undefined
                    }
                  >
                    <Icon
                      size={24}
                      className={`transition-all duration-200 ${
                        isBurning
                          ? 'text-orange-300'
                          : isDisabled
                            ? 'text-white/30'
                            : 'text-purple-300 group-hover:text-white group-active:scale-90'
                      }`}
                      style={
                        !isDisabled && !isBurning
                          ? { filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.6))' }
                          : isBurning
                            ? { filter: 'drop-shadow(0 0 6px rgba(255,140,0,0.8))' }
                            : undefined
                      }
                    />
                  </button>
                )
              })}
            </div>

            {/* Cooldown timer */}
            {!canDestroy && !state.completed && cooldownRemaining > 0 && (
              <div className="mt-4 rounded-lg border border-purple-500/20 bg-black/40 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-purple-300/80">
                  Следующий выбор через <span className="font-black text-purple-200">{formatDuration(cooldownRemaining)}</span>
                </p>
              </div>
            )}

            {canDestroy && state.destroyed.length > 0 && (
              <div className="mt-4 rounded-lg border border-purple-500/20 bg-black/40 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-purple-300/80">
                  Выбери один символ для сгорания
                </p>
              </div>
            )}

            {state.destroyed.length === 0 && (
              <div className="mt-4 rounded-lg border border-purple-500/20 bg-black/40 px-3 py-2 text-center">
                <p className="text-[11px] font-bold text-purple-300/80">
                  Нажми на любой символ, чтобы начать ритуал
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
