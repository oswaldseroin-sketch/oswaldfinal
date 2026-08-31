import { useEffect, useRef, useState } from 'react'
import { DoorOpen, KeyRound, Lock } from 'lucide-react'
import { nominations } from '../lib/nominations'
import { getItem, setItem } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import NameDropdown from './NameDropdown'

const QUEST_KEY = 'secret-quest-passed'
const FLY_MS = 700
type Phase = 'idle' | 'flying' | 'success' | 'breaking'
type Shard = { x: number; y: number; dx: number; dy: number; r: number }

type NeonColor = { border: string; glow: string; text: string }

const neonColors: NeonColor[] = [
  { border: 'rgba(57,255,20,0.7)', glow: 'rgba(57,255,20,0.45)', text: '#39ff14' },
  { border: 'rgba(57,255,20,0.7)', glow: 'rgba(57,255,20,0.45)', text: '#39ff14' },
  { border: 'rgba(57,255,20,0.7)', glow: 'rgba(57,255,20,0.45)', text: '#39ff14' },
  { border: 'rgba(57,255,20,0.7)', glow: 'rgba(57,255,20,0.45)', text: '#39ff14' },
  { border: 'rgba(255,43,214,0.7)', glow: 'rgba(255,43,214,0.45)', text: '#ff2bd6' },
  { border: 'rgba(255,43,214,0.7)', glow: 'rgba(255,43,214,0.45)', text: '#ff2bd6' },
  { border: 'rgba(255,43,214,0.7)', glow: 'rgba(255,43,214,0.45)', text: '#ff2bd6' },
  { border: 'rgba(255,43,214,0.7)', glow: 'rgba(255,43,214,0.45)', text: '#ff2bd6' },
  { border: 'rgba(0,229,255,0.7)', glow: 'rgba(0,229,255,0.45)', text: '#00e5ff' },
  { border: 'rgba(0,229,255,0.7)', glow: 'rgba(0,229,255,0.45)', text: '#00e5ff' },
]

export default function SecretQuest({ onUnlocked }: { onUnlocked: () => void }) {
  const { workers } = useApp()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [shards, setShards] = useState<Shard[]>([])
  const [showRedFlash, setShowRedFlash] = useState(false)
  const [keyTransform, setKeyTransform] = useState({ x: 0, y: 0 })
  const [keyTransition, setKeyTransition] = useState(false)
  const [attempts, setAttempts] = useState<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const keyRef = useRef<HTMLDivElement>(null)
  const lockRef = useRef<HTMLDivElement>(null)
  const alreadyPassed = getItem<boolean>(QUEST_KEY, false)

  const allFilled = nominations.every((nomination) => Boolean(answers[nomination.id]))
  const filledCount = Object.keys(answers).length

  useEffect(() => {
    if (alreadyPassed) onUnlocked()
  }, [alreadyPassed, onUnlocked])

  useEffect(() => {
    void supabase
      .from('secret_attempts')
      .select('attempts')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAttempts((data as { attempts: number }).attempts)
      })
  }, [])

  const updateAnswer = (id: string, value: string): void => {
    setAnswers((current) => ({ ...current, [id]: value }))
  }

  const isCorrect = (): boolean =>
    nominations.every((nomination) => answers[nomination.id] === nomination.correct)

  const resetKey = (): void => {
    setKeyTransition(true)
    setKeyTransform({ x: 0, y: 0 })
    setPhase('idle')
  }

  const breakKey = (): void => {
    const key = keyRef.current
    if (!key) return
    const rect = key.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const next = Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2
      return {
        x: cx,
        y: cy,
        dx: Math.cos(angle) * (55 + Math.random() * 75),
        dy: Math.sin(angle) * (55 + Math.random() * 75),
        r: Math.random() * 360,
      }
    })
    setShards(next)
    setShowRedFlash(true)
    setPhase('breaking')
    window.setTimeout(() => {
      setShards([])
      setShowRedFlash(false)
      setAnswers({})
      resetKey()
    }, 2000)
  }

  const handleKeyClick = (): void => {
    if (!allFilled || phase !== 'idle' || !keyRef.current || !lockRef.current) return
    const keyRect = keyRef.current.getBoundingClientRect()
    const lockRect = lockRef.current.getBoundingClientRect()
    const dx = lockRect.left + lockRect.width / 2 - (keyRect.left + keyRect.width / 2)
    const dy = lockRect.top + lockRect.height / 2 - (keyRect.top + keyRect.height / 2)
    setKeyTransition(true)
    setKeyTransform({ x: dx, y: dy })
    setPhase('flying')
    void supabase.rpc('increment_secret_attempt').then(({ data }) => {
      if (typeof data === 'number') setAttempts(data)
    })
    window.setTimeout(() => {
      if (isCorrect()) {
        setPhase('success')
        setItem(QUEST_KEY, true)
        window.setTimeout(onUnlocked, 1500)
      } else {
        breakKey()
      }
    }, FLY_MS)
  }

  return (
       <div className="secret-quest relative min-h-screen overflow-y-auto pb-32">

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold tracking-[0.08em] text-white" style={{ textShadow: '0 0 14px rgba(255,43,214,0.8), 0 0 28px rgba(168,85,247,0.5)' }}>Выбери правильные варианты и войди в секретную дверь</p>
        <p className="shrink-0 text-xl font-extrabold text-accent" style={{ textShadow: '0 0 12px rgba(255,43,214,0.7)' }}>{filledCount}/10</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {nominations.map((nomination, index) => {
          const color = neonColors[index]
          return (
            <label
              key={nomination.id}
              className="min-w-0 rounded-xl border-2 bg-black/50 p-3 backdrop-blur-md transition-all duration-200"
              style={{
                borderColor: color.border,
                boxShadow: `0 0 15px ${color.glow}, inset 0 0 8px rgba(0,0,0,0.4)`,
              }}
            >
            <span className="mb-2 block text-[14px] font-extrabold uppercase leading-tight tracking-[-0.02em] text-white" style={{ textShadow: `0 0 8px ${color.glow}, 0 0 16px ${color.glow}` }}>
                <span className="mr-1.5" style={{ color: color.text }}>{String(index + 1).padStart(2, '0')}</span>{nomination.label}
              </span>
              <NameDropdown
                value={answers[nomination.id] ?? ''}
                onChange={(val) => updateAnswer(nomination.id, val)}
                workers={workers}
                color={color}
                open={openDropdown === nomination.id}
                onOpenChange={(o) => setOpenDropdown(o ? nomination.id : null)}
              />
            </label>
          )
        })}
      </div>

      <div className="relative mt-6 mb-16 flex flex-1 flex-col items-center justify-center" style={{ minHeight: '30vh' }}>
        <div
          ref={lockRef}
          className={`relative z-20 flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${phase === 'flying' ? 'scale-110' : 'scale-100'}`}
          style={{
            width: 96,
            height: 96,
            borderColor: phase === 'success' ? 'rgba(34,197,94,0.9)' : 'rgba(168,85,247,0.9)',
            background: phase === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(20,0,30,0.7)',
            boxShadow: phase === 'flying'
              ? '0 0 50px rgba(168,85,247,0.9), 0 0 100px rgba(168,85,247,0.4), inset 0 0 16px rgba(168,85,247,0.4)'
              : phase === 'success'
                ? '0 0 45px rgba(34,197,94,0.7), 0 0 90px rgba(34,197,94,0.3), inset 0 0 14px rgba(34,197,94,0.3)'
                : '0 0 40px rgba(168,85,247,0.6), 0 0 80px rgba(168,85,247,0.25), inset 0 0 14px rgba(168,85,247,0.3)',
          }}
        >
          {phase === 'success' ? (
            <DoorOpen size={44} className="text-success" style={{ filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.7))' }} />
          ) : (
            <Lock size={48} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' }} />
          )}
        </div>

        {allFilled && phase !== 'success' && (
          <div
            ref={keyRef}
            className={`absolute z-30 ${phase === 'breaking' ? 'animate-keyBreak' : 'animate-keyPulse'} ${phase === 'idle' ? 'cursor-pointer' : ''}`}
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + 90px + ${keyTransform.x}px), calc(-50% + ${keyTransform.y}px))`,
              transition: keyTransition ? `transform ${FLY_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
            }}
            onClick={handleKeyClick}
          >
            <div className="mb-1.5 text-center text-base font-extrabold tracking-wide text-amber-300" style={{ textShadow: '0 0 10px rgba(251,191,36,0.7)' }}>Пробуем?</div>
            <div className="key-artifact relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-400/10" style={{ boxShadow: '0 0 30px rgba(251,191,36,0.7), 0 0 60px rgba(251,191,36,0.3)' }}>
              <KeyRound size={28} className="text-amber-300" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }} />
            </div>
          </div>
        )}

        {phase === 'breaking' && shards.map((shard, index) => (
          <span
            key={index}
            className="pointer-events-none fixed z-50 h-2 w-2 rounded-sm bg-amber-400"
            style={{
              left: shard.x,
              top: shard.y,
              animation: 'shardFly .8s ease-out forwards',
              ['--dx' as string]: `${shard.dx}px`,
              ['--dy' as string]: `${shard.dy}px`,
              ['--rot' as string]: `${shard.r}deg`,
              boxShadow: '0 0 6px rgba(251,191,36,0.8)',
            }}
          />
        ))}
        {showRedFlash && <div className="pointer-events-none fixed inset-0 z-40 animate-redFlash bg-red-500/30" />}

        {attempts !== null && (
          <div className="mt-5 flex items-center gap-2 rounded-full border border-accent/30 bg-black/40 px-4 py-2 backdrop-blur-md" style={{ boxShadow: '0 0 12px rgba(255,43,214,0.15)' }}>
            <span className="text-base">🗝️</span>
            <span className="text-sm font-bold tracking-wide text-accent/80">Попыток входа:</span>
            <span className="text-base font-black text-accent" style={{ textShadow: '0 0 8px rgba(255,43,214,0.5)' }}>{attempts}</span>
          </div>
        )}
      </div>

      <p className="absolute bottom-1 left-0 right-0 text-center text-base font-bold text-ink-muted" style={{ textShadow: '0 0 8px rgba(0,0,0,0.6)' }}>
        {!allFilled ? 'Заполни все номинации, чтобы получить ключ' : phase === 'breaking' ? 'Ключ сломался. Выбери заново все варианты' : phase === 'flying' ? 'Ключ летит к замку...' : 'Нажми на ключ, чтобы открыть дверь'}
      </p>
    </div>
  )
}
