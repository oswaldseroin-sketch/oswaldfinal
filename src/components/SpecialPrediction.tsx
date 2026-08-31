import { useEffect, useMemo, useState } from 'react'
import { Eye, Moon, Skull, KeyRound, Gem, Flame, Star, Scroll, Sparkles, Snowflake, ChevronLeft } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { useApp } from '../context/AppContext'
import { SPECIAL_PREDICTION_MESSAGES } from '../lib/specialPredictionMessages'

const RITUAL_IMAGE = '/frasimah-ritual.webp'



type SymbolId = 'eye' | 'rune' | 'moon' | 'skull' | 'key' | 'crystal' | 'flame' | 'star' | 'scroll' | 'snowflake'

type ArtifactColor = {
  glow: string
  glowStrong: string
  icon: string
  spark: string
  burnFlash: string
}

type MagicalSymbol = {
  id: SymbolId
  label: string
  icon: typeof Eye
  pos: { x: number; y: number }
  color: ArtifactColor
}

const SYMBOLS: MagicalSymbol[] = [
  { id: 'eye', label: 'Всевидящий глаз', icon: Eye, pos: { x: 18, y: 14 },
    color: { glow: 'rgba(255,43,214,0.35)', glowStrong: 'rgba(255,43,214,0.15)', icon: '#ff2bd6', spark: '#ff2bd6', burnFlash: 'rgba(255,43,214,0.9)' } },
  { id: 'rune', label: 'Древняя руна', icon: Sparkles, pos: { x: 50, y: 14 },
    color: { glow: 'rgba(168,85,247,0.35)', glowStrong: 'rgba(168,85,247,0.15)', icon: '#a855f7', spark: '#a855f7', burnFlash: 'rgba(168,85,247,0.9)' } },
  { id: 'moon', label: 'Луна', icon: Moon, pos: { x: 82, y: 14 },
    color: { glow: 'rgba(80,150,255,0.35)', glowStrong: 'rgba(80,150,255,0.15)', icon: '#5096ff', spark: '#5096ff', burnFlash: 'rgba(80,150,255,0.9)' } },
  { id: 'skull', label: 'Череп', icon: Skull, pos: { x: 18, y: 38 },
    color: { glow: 'rgba(220,50,50,0.35)', glowStrong: 'rgba(220,50,50,0.15)', icon: '#dc3232', spark: '#dc3232', burnFlash: 'rgba(220,50,50,0.9)' } },
  { id: 'key', label: 'Ключ', icon: KeyRound, pos: { x: 50, y: 38 },
    color: { glow: 'rgba(255,170,50,0.35)', glowStrong: 'rgba(255,170,50,0.15)', icon: '#ffaa32', spark: '#ffaa32', burnFlash: 'rgba(255,170,50,0.9)' } },
  { id: 'crystal', label: 'Кристалл', icon: Gem, pos: { x: 82, y: 38 },
    color: { glow: 'rgba(40,200,120,0.35)', glowStrong: 'rgba(40,200,120,0.15)', icon: '#28c878', spark: '#28c878', burnFlash: 'rgba(40,200,120,0.9)' } },
  { id: 'flame', label: 'Пламя', icon: Flame, pos: { x: 18, y: 62 },
    color: { glow: 'rgba(0,229,255,0.35)', glowStrong: 'rgba(0,229,255,0.15)', icon: '#00e5ff', spark: '#00e5ff', burnFlash: 'rgba(0,229,255,0.9)' } },
  { id: 'star', label: 'Звезда', icon: Star, pos: { x: 50, y: 62 },
    color: { glow: 'rgba(255,100,180,0.35)', glowStrong: 'rgba(255,100,180,0.15)', icon: '#ff64b4', spark: '#ff64b4', burnFlash: 'rgba(255,100,180,0.9)' } },
  { id: 'scroll', label: 'Свиток', icon: Scroll, pos: { x: 82, y: 62 },
    color: { glow: 'rgba(130,200,255,0.35)', glowStrong: 'rgba(130,200,255,0.15)', icon: '#82c8ff', spark: '#82c8ff', burnFlash: 'rgba(130,200,255,0.9)' } },
  { id: 'snowflake', label: 'Печать', icon: Snowflake, pos: { x: 50, y: 86 },
    color: { glow: 'rgba(255,215,80,0.35)', glowStrong: 'rgba(255,215,80,0.15)', icon: '#ffd750', spark: '#ffd750', burnFlash: 'rgba(255,215,80,0.9)' } },
]

const COOLDOWN_MS = 24 * 60 * 60 * 1000

type RitualState = {
  destroyed: SymbolId[]
  nextAvailableAt: number
  completed: boolean
  messageIndex: number
}

type Spark = { dx: number; dy: number; r: number; delay: number }

function getStorageKey(userId: string): string {
  return `special-prediction-${userId}`
}

function getRitualState(userId: string): RitualState {
  const saved = getItem<Partial<RitualState>>(getStorageKey(userId), {})

  return {
    destroyed: saved.destroyed ?? [],
    nextAvailableAt: saved.nextAvailableAt ?? 0,
    completed: saved.completed ?? false,
    messageIndex: saved.messageIndex ?? 0,
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function generateSparks(): Spark[] {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5
    const dist = 20 + Math.random() * 30
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      r: Math.random() * 360,
      delay: Math.random() * 0.15,
    }
  })
}

export default function SpecialPrediction({ onBack }: { onBack: () => void }) {
  const { currentUser } = useApp()
  const userId = currentUser?.name ?? 'unknown'
  const userName = currentUser?.name ?? ''

  const [state, setState] = useState<RitualState>(() => getRitualState(userId))
  const [now, setNow] = useState(Date.now())
  const [burningId, setBurningId] = useState<SymbolId | null>(null)
  const [sparks, setSparks] = useState<Spark[]>([])
  const [awakening, setAwakening] = useState(false)

  useEffect(() => {
    setState(getRitualState(userId))
    setBurningId(null)
    setSparks([])
    setAwakening(false)
  }, [userId])

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

    const isLast = state.destroyed.length === SYMBOLS.length - 1
    setBurningId(symbol.id)
    setSparks(generateSparks())

    const burnDuration = isLast ? 1200 : 800
    window.setTimeout(() => {
      const newDestroyed = [...state.destroyed, symbol.id]
      const completed = newDestroyed.length === SYMBOLS.length

      if (completed) {
        setAwakening(true)
        window.setTimeout(() => {
          persist({
  destroyed: newDestroyed,
  nextAvailableAt: 0,
  completed: true,
  messageIndex: state.messageIndex,
})
          setBurningId(null)
          setSparks([])
          window.setTimeout(() => setAwakening(false), 600)
        }, 1000)
      } else {
        persist({
  destroyed: newDestroyed,
  nextAvailableAt: Date.now() + COOLDOWN_MS,
  completed: false,
  messageIndex: state.messageIndex,
})
        setBurningId(null)
        setSparks([])
      }
    }, burnDuration)
  }

  const remainingCount = SYMBOLS.length - state.destroyed.length
const personalizedText = useMemo(() => {
  const messages = SPECIAL_PREDICTION_MESSAGES[userName] ?? []

  if (messages.length === 0) {
    return 'Фрасимах пока не оставил для тебя особого напутствия.'
  }

  const index = state.messageIndex % messages.length

  return messages[index]
}, [userName, state.messageIndex])
 

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-8">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        <ChevronLeft size={18} />
        Назад к Предсказаниям
      </button>

      {/* ─── Mystical title ─── */}
      <div className="mb-3 text-center">
        <h1
          className="text-2xl font-black tracking-wide text-white"
          style={{ textShadow: '0 0 14px rgba(168,85,247,0.8), 0 0 28px rgba(255,43,214,0.4)' }}
        >
          ПРОБУДИ ФРАСИМАХА
        </h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[12px] font-medium leading-snug text-purple-300/70">
          Уничтожь 10 артефактов, чтобы пробудить Всевидящего. Когда исчезнет последний — Фрасимах откроет тебе особое напутствие.
        </p>
      </div>

      {/* ─── Final message ─── */}
      {state.completed && !awakening && (
        <div
          className="animate-scaleIn rounded-2xl border-2 border-purple-500/50 bg-black/70 p-5 text-center backdrop-blur-md"
          style={{ boxShadow: '0 0 30px rgba(168,85,247,0.4), inset 0 0 16px rgba(168,85,247,0.15)' }}
        >
          <p
            className="text-xl font-black tracking-wide text-white"
            style={{ textShadow: '0 0 12px rgba(168,85,247,0.9), 0 0 24px rgba(255,43,214,0.5)' }}
          >
            ФРАСИМАХ ПРОБУЖДЁН
          </p>
          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-purple-400/60 bg-purple-500/15" style={{ boxShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
            <Eye size={26} className="text-purple-200" style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' }} />
          </div>
          <p className="mt-4 text-[10px] font-extrabold tracking-widest text-purple-300">ОСОБОЕ НАПУТСТВИЕ ВСЕВИДЯЩЕГО ФРАСИМАХА</p>
          <p className="mt-3 text-[15px] font-bold leading-relaxed text-ink">{personalizedText}</p>
          <button
  type="button"
  onClick={() => {
    persist({
      destroyed: [],
      nextAvailableAt: Date.now() + COOLDOWN_MS,
      completed: false,
      messageIndex: (state.messageIndex + 1) % 20,
    })
  }}
  className="mt-5 w-full rounded-xl border border-purple-400/40 bg-purple-500/15 px-4 py-3 text-sm font-extrabold text-purple-200 transition active:scale-95"
>
  НАЧАТЬ НОВЫЙ РИТУАЛ
</button>
        </div>
      )}

      {/* ─── Ritual scene ─── */}
      {!state.completed && (
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-purple-500/40"
          style={{ boxShadow: '0 0 24px rgba(168,85,247,0.25)' }}
        >
          {/* Progress bar — above the image, never overlaps artifacts */}
          <div className="flex items-center justify-between gap-2 border-b border-purple-500/20 bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-purple-300/80">Ритуал пробуждения</p>
              <span className="text-sm font-black text-white">
                <span className="text-purple-300">{remainingCount}</span>
                <span className="text-white/40">/{SYMBOLS.length}</span>
              </span>
            </div>
            <div className="flex gap-0.5">
              {SYMBOLS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: i < remainingCount ? 'rgba(168,85,247,0.8)' : 'rgba(60,30,80,0.4)',
                    boxShadow: i < remainingCount ? '0 0 3px rgba(168,85,247,0.6)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Ritual image as the scene base */}
          <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
            <img
              src={RITUAL_IMAGE}
              alt="Ритуал пробуждения Фрасимаха"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />

            {/* Dark overlay for contrast when cooling down */}
            {cooldownRemaining > 0 && !burningId && (
              <div className="pointer-events-none absolute inset-0 bg-black/30 transition-opacity duration-500" />
            )}

            {/* Awakening flash */}
            {awakening && (
              <div className="pointer-events-none absolute inset-0 z-40 animate-ritualFlash bg-purple-400/40" />
            )}

            {/* Magical symbols overlaid on the image */}
            {SYMBOLS.map((symbol) => {
              const isDestroyed = state.destroyed.includes(symbol.id)
              const isBurning = burningId === symbol.id
              const isDisabled = !canDestroy || isDestroyed || burningId !== null
              const Icon = symbol.icon
              const isLast = state.destroyed.length === SYMBOLS.length - 1 && !isDestroyed
              const c = symbol.color

              if (isDestroyed) {
                return <div key={symbol.id} />
              }

              return (
                <button
                  key={symbol.id}
                  onClick={() => destroySymbol(symbol)}
                  disabled={isDisabled}
                  className={`group absolute z-20 flex items-center justify-center rounded-full transition-all duration-200 ${
                    isBurning
                      ? 'animate-symbolBurn'
                      : isDisabled
                        ? 'opacity-40'
                        : isLast
                          ? 'animate-pulseGlow'
                          : 'hover:scale-110 active:scale-90'
                  }`}
                  style={{
                    left: `${symbol.pos.x}%`,
                    top: `${symbol.pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '15%',
                    aspectRatio: '1 / 1',
                    minWidth: 38,
                  }}
                  aria-label={symbol.label}
                >
                  {/* Glow ring — per-artifact color */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-200 ${!isBurning && !isDisabled ? 'animate-artifactPulse' : ''}`}
                    style={{
                      background: isBurning
                        ? `radial-gradient(circle, ${c.burnFlash} 0%, ${c.glow} 60%, transparent 100%)`
                        : isDisabled
                          ? `radial-gradient(circle, ${c.glow.replace('0.35', '0.12')} 0%, transparent 70%)`
                          : `radial-gradient(circle, ${c.glow} 0%, ${c.glowStrong} 60%, transparent 100%)`,
                      boxShadow: isBurning
                        ? `0 0 24px ${c.burnFlash}, 0 0 48px ${c.glow}`
                        : !isDisabled
                          ? `0 0 14px ${c.glow}, inset 0 0 8px ${c.glowStrong}`
                          : 'none',
                    }}
                  />
                  {/* Symbol icon — per-artifact color */}
                  <Icon
                    size={26}
                    className={`relative z-10 transition-all duration-200 ${
                      isBurning
                        ? ''
                        : isDisabled
                          ? ''
                          : 'group-hover:text-white group-active:scale-75'
                    }`}
                    style={{
                      color: isBurning ? '#ffffff' : isDisabled ? 'rgba(255,255,255,0.35)' : c.icon,
                      filter: isBurning
                        ? `drop-shadow(0 0 10px ${c.burnFlash})`
                        : !isDisabled
                          ? `drop-shadow(0 0 6px ${c.glow})`
                          : 'none',
                    }}
                    strokeWidth={1.6}
                  />

                  {/* Sparks during burn — per-artifact color */}
                  {isBurning && sparks.map((spark, i) => (
                    <span
                      key={i}
                      className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-1.5 w-1.5 rounded-full"
                      style={{
                        animation: `sparkFly 0.6s ease-out ${spark.delay}s forwards`,
                        ['--dx' as string]: `${spark.dx}px`,
                        ['--dy' as string]: `${spark.dy}px`,
                        ['--rot' as string]: `${spark.r}deg`,
                        background: c.spark,
                        boxShadow: `0 0 6px ${c.burnFlash}`,
                      }}
                    />
                  ))}
                </button>
              )
            })}
          </div>

          {/* Timer / hint below the image */}
          <div className="border-t border-purple-500/20 bg-black/60 px-3 py-2 text-center backdrop-blur-sm">
            {cooldownRemaining > 0 && !burningId ? (
              <p className="text-[11px] font-bold text-purple-300/70">
                Следующий артефакт можно уничтожить через: <span className="font-black tabular-nums text-purple-200">{formatDuration(cooldownRemaining)}</span>
              </p>
            ) : burningId ? (
              <p className="text-[11px] font-bold text-orange-300/80 animate-pulse">Артефакт сгорает...</p>
            ) : state.destroyed.length === 0 ? (
              <p className="text-[11px] font-bold text-purple-300/70">Нажми на любой артефакт, чтобы начать ритуал</p>
            ) : (
              <p className="text-[11px] font-bold text-purple-300/70">Выбери один артефакт для уничтожения</p>
            )}
          </div>
        </div>
      )}

      {/* Awakening overlay */}
      {awakening && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="animate-scaleIn text-center">
            <p
              className="text-3xl font-black tracking-wide text-white"
              style={{ textShadow: '0 0 20px rgba(168,85,247,1), 0 0 40px rgba(255,43,214,0.6)' }}
            >
              ФРАСИМАХ ПРОБУЖДЁН
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
