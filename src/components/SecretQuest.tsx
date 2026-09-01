import { useEffect, useState } from 'react'
import { Sparkles, Zap, Crown, Settings } from 'lucide-react'
import { nominations as fallbackNominations, type Nomination } from '../lib/nominations'
import { getItem, setItem } from '../lib/storage'
import { api, type SecretRoomQuestion } from '../lib/api'
import { useApp } from '../context/AppContext'
import NameDropdown from './NameDropdown'
import SecretAdminPanel from './SecretAdminPanel'

const QUEST_PREFIX = 'secret-quest-passed'

type Phase = 'idle' | 'success' | 'breaking'


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

// ─── Hints storage key prefixes (suffixed with userId at runtime) ───
const HINT_NORMAL_PREFIX = 'secret-hint-normal-ts'
const HINT_BIG_PREFIX = 'secret-hint-big-ts'
const HINT_MEGA_PREFIX = 'secret-hint-mega-ts'
const HINT_MEGA_CHARGE_PREFIX = 'secret-hint-mega-charge'

const NORMAL_COOLDOWN = 3 * 60 * 60 * 1000
const BIG_COOLDOWN = 24 * 60 * 60 * 1000
const MEGA_COOLDOWN = 24 * 60 * 60 * 1000

type HintResult = { nominationId: string; notName: string }
type MegaResult = HintResult[]

function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function SecretQuest({ onUnlocked }: { onUnlocked: () => void }) {
  const { workers, currentUser } = useApp()
  const playerId = currentUser?.name ?? 'unknown'

  const hintNormalKey = `${HINT_NORMAL_PREFIX}-${playerId}`
  const hintBigKey = `${HINT_BIG_PREFIX}-${playerId}`
  const hintMegaKey = `${HINT_MEGA_PREFIX}-${playerId}`
  const hintMegaChargeKey = `${HINT_MEGA_CHARGE_PREFIX}-${playerId}`
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [attempts, setAttempts] = useState<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [nominations, setNominations] = useState<Nomination[]>(fallbackNominations)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showEnterConfirm, setShowEnterConfirm] = useState(false)
  const questKey = `${QUEST_PREFIX}-${playerId}`
  const alreadyPassed = getItem<boolean>(questKey, false)

  const allFilled = nominations.every((nomination) => Boolean(answers[nomination.id]))
  const filledCount = Object.keys(answers).length

  const loadNominations = async () => {
    try {
      const qs = await api.getSecretRoomQuestions()
      if (qs.length > 0) {
        setNominations(
          qs.map((q: SecretRoomQuestion, i: number) => ({
            id: `n${q.slot_number}`,
            label: q.title,
            correct: q.correct_player_name ?? fallbackNominations[i]?.correct ?? '',
          }))
        )
      }
    } catch {
      // keep fallback
    }
  }

  useEffect(() => {
    void loadNominations()
  }, [])

  useEffect(() => {
    if (alreadyPassed) onUnlocked()
  }, [alreadyPassed, onUnlocked])

  useEffect(() => {
    void api.getSecretAttempts().then((data) => {
      if (data) setAttempts(data.attempts)
    })
  }, [])

  const updateAnswer = (id: string, value: string): void => {
  setAnswers((current) => {
    const next = { ...current, [id]: value }

    const nowAllFilled = nominations.every(
      (nomination) => Boolean(next[nomination.id]),
    )

    if (nowAllFilled) {
      window.setTimeout(() => {
        setShowEnterConfirm(true)
      }, 100)
    }

    return next
  })
}

  const isCorrect = (): boolean =>
    nominations.every((nomination) => answers[nomination.id] === nomination.correct)





const handleKeyClick = (): void => {
  if (!allFilled || phase !== 'idle') return


  if (isCorrect()) {
    setPhase('success')
    setItem(questKey, true)

    window.setTimeout(() => {
      onUnlocked()
    }, 3000)
  } else {
    setPhase('breaking')
void api.incrementSecretAttempts().then((data) => {
    if (data) setAttempts(data.attempts)
  })
    window.setTimeout(() => {
  setAnswers({})
  setPhase('idle')
  setShowEnterConfirm(false)
}, 3000)
  }
}

  // ─── Hints system ───
  const allNames = workers.map((w) => w.name)

  const generateHintFor = (nominationId: string): HintResult => {
    const nom = nominations.find((n) => n.id === nominationId)!
    const wrongNames = allNames.filter((n) => n !== nom.correct)
    return { nominationId, notName: pickRandom(wrongNames) }
  }

  const [hintTab, setHintTab] = useState<'normal' | 'big' | 'mega'>('normal')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  // Normal hint
  const [normalTs, setNormalTs] = useState<number>(() => getItem<number>(hintNormalKey, 0))
  const [normalResult, setNormalResult] = useState<HintResult | null>(null)
  const normalReady = now - normalTs >= NORMAL_COOLDOWN
  const normalRemaining = NORMAL_COOLDOWN - (now - normalTs)

  const useNormalHint = (): void => {
    if (!normalReady || allNames.length < 2) return
    const nom = pickRandom(nominations)
    const result = generateHintFor(nom.id)
    setNormalResult(result)
    const ts = Date.now()
    setNormalTs(ts)
    setItem(hintNormalKey, ts)
  }

  // Big hint
  const [bigTs, setBigTs] = useState<number>(() => getItem<number>(hintBigKey, 0))
  const [bigResult, setBigResult] = useState<HintResult | null>(null)
  const [bigSelecting, setBigSelecting] = useState(false)
  const bigReady = now - bigTs >= BIG_COOLDOWN
  const bigRemaining = BIG_COOLDOWN - (now - bigTs)

  const useBigHint = (nominationId: string): void => {
    if (!bigReady || allNames.length < 2) return
    const result = generateHintFor(nominationId)
    setBigResult(result)
    setBigSelecting(false)
    const ts = Date.now()
    setBigTs(ts)
    setItem(hintBigKey, ts)
  }

  // Mega hint
  const [megaTs, setMegaTs] = useState<number>(() => getItem<number>(hintMegaKey, 0))
  const [megaCharge, setMegaCharge] = useState<number>(() => getItem<number>(hintMegaChargeKey, 0))
  const [megaResult, setMegaResult] = useState<MegaResult | null>(null)
  const [chargePulse, setChargePulse] = useState(false)
  const megaReady = now - megaTs >= MEGA_COOLDOWN
  const megaRemaining = MEGA_COOLDOWN - (now - megaTs)
  const megaCharged = megaCharge >= 10

 const chargeMega = (): void => {
  if (megaCharged || !megaReady) return

  const next = Math.min(megaCharge + 1, 10)
  const ts = Date.now()

  setMegaCharge(next)
  setItem(hintMegaChargeKey, next)

  // После КАЖДОГО заряда запускаем таймер на 24 часа.
  // После 10-го заряда Mega сразу становится готовой к использованию.
  if (next < 10) {
    setMegaTs(ts)
    setItem(hintMegaKey, ts)
  }

  setChargePulse(true)
  window.setTimeout(() => setChargePulse(false), 250)
}

  const useMegaHint = (): void => {
    if (!megaCharged || !megaReady || allNames.length < 2) return
    const results = nominations.map((nom) => generateHintFor(nom.id))
    setMegaResult(results)
    const ts = Date.now()
    setMegaTs(ts)
    setItem(hintMegaKey, ts)
    setMegaCharge(0)
    setItem(hintMegaChargeKey, 0)
  }

  // Reload hint state when user switches profile
  useEffect(() => {
    setNormalTs(getItem<number>(hintNormalKey, 0))
    setNormalResult(null)
    setBigTs(getItem<number>(hintBigKey, 0))
    setBigResult(null)
    setBigSelecting(false)
    setMegaTs(getItem<number>(hintMegaKey, 0))
    setMegaCharge(getItem<number>(hintMegaChargeKey, 0))
    setMegaResult(null)
  }, [hintNormalKey, hintBigKey, hintMegaKey, hintMegaChargeKey])

  return (
    <div className="secret-quest relative min-h-screen overflow-y-auto pb-20">

      {/* Compact header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold leading-tight tracking-wide text-white/80" style={{ textShadow: '0 0 10px rgba(255,43,214,0.6)' }}>
          Выбери правильные варианты и войди в дверь
        </p>
        <div className="flex items-center gap-2">
          <p className="shrink-0 text-base font-extrabold text-accent" style={{ textShadow: '0 0 10px rgba(255,43,214,0.7)' }}>{filledCount}/10</p>
          <button
            onClick={() => setShowAdmin(true)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/20 transition-all hover:text-white/50 active:scale-90"
            title="Админ"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
 {/* ─── Hints panel ─── */}
      <div className="mt-4 mb-2 flex items-center justify-center gap-2">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-purple-500/60" />

  <div
    className="shrink-0 text-[14px] font-black tracking-[0.18em] text-purple-300"
    style={{
      textShadow:
        '0 0 8px rgba(168,85,247,0.9), 0 0 18px rgba(168,85,247,0.5)',
    }}
  >
    ✦ ПОДСКАЗКИ ✦
  </div>

  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-purple-500/60" />
</div>
      <div
        className="mt-3 rounded-xl border bg-black/60 p-2.5 backdrop-blur-md"
        style={{
          borderColor: 'rgba(168,85,247,0.5)',
          boxShadow: '0 0 16px rgba(168,85,247,0.25), inset 0 0 8px rgba(20,0,30,0.5)',
        }}
      >
        {/* Tabs */}
        <div className="mb-2 flex gap-1">
          {([
            { key: 'normal', label: 'Обычная', icon: Sparkles },
            { key: 'big', label: 'Большая', icon: Crown },
            { key: 'mega', label: 'Мега', icon: Zap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setHintTab(key)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                hintTab === key
                  ? 'bg-purple-500/30 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={hintTab === key ? { boxShadow: '0 0 10px rgba(168,85,247,0.4)' } : undefined}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Normal hint tab */}
        {hintTab === 'normal' && (
          <div className="space-y-2">
            {normalResult && (
              <div className="rounded-lg border border-purple-500/30 bg-black/50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-300">
                  {nominations.find((n) => n.id === normalResult.nominationId)?.label}
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-white">
                  <span className="text-pink-400">НЕ</span> — {normalResult.notName}
                </p>
              </div>
            )}
            <button
              onClick={useNormalHint}
              disabled={!normalReady || allNames.length < 2}
              className={`w-full rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${
                normalReady
                  ? 'border-purple-400/60 bg-purple-500/20 text-white hover:bg-purple-500/30 active:scale-95'
                  : 'border-white/10 bg-white/5 text-white/30'
              }`}
              style={normalReady ? { boxShadow: '0 0 10px rgba(168,85,247,0.3)' } : undefined}
            >
              {normalReady ? '✨ Получить подсказку' : `Следующая через ${formatDuration(normalRemaining)}`}
            </button>
          </div>
        )}

        {/* Big hint tab */}
        {hintTab === 'big' && (
          <div className="space-y-2">
            {bigResult && (
              <div className="rounded-lg border border-purple-500/30 bg-black/50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-300">
                  {nominations.find((n) => n.id === bigResult.nominationId)?.label}
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-white">
                  <span className="text-pink-400">НЕ</span> — {bigResult.notName}
                </p>
              </div>
            )}
            {bigSelecting ? (
              <div className="space-y-1">
                <p className="text-[11px] text-white/50 text-center">Выбери категорию:</p>
                <div className="max-h-40 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin' }}>
                  {nominations.map((nom) => (
                    <button
                      key={nom.id}
                      onClick={() => useBigHint(nom.id)}
                      className="w-full rounded-lg border border-purple-500/20 bg-black/40 px-3 py-1.5 text-left text-[12px] font-bold text-white/80 transition-all hover:bg-purple-500/20 hover:text-white active:scale-95"
                    >
                      {nom.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setBigSelecting(false)}
                  className="w-full text-center text-[11px] text-white/40 hover:text-white/70"
                >
                  отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBigSelecting(true)}
                disabled={!bigReady || allNames.length < 2}
                className={`w-full rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${
                  bigReady
                    ? 'border-purple-400/60 bg-purple-500/20 text-white hover:bg-purple-500/30 active:scale-95'
                    : 'border-white/10 bg-white/5 text-white/30'
                }`}
                style={bigReady ? { boxShadow: '0 0 10px rgba(168,85,247,0.3)' } : undefined}
              >
                {bigReady ? '👑 Большая подсказка' : `Следующая через ${formatDuration(bigRemaining)}`}
              </button>
            )}
          </div>
        )}

       {/* Mega hint tab */}
{hintTab === 'mega' && (
  <div className="space-y-2">

    <p className="text-center text-[11px] font-bold text-purple-300/80">
      Заряд Мега-подсказки
    </p>

            {megaResult && (
              <div
                className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-purple-500/30 bg-black/50 p-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                {megaResult.map((r, i) => (
                  <div key={r.nominationId} className="flex items-baseline gap-1.5 px-1 py-0.5">
                    <span className="shrink-0 text-[10px] font-black text-purple-400/70">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold uppercase tracking-wide text-purple-300">
                        {nominations.find((n) => n.id === r.nominationId)?.label}
                      </span>
                      <span className="text-[12px] font-extrabold text-white">
                        <span className="text-pink-400">НЕ</span> • {r.notName}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Charge segments */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full transition-all duration-200"
                  style={{
                    background: i < megaCharge
                      ? chargePulse && i === megaCharge - 1
                        ? 'rgba(168,85,247,1)'
                        : 'rgba(168,85,247,0.7)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: i < megaCharge ? '0 0 6px rgba(168,85,247,0.6)' : 'none',
                  }}
                />
              ))}
            </div>

            {megaCharged && megaReady ? (
              <button
                onClick={useMegaHint}
                className="w-full rounded-lg border border-purple-400/80 bg-purple-500/30 px-3 py-2 text-[12px] font-extrabold text-white transition-all hover:bg-purple-500/40 active:scale-95"
                style={{ boxShadow: '0 0 14px rgba(168,85,247,0.5)' }}
              >
                ⚡ ОТКРЫТЬ МЕГА-ПОДСКАЗКУ
              </button>
            ) : (
              <button
                onClick={chargeMega}
                disabled={megaCharged || !megaReady}
                className={`w-full rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${
                  !megaReady
                    ? 'border-white/10 bg-white/5 text-white/30'
                    : megaCharged
                      ? 'border-green-400/40 bg-green-500/15 text-green-300'
                      : 'border-purple-400/60 bg-purple-500/20 text-white hover:bg-purple-500/30 active:scale-95'
                }`}
                style={!megaReady ? undefined : { boxShadow: '0 0 10px rgba(168,85,247,0.3)' }}
              >
                {!megaReady
                  ? `Перезарядка через ${formatDuration(megaRemaining)}`
                  : megaCharged
                    ? '✓ Заряжено 10/10'
                    : `ЗАРЯД ${megaCharge}/10`}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Compact category cards */}
      <div className="grid grid-cols-2 gap-2">
        {nominations.map((nomination, index) => {
          const color = neonColors[index]
          return (
            <label
              key={nomination.id}
              className="min-w-0 rounded-lg border-2 bg-black/50 p-2 backdrop-blur-md transition-all duration-200"
              style={{
                borderColor: color.border,
                boxShadow: `0 0 12px ${color.glow}, inset 0 0 6px rgba(0,0,0,0.4)`,
              }}
            >
              <span className="mb-1 block text-[12px] font-extrabold uppercase leading-tight tracking-[-0.02em] text-white" style={{ textShadow: `0 0 6px ${color.glow}` }}>
                <span className="mr-1" style={{ color: color.text }}>{String(index + 1).padStart(2, '0')}</span>{nomination.label}
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

     

 {/* Final key check */}
<div className="mt-5 flex flex-col items-center">

  {!allFilled && phase === 'idle' && (
    <p className="text-center text-[12px] font-bold text-white/35">
      Выбери все 10 вариантов
    </p>
  )}

  

  {phase === 'success' && (
    <div
      className="w-full rounded-xl border border-green-400/70 bg-green-500/15 px-4 py-5 text-center"
      style={{
        boxShadow:
          '0 0 20px rgba(34,197,94,0.45), inset 0 0 12px rgba(34,197,94,0.12)',
      }}
    >
      <p
        className="text-[17px] font-black tracking-wide text-green-300"
        style={{
          textShadow: '0 0 12px rgba(34,197,94,0.8)',
        }}
      >
        🔑 КЛЮЧ СРАБОТАЛ!
      </p>

      <p className="mt-1 text-[11px] font-bold text-white/50">
        Входим в комнату...
      </p>
    </div>
  )}

  {phase === 'breaking' && (
    <div
      className="w-full rounded-xl border border-red-400/60 bg-red-500/10 px-4 py-5 text-center"
      style={{
        boxShadow:
          '0 0 18px rgba(239,68,68,0.35), inset 0 0 10px rgba(239,68,68,0.1)',
      }}
    >
      <p
        className="text-[17px] font-black text-red-300"
        style={{
          textShadow: '0 0 10px rgba(239,68,68,0.65)',
        }}
      >
        😔 Ключ сломался
      </p>

      <p className="mt-1 text-[11px] font-bold text-white/40">
        Попробуй выбрать варианты заново
      </p>
    </div>
  )}

  {attempts !== null && (
    <div
      className="mt-4 flex items-center gap-1.5 rounded-full border border-accent/30 bg-black/40 px-3 py-1 backdrop-blur-md"
      style={{
        boxShadow: '0 0 10px rgba(255,43,214,0.15)',
      }}
    >
      <span className="text-sm">🗝️</span>

      <span className="text-[12px] font-bold tracking-wide text-accent/80">
        Попытки команды::
      </span>

      <span
        className="text-sm font-black text-accent"
        style={{
          textShadow: '0 0 6px rgba(255,43,214,0.5)',
        }}
      >
        {attempts}
      </span>
    </div>
  )}

</div>
{showEnterConfirm && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
    onClick={() => setShowEnterConfirm(false)}
  >
    <div
      className="w-full max-w-sm rounded-2xl border border-purple-400/60 bg-black/95 p-6 text-center"
      style={{
        boxShadow:
          '0 0 35px rgba(168,85,247,0.45), inset 0 0 20px rgba(168,85,247,0.1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {phase === 'idle' && (
  <>
    <div className="text-4xl">🔑</div>

    <h2
      className="mt-3 text-2xl font-black tracking-wide text-white"
      style={{
        textShadow: '0 0 14px rgba(168,85,247,0.8)',
      }}
    >
      ВХОДИМ?
    </h2>

    <p className="mt-2 text-xs font-bold text-white/40">
      После входа ответы будут проверены
    </p>

    <button
      type="button"
      onClick={handleKeyClick}
      className="mt-6 w-full rounded-xl border border-purple-400/70 bg-purple-500/25 py-3.5 text-sm font-black tracking-wider text-white transition-all active:scale-95"
      style={{
        boxShadow: '0 0 16px rgba(168,85,247,0.4)',
      }}
    >
      ВОЙТИ
    </button>

    <button
      type="button"
      onClick={() => setShowEnterConfirm(false)}
      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white/50 transition-all active:scale-95"
    >
      ОТМЕНА
    </button>
  </>
)}

{phase === 'breaking' && (
  <>
    <div className="text-4xl">🔒</div>

    <h2
      className="mt-3 text-2xl font-black text-red-300"
      style={{
        textShadow: '0 0 14px rgba(239,68,68,0.8)',
      }}
    >
      УВЫ, НЕ ВЫШЛО
    </h2>

    <p className="mt-2 text-sm font-bold text-white/50">
      Дверь не поддалась
    </p>
  </>
)}

{phase === 'success' && (
  <>
    <div className="text-4xl">🔓</div>

    <h2
      className="mt-3 text-2xl font-black text-green-300"
      style={{
        textShadow: '0 0 14px rgba(34,197,94,0.8)',
      }}
    >
      ДВЕРЬ ОТКРЫТА
    </h2>

    <p className="mt-2 text-sm font-bold text-white/50">
      Амальгама принимает тебя
    </p>
  </>
)}
          </div>
  </div>
)}
      {showAdmin && (
        <SecretAdminPanel
          onClose={() => setShowAdmin(false)}
          onSaved={() => void loadNominations()}
        />
      )}
    </div>
  )
}
