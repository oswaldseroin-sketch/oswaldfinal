import { useCallback, useEffect, useState } from 'react'
import { Loader as Loader2, Swords, Check, X } from 'lucide-react'
import { api, type GameState } from '../../lib/api'
import { useApp } from '../../context/AppContext'

type Props = {
  onBack: () => void
  onProfileUpdate: () => void
}

type TodayState = {
  opponent_name: string
  result: string | null
}

type YesterdayState = {
  wins: number
  losses: number
  total: number
}

const ROULETTE_STEPS = [
  'Ты играешь против...',
  'Твой ход...',
  'Щёлк...',
]

export default function RouletteGame({ onBack, onProfileUpdate }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [animStep, setAnimStep] = useState(-1)
  const [showYesterdayResults, setShowYesterdayResults] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
const [starter, setStarter] = useState<'me' | 'opponent' | null>(null)
const [currentTurn, setCurrentTurn] = useState<'me' | 'opponent' | null>(null)
const [chamber, setChamber] = useState<number | null>(null)
const [shotIndex, setShotIndex] = useState(0)
const [roundMessage, setRoundMessage] = useState('')
const [roundFinished, setRoundFinished] = useState(false)
  const [cylinderSpinning, setCylinderSpinning] = useState(false)
const [gunKick, setGunKick] = useState(false)
  const [shotFlash, setShotFlash] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getGameState('roulette', currentUser.id)
      setState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const handlePlay = async () => {
    if (!currentUser) return
    setPlaying(true)
    setError('')
    setAnimStep(0)

    // Dramatic animation sequence — result already determined by backend
    const stepDelay = 700
    for (let i = 0; i < ROULETTE_STEPS.length; i++) {
      setAnimStep(i)
      await new Promise((r) => setTimeout(r, stepDelay))
    }

    try {
      await api.submitGameVote('roulette', currentUser.id, {})
      await loadState()
      onProfileUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setPlaying(false)
      setAnimStep(-1)
    }
  }
  const finishRoulette = async (result: 'win' | 'lose') => {
  if (!currentUser) return

  try {
    await api.submitGameVote('roulette', currentUser.id, { result })
    await loadState()
    onProfileUpdate()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Ошибка сохранения результата')
  }
}
const handleMyShot = async () => {
  if (currentTurn !== 'me' || roundFinished || chamber === null) return

  const isShot = shotIndex === chamber

  setPlaying(true)
  setCylinderSpinning(true)
  setRoundMessage('Барабан вращается...')

  await new Promise((r) => setTimeout(r, 700))

  setCylinderSpinning(false)
  setRoundMessage('Ты нажимаешь на курок...')

  await new Promise((r) => setTimeout(r, 1200))

 if (isShot) {
  setGunKick(true)
  setShotFlash(true)
  setRoundMessage('💥 ВЫСТРЕЛ!')

  await new Promise((r) => setTimeout(r, 180))

  setGunKick(false)
  setShotFlash(false)

  await new Promise((r) => setTimeout(r, 850))

  setRoundMessage('ВЫ ПОГИБЛИ')

  await new Promise((r) => setTimeout(r, 900))

  setRoundFinished(true)

  await finishRoulette('lose')

  setPlaying(false)
  return
}

 setRoundMessage('ЩЁЛК... ПРОМАХ!')

await new Promise((r) => setTimeout(r, 1200))

setRoundMessage('Ты выжил...')

await new Promise((r) => setTimeout(r, 1500))

setShotIndex((prev) => prev + 1)
setCurrentTurn('opponent')
setRoundMessage(`ХОД: ${today?.opponent_name || 'Противник'}`)

await new Promise((r) => setTimeout(r, 2000))

setPlaying(false)
}
  const handleOpponentShot = async () => {
  if (currentTurn !== 'opponent' || roundFinished || chamber === null) return

  const isShot = shotIndex === chamber
  const opponentName = today?.opponent_name || 'Противник'

  setPlaying(true)

  setRoundMessage(`${opponentName} берёт револьвер...`)
  await new Promise((r) => setTimeout(r, 700))

  setCylinderSpinning(true)
  setRoundMessage('Барабан вращается...')

  await new Promise((r) => setTimeout(r, 700))

  setCylinderSpinning(false)
  setRoundMessage(`${opponentName} нажимает на курок...`)

  await new Promise((r) => setTimeout(r, 1500))

 if (isShot) {
 setGunKick(true)
setShotFlash(true)
setRoundMessage('💥 ВЫСТРЕЛ!')

await new Promise((r) => setTimeout(r, 180))

setGunKick(false)
setShotFlash(false)

  await new Promise((r) => setTimeout(r, 850))

  setRoundMessage(`${today?.opponent_name || 'Противник'} ПОГИБ!`)

  await new Promise((r) => setTimeout(r, 900))

  setRoundMessage('🏆 ПОБЕДА!')
  setRoundFinished(true)

  await finishRoulette('win')

  setPlaying(false)
  return
}

 setRoundMessage('ЩЁЛК... ПРОМАХ!')

await new Promise((r) => setTimeout(r, 1200))

setRoundMessage(`${opponentName} выжил...`)

await new Promise((r) => setTimeout(r, 1500))

setShotIndex((prev) => prev + 1)
setCurrentTurn('me')
setRoundMessage('ТВОЯ ОЧЕРЕДЬ')

await new Promise((r) => setTimeout(r, 2000))

setPlaying(false)
}
  useEffect(() => {
  if (
    !gameStarted ||
    !starter ||
    currentTurn !== 'opponent' ||
    roundFinished ||
    playing
  ) {
    return
  }

  const timer = setTimeout(() => {
    void handleOpponentShot()
  }, 1500)

  return () => clearTimeout(timer)
}, [
  gameStarted,
  starter,
  currentTurn,
  roundFinished,
  playing,
  shotIndex,
])
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-neon" /></div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center"><p className="text-sm font-bold text-error">{error}</p></div>
      </div>
    )
  }

  const today = (state?.today ?? null) as TodayState | null
  const yesterday = (state?.yesterday ?? null) as YesterdayState | null
  const hasPlayed = !!today?.result

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">👑</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 10</p>
          <h1 className="text-xl font-extrabold text-ink">Русская рулетка</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center"><p className="text-xs font-bold text-error">{error}</p></div>
      )}

      {yesterday && (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}>
         <button
  onClick={() => setShowYesterdayResults((prev) => !prev)}
  className="mb-3 flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 transition-all active:scale-[0.98]"
>
  <p className="text-[11px] font-extrabold tracking-wide text-amber-300">
    Вчера в русскую рулетку
  </p>

  <span
    className={`text-sm text-amber-300 transition-transform duration-300 ${
      showYesterdayResults ? 'rotate-180' : ''
    }`}
  >
    ▼
  </span>
</button>
          {showYesterdayResults && (
  <>
          <div className="space-y-2">
            <div className="flex justify-between rounded-lg border border-success/20 bg-success/10 px-3 py-2">
              <span className="text-sm font-bold text-success">Победили</span>
              <span className="text-sm font-extrabold text-success">{yesterday.wins}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-error/20 bg-error/10 px-3 py-2">
              <span className="text-sm font-bold text-error">Проиграли</span>
              <span className="text-sm font-extrabold text-error">{yesterday.losses}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-line/30 bg-black/20 px-3 py-2">
              <span className="text-xs text-ink-muted">Всего сыграли</span>
              <span className="text-xs font-bold text-ink">{yesterday.total}</span>
            </div>
          </div>
      </>
)}
        </div>
      )}

      {today && (
        <div
  className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-950/10 via-zinc-950/90 to-red-950/15 p-4 backdrop-blur-md"
  style={{
    boxShadow:
      '0 0 30px rgba(251,191,36,0.08), 0 18px 50px rgba(0,0,0,0.35), inset 0 0 35px rgba(127,29,29,0.05)',
  }}
>
         <div className="mb-5 text-center">
  <p className="text-[9px] font-black tracking-[0.24em] text-amber-400/70">
    ФИНАЛЬНАЯ ДУЭЛЬ
  </p>

  <div className="mt-3 flex items-center justify-center gap-3">
    <div className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/40" />

    <div
      className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/10"
      style={{ boxShadow: '0 0 22px rgba(251,191,36,0.16)' }}
    >
      <Swords size={24} className="text-amber-300" />
    </div>

    <div className="h-px w-10 bg-gradient-to-l from-transparent to-red-500/40" />
  </div>

  <p className="mt-3 text-[9px] font-black tracking-[0.2em] text-zinc-600">
    ПРОТИВНИК
  </p>

  <p
    className="mt-1 text-base font-black tracking-wide text-zinc-100"
    style={{ textShadow: '0 0 14px rgba(251,191,36,0.18)' }}
  >
    {today.opponent_name}
  </p>
</div>

          {/* Animation sequence */}
          {playing && animStep >= 0 && (
            <div className="mb-4 text-center">
              <p className="animate-pulse text-lg font-extrabold text-amber-300" style={{ textShadow: '0 0 12px rgba(255,191,0,0.4)' }}>
                {ROULETTE_STEPS[animStep]}
              </p>
            </div>
          )}

          {/* Result */}
          {gameStarted && !starter && !hasPlayed && (
  <div className="mb-4 rounded-xl border border-neon/30 bg-neon/5 p-4 text-center">
    <p className="text-[10px] font-bold tracking-widest text-neon">
      КТО НАЧИНАЕТ?
    </p>

    <div className="mt-3 grid grid-cols-2 gap-2.5">
      <button
        onClick={() => {
          setStarter('me')
          setCurrentTurn('me')
          setRoundMessage('Твой ход')
        }}
        className="rounded-xl border border-neon/40 bg-neon/10 px-3 py-3 text-sm font-extrabold text-ink transition active:scale-95"
      >
        {currentUser?.full_name || 'Ты'}
      </button>

      <button
        onClick={() => {
          setStarter('opponent')
          setCurrentTurn('opponent')
          setRoundMessage(`${today.opponent_name} начинает`)
        }}
        className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-sm font-extrabold text-amber-200 transition active:scale-95"
      >
        {today.opponent_name}
      </button>
    </div>
  </div>
)}
          {gameStarted && starter && !hasPlayed && (
    <div
   className={`mb-4 rounded-2xl border p-4 text-center transition-all duration-100 ${
  shotFlash
    ? 'scale-[1.025] border-red-400 bg-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.65)]'
    : 'border-red-500/30 bg-gradient-to-b from-black/60 via-zinc-950/80 to-red-950/15 shadow-[inset_0_0_30px_rgba(127,29,29,0.08)]'
}`}
    style={
      shotFlash
        ? {
            boxShadow:
              '0 0 45px rgba(239,68,68,0.75), inset 0 0 40px rgba(239,68,68,0.25)',
          }
        : undefined
    }
  >

    {/* Игроки */}
   <div className="relative mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
     {currentTurn && (
  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
    <div
      className={`rounded-full border px-3 py-1 text-[8px] font-black tracking-[0.2em] ${
        currentTurn === 'me'
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-400/30 bg-red-500/10 text-red-300'
      }`}
    >
      {currentTurn === 'me' ? 'ТВОЙ ХОД' : 'ХОД ПРОТИВНИКА'}
    </div>
  </div>
)}
      <div>
        <p className="text-[9px] font-bold tracking-widest text-neon">
          ТЫ
        </p>
        <p
  className={`mt-1 text-sm font-extrabold transition-all duration-300 ${
    currentTurn === 'me'
      ? 'scale-105 text-neon'
      : 'text-ink/50'
  }`}
  style={
    currentTurn === 'me'
      ? { textShadow: '0 0 12px rgba(0,229,255,0.7)' }
      : undefined
  }
>
  {currentUser?.full_name || 'Ты'}
</p>
      </div>

      <Swords size={18} className="text-error" />

      <div>
        <p className="text-[9px] font-bold tracking-widest text-amber-300">
          ПРОТИВНИК
        </p>
       <p
  className={`mt-1 text-sm font-extrabold transition-all duration-300 ${
    currentTurn === 'opponent'
      ? 'scale-105 text-amber-300'
      : 'text-ink/50'
  }`}
  style={
    currentTurn === 'opponent'
      ? { textShadow: '0 0 12px rgba(252,211,77,0.7)' }
      : undefined
  }
>
  {today.opponent_name}
</p>
      </div>
    </div>

    {/* Револьвер */}
<div className="relative mx-auto h-44 w-44">

  {/* Вращающийся барабан */}
  <div
    className={`absolute inset-0 rounded-full border-4 border-amber-400/25 bg-gradient-to-b from-zinc-900/90 via-black/80 to-red-950/20 ${
  cylinderSpinning ? 'animate-spin' : ''
}`}
style={{
  animationDuration: cylinderSpinning ? '0.35s' : undefined,
  boxShadow:
    '0 0 30px rgba(251,191,36,0.10), inset 0 0 35px rgba(127,29,29,0.14)',
}}
  
  >
    <div
  className="absolute inset-4 rounded-full border-2 border-amber-300/15"
  style={{
    boxShadow:
      'inset 0 0 18px rgba(251,191,36,0.06), 0 0 12px rgba(127,29,29,0.08)',
  }}
/>

    {Array.from({ length: 8 }).map((_, index) => {
      const angle = (index / 8) * Math.PI * 2 - Math.PI / 2
      const radius = 54

      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      const used = index < shotIndex

      return (
       
       <div
  key={index}
  className={`absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
    used
      ? 'scale-75 border-black/40 bg-black/70 text-ink/20 opacity-40'
      : index === shotIndex
  ? 'scale-115 border-red-400/80 bg-red-500/20 text-red-200 shadow-[0_0_22px_rgba(239,68,68,0.45)]'
  : 'border-amber-200/15 bg-zinc-900/90 text-zinc-400'
  }`}
  style={{
    marginLeft: '-18px',
    marginTop: '-18px',
    transform: `translate(${x}px, ${y}px)`,
    boxShadow:
      index === shotIndex && !used
        ? '0 0 16px rgba(239,68,68,0.45)'
        : undefined,
  }}
>
  <div
    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
      used
        ? 'border-ink/10 bg-black/50'
        : 'border-ink/20 bg-black/30'
    }`}
  >
    <span className="text-[10px] font-black">
      {used ? '×' : index + 1}
    </span>
  </div>
</div>
      )
    })}
  </div>

  {/* Неподвижный револьвер */}
  <div className="absolute inset-0 z-10 flex items-center justify-center">
    <button
  onClick={handleMyShot}
  disabled={currentTurn !== 'me' || playing || roundFinished}
 className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-100 ${
  gunKick
    ? 'scale-125 -rotate-12 border-red-300 bg-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.75)]'
    : currentTurn === 'me' && !playing && !roundFinished
      ? 'cursor-pointer border-red-400/80 bg-red-500/15 shadow-[0_0_28px_rgba(239,68,68,0.40)] active:scale-90'
      : 'cursor-default border-amber-200/10 bg-black/40 opacity-55'
}`}
  style={
    currentTurn === 'me' && !playing && !roundFinished
      ? { boxShadow: '0 0 24px rgba(239,68,68,0.35)' }
      : undefined
  }
>
  <span className="text-3xl">🔫</span>
</button>
  </div>

</div>

   <div className="mt-4">
  <p
    className={`text-lg font-black tracking-wide transition-all duration-300 ${
      roundMessage.includes('ВЫСТРЕЛ')
        ? 'scale-110 text-red-300'
        : roundMessage.includes('ПОБЕДА')
          ? 'scale-110 text-amber-200'
          : roundMessage.includes('ПОГИБ')
            ? 'text-red-300'
            : 'text-amber-200'
    }`}
    style={{
      textShadow:
        roundMessage.includes('ВЫСТРЕЛ')
          ? '0 0 18px rgba(239,68,68,0.65)'
          : '0 0 12px rgba(251,191,36,0.35)',
    }}
  >
    {roundMessage}
  </p>

  <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
</div>

    <div className="mt-2 flex items-center justify-center gap-2">
  <span className="text-[8px] font-black tracking-[0.2em] text-zinc-600">
    КАМОРЫ
  </span>

  <div className="flex gap-1">
    {Array.from({ length: 8 }).map((_, index) => (
      <span
        key={index}
        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
          index < shotIndex
            ? 'bg-zinc-700'
            : index === shotIndex
              ? 'bg-red-400 shadow-[0_0_7px_rgba(248,113,113,0.8)]'
              : 'bg-amber-300/30'
        }`}
      />
    ))}
  </div>

  <span className="text-[8px] font-black tracking-wider text-zinc-500">
    {Math.min(shotIndex + 1, 8)}/8
  </span>
</div>

  </div>
)}
          {hasPlayed && !playing && (
            <div className={`mb-4 rounded-xl border p-4 text-center ${today.result === 'win' ? 'border-success/40 bg-success/10' : 'border-error/40 bg-error/10'}`}>
              <div className="flex items-center justify-center gap-2">
                {today.result === 'win' ? <Check size={20} className="text-success" /> : <X size={20} className="text-error" />}
                <p className={`text-xl font-extrabold ${today.result === 'win' ? 'text-success' : 'text-error'}`}>
                  {today.result === 'win' ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
                </p>
              </div>
              {today.result === 'win' && (
                <p className="mt-2 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>🥇 +3 XP звания +3🪙</p>
              )}
              <p className="mt-1 text-[11px] text-ink-muted">Базовая награда: +2 XP +1🪙</p>
            </div>
          )}

          {/* Play button */}
         {!hasPlayed && !playing && !gameStarted && (
  <button
    onClick={() => {
      setGameStarted(true)
      setRoundMessage('')
      setRoundFinished(false)
      setStarter(null)
      setCurrentTurn(null)
      setShotIndex(0)
      setChamber(Math.floor(Math.random() * 8))
    }}
    className="flex w-full items-center justify-center gap-2 rounded-xl border border-error/40 bg-error/15 py-4 text-sm font-extrabold text-error transition hover:bg-error/25 active:scale-95"
    style={{ boxShadow: '0 0 16px rgba(239,68,68,0.15)' }}
  >
    <Swords size={18} />
    Сыграть
  </button>
)}

          {hasPlayed && !playing && (
            <p className="text-center text-[11px] text-ink-muted">Повторно крутить рулетку сегодня нельзя</p>
          )}
        </div>
      )}
    </div>
  )
}
