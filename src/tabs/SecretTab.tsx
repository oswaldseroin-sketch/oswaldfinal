import { useCallback, useEffect, useState } from 'react'
import { DoorOpen, Flame, Plus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import BackButton from '../components/BackButton'
import SecretQuest from '../components/SecretQuest'
import TeamLifePanel from '../components/TeamLifePanel'
import GamePanel from '../components/GamePanel'
import SwipeBack from '../components/SwipeBack'
import { getItem, removeItem } from '../lib/storage'
import { api } from '../lib/api'
import { nominations } from '../lib/nominations'
import NameDropdown from '../components/NameDropdown'
type SecretTabProps = { onBack: () => void }
type InnerView = 'main' | 'teamLife' | 'shadowRealm'

export default function SecretTab({ onBack }: SecretTabProps) {
  const { memes, isAdmin, addMeme, loading, currentUser, workers } = useApp()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
 const questKey = `secret-quest-passed-${currentUser?.name ?? 'unknown'}`

const [questUnlocked, setQuestUnlocked] = useState(() =>
  getItem<boolean>(questKey, false)
)
  const [innerView, setInnerView] = useState<InnerView>('main')
  const [mainDoorOpen, setMainDoorOpen] = useState(false)
  const [doorAttempts, setDoorAttempts] = useState(0)
const [doorEntries, setDoorEntries] = useState(0)
  const [userRooms, setUserRooms] = useState<Array<{
  id: number
  slot_number: number
  room_name: string
  attempts: number
  entered: number
}>>([])
const [showCreateRoom, setShowCreateRoom] = useState(false)
const [newRoomName, setNewRoomName] = useState('')
  const [createRoomError, setCreateRoomError] = useState('')
  const [myRoom, setMyRoom] = useState<{
  id: number
  slot_number: number
  room_name: string
} | null>(null)
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null)
  const [editingQuestions, setEditingQuestions] = useState(
  Array.from({ length: 5 }, () => ({
    title: '',
    correctAnswer: '',
  })),
)

const [editingQuestionIndex, setEditingQuestionIndex] = useState(0)
const [saveQuestionsError, setSaveQuestionsError] = useState('')
  const [roomMessage, setRoomMessage] = useState('')
  const [answerDropdownOpen, setAnswerDropdownOpen] = useState(false)
  const [enteringRoom, setEnteringRoom] = useState<{
  id: number
  roomName: string
    roomMessage: string
  questions: Array<{
    slot_number: number
    title: string
  }>
} | null>(null)

const [roomAnswers, setRoomAnswers] = useState(
  Array.from({ length: 5 }, () => ''),
)

const [roomQuestionIndex, setRoomQuestionIndex] = useState(0)
const [roomAttemptLoading, setRoomAttemptLoading] = useState(false)
const [roomAttemptResult, setRoomAttemptResult] = useState<
  'success' | 'wrong' | null
>(null)

const [roomAnswerDropdownOpen, setRoomAnswerDropdownOpen] = useState(false)
useEffect(() => {
  void Promise.all([
    api.getSecretAttempts(),
    api.getSecretRoomEntries(),
  ]).then(([attemptsData, entriesData]) => {
    setDoorAttempts(attemptsData.attempts)
    setDoorEntries(entriesData.count)
  })
}, [mainDoorOpen])
  useEffect(() => {
  void api.getSecretUserRooms().then((rooms) => {
    setUserRooms(rooms)
  })
}, [mainDoorOpen])
  useEffect(() => {
  if (!currentUser?.name) {
    setMyRoom(null)
    return
  }

  void api.getMySecretUserRoom(currentUser.name).then((data) => {
    setMyRoom(data.room)
  })
}, [currentUser?.name, mainDoorOpen])
  const [insideUserRoom, setInsideUserRoom] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
const [adminPasswordOpen, setAdminPasswordOpen] = useState(false)
const [adminPassword, setAdminPassword] = useState('')
const [adminPasswordError, setAdminPasswordError] = useState('')
  const [roomToDelete, setRoomToDelete] = useState<{
  id: number
  room_name: string
} | null>(null)
  const [userRoomEntries, setUserRoomEntries] = useState<Array<{
  id: number
  full_name: string
}>>([])
  const [shadowFade, setShadowFade] = useState(false)
  const [shadowDimmed, setShadowDimmed] = useState(false)

  const unlockQuest = useCallback(() => setQuestUnlocked(true), [])

  const leaveQuest = useCallback(() => {
  removeItem(questKey)
  setQuestUnlocked(false)
}, [questKey])
  const openShadowRealm = () => {
    setShadowDimmed(true)
    setTimeout(() => {
      setInnerView('shadowRealm')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShadowFade(true)
        })
      })
    }, 250)
  }

  const closeShadowRealm = () => {
    setShadowFade(false)
    setTimeout(() => {
      setInnerView('main')
      setShadowDimmed(false)
    }, 250)
  }

  const submit = async (): Promise<void> => {
    if (!description.trim()) return
    const saved = await addMeme(description.trim(), imageUrl.trim())
    if (saved) {
      setDescription('')
      setImageUrl('')
      setOpen(false)
    }
  }

  // ─── Team Life sub-view ───
  if (innerView === 'teamLife') {
    return (
      <SwipeBack onBack={() => setInnerView('main')} innerClassName="mx-auto max-w-md px-5 pb-8 pt-12">
        <button
          onClick={() => setInnerView('main')}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          ← Назад в Секретную комнату
        </button>
        <TeamLifePanel />
      </SwipeBack>
    )
  }

  // ─── Shadow Realm sub-view ───
  if (innerView === 'shadowRealm') {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black"
          style={{ opacity: shadowDimmed ? 0.6 : 0, transition: 'opacity 250ms ease-out' }}
        />
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{
            opacity: shadowFade ? 1 : 0,
            transition: 'opacity 250ms ease-out',
          }}
        >
          <div
            className="mx-auto max-w-md"
            style={{
              backgroundImage: 'url(/new-panel-inner.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              minHeight: '100dvh',
            }}
          >
            <div className="relative z-10 px-5 pb-8 pt-12">
              <GamePanel onBack={closeShadowRealm} />
            </div>
          </div>
        </div>
      </>
    )
  }
  if (insideUserRoom && enteringRoom) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6">
      <button
        type="button"
        onClick={() => {
          setInsideUserRoom(false)
          setEnteringRoom(null)
          setRoomAttemptResult(null)
          setRoomAnswerDropdownOpen(false)
        }}
        className="mb-6 text-sm font-bold text-accent"
      >
        ← Покинуть комнату
      </button>

      <div className="mt-16 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/60">
          ТЫ ВОШЁЛ
        </p>

        <h2
          className="mt-3 text-3xl font-black text-white"
          style={{
            textShadow: '0 0 20px rgba(255,43,214,0.55)',
          }}
        >
          {enteringRoom.roomName}
        </h2>

        <div className="mx-auto mt-8 flex h-24 w-24 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-5xl">
          🚪
        </div>

        <p className="mt-7 text-sm font-bold leading-relaxed text-white/50">
          Ты разгадал все 5 испытаний
          <br />
          и получил доступ в эту комнату.
        </p>
        <div
  className="mt-8 rounded-2xl border border-accent/30 bg-black/60 p-5"
  style={{
    boxShadow:
      '0 0 25px rgba(255,43,214,0.12), inset 0 0 25px rgba(255,43,214,0.05)',
  }}
>
  <p className="text-center text-[10px] font-black uppercase tracking-[0.28em] text-accent/70">
    ТАЙНОЕ ПОСЛАНИЕ
  </p>

  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
    <p className="text-center text-sm font-bold leading-relaxed text-white/85 whitespace-pre-wrap">
      {enteringRoom.roomMessage || 'Владелец комнаты ничего не оставил...'}
    </p>
  </div>
</div>
        <div className="mt-8 rounded-2xl border border-accent/25 bg-black/50 p-4">
  <p className="text-center text-[10px] font-black uppercase tracking-[0.22em] text-accent/70">
    КТО СЮДА ПОПАЛ
  </p>

  <div className="mt-4 space-y-2">
    {userRoomEntries.length > 0 ? (
      userRoomEntries.map((player) => (
        <div
          key={player.id}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center"
        >
          <span className="text-sm font-bold text-white">
            {player.full_name}
          </span>
        </div>
      ))
    ) : (
      <p className="text-center text-xs text-white/35">
        Пока никто не вошёл
      </p>
    )}
  </div>
</div>
      </div>
    </div>
  )
}
if (enteringRoom) {
  const currentQuestion = enteringRoom.questions[roomQuestionIndex]

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6">
      <button
        type="button"
        onClick={() => {
          setEnteringRoom(null)
          setRoomAnswerDropdownOpen(false)
        }}
        className="mb-6 text-sm font-bold text-accent"
      >
        ← Назад к дверям
      </button>

      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent/60">
          СЕКРЕТНАЯ КОМНАТА
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          {enteringRoom.roomName}
        </h2>

        <p className="mt-2 text-xs text-white/40">
          Испытание {roomQuestionIndex + 1} из 5
        </p>
        <div className="mt-4 flex justify-center gap-2">
  {enteringRoom.questions.map((question, index) => (
    <button
      key={question.slot_number}
      type="button"
      onClick={() => {
        setRoomQuestionIndex(index)
        setRoomAnswerDropdownOpen(false)
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-black transition ${
        roomQuestionIndex === index
          ? 'border-accent bg-accent/20 text-accent'
          : roomAnswers[index]
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
            : 'border-white/10 bg-black/40 text-white/40'
      }`}
    >
      {index + 1}
    </button>
  ))}
</div>
      </div>

      <div className="mt-8 rounded-3xl border border-accent/30 bg-black/60 p-5">
        <p className="text-center text-lg font-black text-white">
          {currentQuestion?.title}
        </p>
      </div>
      <div className="mt-5">
  <NameDropdown
    value={roomAnswers[roomQuestionIndex]}
    onChange={(value) => {
      setRoomAnswers((current) =>
        current.map((answer, index) =>
          index === roomQuestionIndex ? value : answer,
        ),
      )
      setRoomAnswerDropdownOpen(false)
    }}
    workers={workers}
    color={{
      border: 'rgba(255,43,214,0.7)',
      glow: 'rgba(255,43,214,0.45)',
      text: '#ff2bd6',
    }}
    open={roomAnswerDropdownOpen}
    onOpenChange={setRoomAnswerDropdownOpen}
  />
</div>
      <div className="mt-7">
  <button
    type="button"
    disabled={
      roomAttemptLoading ||
      roomAnswers.some((answer) => !answer.trim())
    }
    onClick={async () => {
      if (!currentUser?.name) return

      setRoomAttemptLoading(true)
      setRoomAttemptResult(null)

      try {
        const result = await api.attemptSecretUserRoom(
          enteringRoom.id,
          currentUser.name,
          enteringRoom.questions.map((question, index) => ({
            slot_number: question.slot_number,
            answer: roomAnswers[index],
          })),
        )

        setRoomAttemptResult(result.success ? 'success' : 'wrong')
        const freshRooms = await api.getSecretUserRooms()
setUserRooms(freshRooms)
        if (result.success && currentUser?.name && enteringRoom) {
  const messageData = await api.getSecretUserRoomMessage(
    enteringRoom.id,
    currentUser.name,
  )

  setEnteringRoom((current) =>
    current
      ? {
          ...current,
          roomMessage: messageData.roomMessage,
        }
      : current,
  )
}
      } catch (error) {
        console.error('Secret room attempt error:', error)
      } finally {
        setRoomAttemptLoading(false)
      }
    }}
    className="w-full rounded-2xl border border-accent/50 bg-accent/15 px-4 py-4 text-sm font-black uppercase tracking-wider text-accent transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
  >
    {roomAttemptLoading
      ? 'ПРОВЕРКА...'
      : '🗝️ ПОПЫТАТЬСЯ ВОЙТИ'}
  </button>
</div>
      {roomAttemptResult === 'wrong' && (
  <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center">
    <p className="text-2xl">🔒</p>
    <p className="mt-2 text-sm font-black uppercase tracking-wider text-red-400">
      ДВЕРЬ НЕ ОТКРЫЛАСЬ
    </p>
    <p className="mt-1 text-xs text-white/45">
      Один или несколько ответов неверны
    </p>
  </div>
)}

{roomAttemptResult === 'success' && (
  <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-center">
    <p className="text-2xl">🚪</p>
    <p className="mt-2 text-sm font-black uppercase tracking-wider text-emerald-300">
      ДВЕРЬ ОТКРЫТА
    </p>
    <p className="mt-1 text-xs text-white/45">
      Все 5 испытаний пройдены
    </p>
    <button
  type="button"
      onClick={async () => {
  try {
    const entries = await api.getSecretUserRoomEntries(enteringRoom.id)
    setUserRoomEntries(entries)
    setInsideUserRoom(true)
  } catch (error) {
    console.error('Load room entries error:', error)
  }
}}
  className="mt-4 w-full rounded-xl border border-emerald-400/50 bg-emerald-400/15 px-4 py-3 text-xs font-black uppercase tracking-wider text-emerald-300 transition active:scale-[0.98]"
>
  🚪 ВОЙТИ В КОМНАТУ
</button>
  </div>
)}
    </div>
  )
}
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-6 overflow-y-auto">

      <BackButton onBack={onBack} />
      {!mainDoorOpen && (
  <div className="mb-7 flex items-start justify-between">
    <div>
      <p className="text-[10px] font-bold tracking-widest text-accent">
        АМАЛЬГАМА / 04
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-ink">
        Секретная
      </h1>
    </div>

    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
      <Flame size={22} color="#ff2bd6" />
    </div>
  </div>
)}

      {!questUnlocked ? (
  !mainDoorOpen ? (
    <div className="relative mt-6 flex min-h-[1040px] flex-col items-center">
      <button
  type="button"
  onClick={() => {
    setAdminPassword('')
    setAdminPasswordError('')
    setAdminPasswordOpen(true)
  }}
  className="absolute right-0 top-0 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-white/40 backdrop-blur transition active:scale-95"
  title="Админка"
>
  🔒
</button>
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent/70">
        СЕКРЕТНЫЕ КОМНАТЫ
      </p>

      <h2
        className="mt-2 text-center text-2xl font-black uppercase text-white"
        style={{
          textShadow:
            '0 0 14px rgba(255,43,214,0.55), 0 0 28px rgba(255,43,214,0.2)',
        }}
      >
        ГЛАВНАЯ ДВЕРЬ
        <br />
        АМАЛЬГАМЫ
      </h2>

     <button
  type="button"
  onClick={() => setMainDoorOpen(true)}
  className="group relative z-20 mt-[250px] flex h-[340px] w-[240px] items-center justify-center overflow-hidden rounded-t-[120px] rounded-b-[28px] border-2 border-accent/80 bg-black/95 transition-all duration-300 active:scale-[0.97]"
  style={{
    boxShadow:
      '0 0 35px rgba(255,43,214,0.35), 0 0 80px rgba(255,43,214,0.12), inset 0 0 55px rgba(255,43,214,0.15)',
  }}
>
  <div
    className="absolute inset-2 rounded-t-[112px] rounded-b-[22px] border border-accent/20"
  />

  <div
    className="absolute inset-5 rounded-t-[95px] rounded-b-2xl border border-accent/30"
    style={{
      boxShadow: 'inset 0 0 30px rgba(255,43,214,0.10)',
    }}
  />

  <div
    className="absolute left-1/2 top-20 h-36 w-36 -translate-x-1/2 rounded-full border border-accent/20"
    style={{
      boxShadow:
        '0 0 25px rgba(255,43,214,0.18), inset 0 0 25px rgba(255,43,214,0.12)',
    }}
  />

  <div className="absolute left-5 top-1/2 h-px w-10 bg-accent/25" />
  <div className="absolute right-5 top-1/2 h-px w-10 bg-accent/25" />

  <div className="relative z-10 flex flex-col items-center">
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full border border-accent/50 bg-accent/10"
      style={{
        boxShadow:
          '0 0 30px rgba(255,43,214,0.35), inset 0 0 25px rgba(255,43,214,0.10)',
      }}
    >
      <DoorOpen
        size={54}
        className="text-accent transition-transform duration-300 group-hover:scale-110"
        style={{
          filter: 'drop-shadow(0 0 15px rgba(255,43,214,0.9))',
        }}
      />
    </div>

    <p
      className="mt-7 text-[9px] font-black uppercase tracking-[0.32em] text-accent/45"
    >
      ГЛАВНОЕ ИСПЫТАНИЕ
    </p>

    <p
      className="mt-2 text-center text-sm font-black uppercase tracking-[0.15em] text-white"
      style={{
        textShadow: '0 0 14px rgba(255,43,214,0.6)',
      }}
    >
      ДВЕРЬ
      <br />
      АМАЛЬГАМЫ
    </p>

    <div className="mt-6 rounded-full border border-accent/50 bg-accent/10 px-7 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
        ВОЙТИ
      </span>
    </div>
  </div>

  <div className="absolute bottom-3 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-accent/30 blur-sm" />
</button>
<div className="relative z-20 -mt-1 flex items-stretch justify-center">
  <div
    className="flex overflow-hidden rounded-b-2xl border border-t-0 border-accent/40 bg-black/90"
    style={{
      boxShadow:
        '0 10px 30px rgba(255,43,214,0.18), inset 0 -10px 25px rgba(255,43,214,0.06)',
    }}
  >
    <div className="flex w-[118px] flex-col items-center justify-center px-3 py-3">
      <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
        Попытки
      </span>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-sm">🗝️</span>
        <span
          className="text-lg font-black text-accent"
          style={{
            textShadow: '0 0 10px rgba(255,43,214,0.7)',
          }}
        >
          {doorAttempts}
        </span>
      </div>
    </div>

    <div className="w-px bg-gradient-to-b from-transparent via-accent/50 to-transparent" />

    <div className="flex w-[118px] flex-col items-center justify-center px-3 py-3">
      <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
        Вошло
      </span>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-sm">🚪</span>
        <span
          className="text-lg font-black text-accent"
          style={{
            textShadow: '0 0 10px rgba(255,43,214,0.7)',
          }}
        >
          {doorEntries}
        </span>
      </div>
    </div>
  </div>
</div>
      <div className="absolute inset-0 z-10">
  {[1, 2, 3, 4].map((slotNumber) => {
    const room = userRooms.find(
      (item) => item.slot_number === slotNumber,
    )
const doorTheme =
  slotNumber === 1
    ? {
        border: 'border-emerald-400/40',
        bg: 'bg-emerald-500/5',
        text: 'text-emerald-300',
        glow: '0 0 28px rgba(52,211,153,0.16)',
        icon: 'ᚱ',
        title: 'ДВЕРЬ ЖДЁТ ХОЗЯИНА',
        subtitle: 'РУНЫ ЕЩЁ МОЛЧАТ',
      }
    : slotNumber === 2
      ? {
          border: 'border-sky-400/40',
          bg: 'bg-sky-500/5',
          text: 'text-sky-300',
          glow: '0 0 28px rgba(56,189,248,0.16)',
          icon: '❄',
          title: 'ПЕЧАТЬ НЕ НАРУШЕНА',
          subtitle: 'ХОЛОД ХРАНИТ ТАЙНУ',
        }
      : slotNumber === 3
        ? {
            border: 'border-amber-400/40',
            bg: 'bg-amber-500/5',
            text: 'text-amber-300',
            glow: '0 0 28px rgba(251,191,36,0.16)',
            icon: '⌛',
            title: 'ВРЕМЯ ЖДЁТ',
            subtitle: 'КОМНАТА ЕЩЁ НЕ ПРОБУЖДЕНА',
          }
        : {
            border: 'border-rose-500/40',
            bg: 'bg-rose-500/5',
            text: 'text-rose-300',
            glow: '0 0 28px rgba(244,63,94,0.16)',
            icon: '◉',
            title: 'БЕЗДНА ПУСТА',
            subtitle: 'КТО-ТО ДОЛЖЕН ЕЁ ОТКРЫТЬ',
          }
    if (!room) {
      return (
       <button
  key={slotNumber}
  type="button"
  onClick={() => setShowCreateRoom(true)}
  className={`absolute flex min-h-[165px] w-[128px] flex-col items-center justify-center overflow-hidden rounded-t-[52px] rounded-b-2xl border bg-black/70 px-3 text-center transition active:scale-95 ${doorTheme.border} ${doorTheme.bg} ${
    slotNumber === 1
  ? 'left-1/2 top-[90px] -translate-x-1/2'
  : slotNumber === 2
    ? '-left-[72px] top-[440px]'
    : slotNumber === 3
      ? '-right-[72px] top-[440px]'
      : 'left-1/2 top-[820px] -translate-x-1/2'
  }`}
  style={{
    boxShadow: doorTheme.glow,
  }}
>
  <div
    className={`absolute inset-2 rounded-t-[44px] rounded-b-xl border opacity-40 ${doorTheme.border}`}
  />

  <div
    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border text-2xl ${doorTheme.border} ${doorTheme.text}`}
  >
    {doorTheme.icon}
  </div>

  <p
    className={`relative z-10 mt-4 text-[10px] font-black uppercase leading-tight tracking-[0.12em] ${doorTheme.text}`}
  >
    {doorTheme.title}
  </p>

  <p className="relative z-10 mt-2 text-[8px] font-bold uppercase leading-tight tracking-wider text-white/25">
    {doorTheme.subtitle}
  </p>

  <div className={`absolute bottom-0 left-0 right-0 h-px ${doorTheme.bg}`} />
</button>
      )
    }

    return (
      <button
        key={room.id}
        type="button"
        onClick={async () => {
  try {
    const data = await api.getSecretUserRoomPublicQuestions(room.id)

setEnteringRoom({
  id: room.id,
  roomName: data.roomName,
  roomMessage: data.roomMessage,
  questions: data.questions,
})

    setRoomAnswers(Array.from({ length: 5 }, () => ''))
    setRoomQuestionIndex(0)
    setRoomAttemptResult(null)
    setRoomAnswerDropdownOpen(false)
  } catch (error) {
    console.error('Open secret user room error:', error)
  }
}}
       className={`absolute min-h-[180px] w-[132px] overflow-hidden rounded-t-[52px] rounded-b-2xl border bg-black/75 p-3 text-left transition active:scale-[0.98] ${doorTheme.border} ${doorTheme.bg} ${
 slotNumber === 1
  ? 'left-1/2 top-[90px] -translate-x-1/2'
  : slotNumber === 2
    ? '-left-[72px] top-[440px]'
    : slotNumber === 3
      ? '-right-[72px] top-[440px]'
      : 'left-1/2 top-[860px] -translate-x-1/2'
}`}
      >
        <div
  className={`pointer-events-none absolute inset-2 rounded-t-[44px] rounded-b-xl border opacity-35 ${doorTheme.border}`}
/>
       <div className="relative z-10 text-center">
  <div
    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-2xl ${doorTheme.border} ${doorTheme.text}`}
    style={{ boxShadow: doorTheme.glow }}
  >
    {doorTheme.icon}
  </div>

  <p
    className={`mt-3 text-[11px] font-black uppercase leading-tight tracking-[0.1em] ${doorTheme.text}`}
  >
    {room.room_name}
  </p>

  {myRoom?.id === room.id && (
    <div
      role="button"
      tabIndex={0}
      onClick={async (e) => {
        e.stopPropagation()

        try {
          const data = await api.getSecretUserRoomQuestionsOwner(
            room.id,
            currentUser.name,
          )

          setRoomMessage(data.roomMessage ?? '')

          setEditingQuestions(
            Array.from({ length: 5 }, (_, index) => {
              const saved = data.questions.find(
                (question) => question.slot_number === index + 1,
              )

              return {
                title: saved?.title ?? '',
                correctAnswer: saved?.correct_answer ?? '',
              }
            }),
          )

          setEditingQuestionIndex(0)
          setAnswerDropdownOpen(false)
          setSaveQuestionsError('')
          setEditingRoomId(room.id)
        } catch (error) {
          console.error('Load room questions error:', error)
        }
      }}
      className={`mt-3 cursor-pointer rounded-lg border px-2 py-2 text-[8px] font-black uppercase tracking-wider transition active:scale-95 ${doorTheme.border} ${doorTheme.bg} ${doorTheme.text}`}
    >
      НАСТРОИТЬ
    </div>
  )}
</div>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
  <div
    className={`rounded-xl border bg-black/45 px-2 py-2 text-center ${doorTheme.border}`}
  >
    <p className="text-[8px] font-black uppercase tracking-wider text-white/30">
      Попытки
    </p>

    <p className={`mt-1 text-xs font-black ${doorTheme.text}`}>
      🗝️ {room.attempts}
    </p>
  </div>

  <div
    className={`rounded-xl border bg-black/45 px-2 py-2 text-center ${doorTheme.border}`}
  >
    <p className="text-[8px] font-black uppercase tracking-wider text-white/30">
      Вошло
    </p>

    <p className={`mt-1 text-xs font-black ${doorTheme.text}`}>
      🚪 {room.entered}
    </p>
  </div>
</div>
         
        
      </button>
    )
  })}
</div>
      {adminPasswordOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4"
    onClick={() => setAdminPasswordOpen(false)}
  >
    <div
      className="w-full max-w-xs rounded-3xl border border-accent/30 bg-[#0b0b12] p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-center text-3xl">🔒</p>

      <h3 className="mt-3 text-center text-lg font-black uppercase text-white">
        АДМИНКА
      </h3>

      <input
        type="password"
        inputMode="numeric"
        value={adminPassword}
        onChange={(e) => {
          setAdminPassword(e.target.value)
          setAdminPasswordError('')
        }}
        placeholder="Пароль"
        className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-center text-xl font-black tracking-[0.35em] text-white outline-none placeholder:tracking-normal placeholder:text-white/25 focus:border-accent/50"
      />

      {adminPasswordError && (
        <p className="mt-3 text-center text-xs font-bold text-red-400">
          {adminPasswordError}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          if (adminPassword === '3010') {
            setAdminPasswordOpen(false)
            setAdminPassword('')
            setAdminPasswordError('')
            setAdminOpen(true)
          } else {
            setAdminPasswordError('НЕВЕРНЫЙ ПАРОЛЬ')
          }
        }}
        className="mt-4 h-12 w-full rounded-2xl border border-accent/40 bg-accent/15 text-sm font-black uppercase tracking-wider text-accent"
      >
        ВОЙТИ
      </button>
    </div>
  </div>
)}
      {adminOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
    <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0b0b12] p-5 shadow-2xl">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-400/60">
            АМАЛЬГАМА
          </p>
          <h3 className="mt-1 text-lg font-black uppercase text-white">
            Управление комнатами
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setAdminOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {userRooms.length > 0 ? (
          userRooms.map((room) => (
            <div
              key={room.id}
              className="rounded-2xl border border-white/10 bg-black/50 p-4"
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                СЛОТ {room.slot_number}
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {room.room_name}
              </p>

              <p className="mt-2 text-[10px] font-bold text-white/35">
                🗝️ {room.attempts} · 🚪 {room.entered}
              </p>
              <button
  type="button"
  onClick={() => {
  setRoomToDelete({
    id: room.id,
    room_name: room.room_name,
  })
}}

  className="mt-4 w-full rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-300 transition active:scale-[0.98]"
>
  ОЧИСТИТЬ КОМНАТУ
</button>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-xs font-bold text-white/30">
            Созданных комнат нет
          </p>
        )}
      </div>
    </div>
  </div>
)}
      {roomToDelete && (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 px-4"
    onClick={() => setRoomToDelete(null)}
  >
    <div
      className="w-full max-w-xs rounded-3xl border border-red-500/35 bg-[#0b0b12] p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-center text-3xl">⚠️</p>

      <h3 className="mt-3 text-center text-lg font-black uppercase text-white">
        ТОЧНО ОЧИСТИТЬ?
      </h3>

      <p className="mt-3 text-center text-sm font-bold text-white/60">
        {roomToDelete.room_name}
      </p>

      <p className="mt-3 text-center text-xs leading-relaxed text-white/35">
        Будут удалены испытания, послание, попытки и список вошедших.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRoomToDelete(null)}
          className="h-12 rounded-2xl border border-white/10 bg-white/5 text-xs font-black uppercase text-white/60"
        >
          ОТМЕНА
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              const deletedRoomId = roomToDelete.id

              await api.deleteSecretUserRoom(deletedRoomId)

              const rooms = await api.getSecretUserRooms()
              setUserRooms(rooms)

              if (myRoom?.id === deletedRoomId) {
                setMyRoom(null)
              }

              setRoomToDelete(null)
            } catch (error) {
              console.error('Delete secret room error:', error)
            }
          }}
          className="h-12 rounded-2xl border border-red-500/40 bg-red-500/15 text-xs font-black uppercase text-red-300"
        >
          ОЧИСТИТЬ
        </button>
      </div>
    </div>
  </div>
)}
      {showCreateRoom && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
    <div className="w-full max-w-sm rounded-3xl border border-accent/30 bg-[#0b0b12] p-5 shadow-2xl">
      <h3 className="text-center text-lg font-black uppercase text-white">
        Создай свою комнату
      </h3>

      <p className="mt-2 text-center text-xs text-white/50">
        Придумай название секретной двери
      </p>

      <input
        value={newRoomName}
        onChange={(e) => setNewRoomName(e.target.value)}
        maxLength={50}
        placeholder="Название комнаты"
        className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-accent/50"
      />
{createRoomError && (
  <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-bold text-red-400">
    {createRoomError}
  </p>
)}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setShowCreateRoom(false)
            setNewRoomName('')
          }}
          className="h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white/60"
        >
          ОТМЕНА
        </button>

        <button
  type="button"
  onClick={async () => {
    const roomName = newRoomName.trim()

    if (!roomName || !currentUser?.name) return

   try {
  setCreateRoomError('')

  await api.createSecretUserRoom(currentUser.name, roomName)

  const rooms = await api.getSecretUserRooms()
  setUserRooms(rooms)

  setNewRoomName('')
  setCreateRoomError('')
  setShowCreateRoom(false)
} catch (error) {
  console.error('Create secret room error:', error)

  setCreateRoomError(
    error instanceof Error
      ? error.message
      : 'Не удалось создать комнату',
  )
}

  }}
  disabled={!newRoomName.trim()}
  className="h-12 rounded-2xl border border-accent/40 bg-accent/15 text-sm font-black text-accent disabled:cursor-not-allowed disabled:opacity-30"
>
  СОЗДАТЬ
</button>
      </div>
    </div>
  </div>
)}
      {editingRoomId !== null && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
    <div className="w-full max-w-md rounded-3xl border border-accent/30 bg-[#0b0b12] p-5 shadow-2xl">
      <h3 className="text-center text-lg font-black uppercase text-white">
        Настройка комнаты
      </h3>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {editingQuestions.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setEditingQuestionIndex(index)}
            className={`h-10 rounded-xl text-xs font-black transition ${
              editingQuestionIndex === index
                ? 'border border-accent/50 bg-accent/20 text-accent'
                : 'border border-white/10 bg-white/5 text-white/40'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <input
        value={editingQuestions[editingQuestionIndex].title}
        onChange={(e) => {
          const value = e.target.value

          setEditingQuestions((current) =>
            current.map((question, index) =>
              index === editingQuestionIndex
                ? { ...question, title: value }
                : question,
            ),
          )
        }}
        placeholder="Название испытания"
        className="mt-5 h-14 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-accent/50"
      />

     <div className="mt-3">
  <NameDropdown
    value={editingQuestions[editingQuestionIndex].correctAnswer}
    onChange={(value) => {
      setEditingQuestions((current) =>
        current.map((question, index) =>
          index === editingQuestionIndex
            ? { ...question, correctAnswer: value }
            : question,
        ),
      )
      setAnswerDropdownOpen(false)
    }}
    workers={workers}
    color={{
      border: 'rgba(255,43,214,0.7)',
      glow: 'rgba(255,43,214,0.45)',
      text: '#ff2bd6',
    }}
open={answerDropdownOpen}
onOpenChange={setAnswerDropdownOpen}
  />
</div>
<div className="mt-6">
  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent/70">
    ТАЙНОЕ ПОСЛАНИЕ
  </p>

  <textarea
    value={roomMessage}
    onChange={(e) => setRoomMessage(e.target.value)}
    placeholder="Напиши послание тем, кто сможет войти..."
    rows={5}
    className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-accent/50"
  />
</div>
      {saveQuestionsError && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-bold text-red-400">
          {saveQuestionsError}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setEditingRoomId(null)
            setSaveQuestionsError('')
          }}
          className="h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white/60"
        >
          ЗАКРЫТЬ
        </button>

        <button
          type="button"
          onClick={async () => {
            if (!currentUser?.name || editingRoomId === null) return

            try {
              setSaveQuestionsError('')

              await api.saveSecretUserRoomQuestions(
                editingRoomId,
                currentUser.name,
                editingQuestions,
              )
await api.updateSecretUserRoomMessage(
  editingRoomId,
  currentUser.name,
  roomMessage,
)
              setEditingRoomId(null)
            } catch (error) {
              console.error('Save secret room questions error:', error)

              setSaveQuestionsError(
                error instanceof Error
                  ? error.message
                  : 'Не удалось сохранить испытания',
              )
            }
          }}
          className="h-12 rounded-2xl border border-accent/40 bg-accent/15 text-sm font-black text-accent"
        >
          СОХРАНИТЬ
        </button>
      </div>
    </div>
  </div>
)}
      
    </div>
  ) : (
    <SecretQuest onUnlocked={unlockQuest} />
  )
) : (
        <>
          <div className="mb-4 flex flex-col items-center">
            <img
              src="https://lh3.googleusercontent.com/d/1pnfg4Tz__Sp0AquLUdxulwix2DZh9Tlu"
              alt="Секретная комната"
              className="w-full max-w-sm h-auto rounded-2xl border-2 border-pink-500/60 object-cover"
              style={{ boxShadow: '0 0 40px rgba(236,72,153,0.5)' }}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://drive.google.com/uc?id=1pnfg4Tz__Sp0AquLUdxulwix2DZh9Tlu'; }}
            />
          </div>

          {/* Team Life and Shadow Realm panels */}
          <div className="mb-4 space-y-4">
            <button
              onClick={() => setInnerView('teamLife')}
              className="group block w-full overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-neon/60"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
            >
              <img
                src="/banner-team-life.webp"
                alt="Жизнь команды"
                className="block aspect-square h-auto w-full object-contain transition duration-300 group-hover:brightness-110"
              />
            </button>
            <button
              onClick={openShadowRealm}
              className="group block w-full overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-neon/60"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
            >
              <img
                src="/banner-new-panel.webp"
                alt="Обитель теней"
                className="block aspect-square h-auto w-full object-contain transition duration-300 group-hover:brightness-110"
              />
            </button>
          </div>
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-muted">Загрузка ленты...</p>
          ) : memes.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20">
              <Flame size={38} color="#5a6172" />
              <p className="mt-4 text-lg font-extrabold text-ink">Пока тихо</p>
              <p className="mt-2 text-center text-xs leading-relaxed text-ink-muted">
                В секретной комнате пока пусто. Нажмите +, чтобы закинуть первый угар!
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {memes.map((meme) => (
                <div key={meme.id} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur-md">
                  <p className="text-base font-semibold leading-relaxed text-ink">{meme.description}</p>
                  {meme.image_url && (
                    <img
                      src={meme.image_url}
                      alt=""
                      className="mt-3.5 h-48 w-full rounded-xl object-cover bg-input"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                  <p className="mt-4 text-[9px] tracking-widest text-ink-faint">ТОЛЬКО ДЛЯ СВОИХ</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={leaveQuest}
            className="mt-6 mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-bold text-accent transition-transform active:scale-95"
          >
            <DoorOpen size={18} />
            Покинуть секретную комнату
          </button>

          {isAdmin && (
            <button
              onClick={() => setOpen(true)}
              className="fixed bottom-24 right-4 z-30 flex items-center justify-center rounded-full bg-accent text-ink transition-transform active:scale-90"
              style={{ width: 52, height: 52, boxShadow: '0 4px 14px rgba(255,43,214,0.5)' }}
            >
              <Plus size={25} strokeWidth={2.8} />
            </button>
          )}

          {open && (
            <div className="fixed inset-0 z-50 flex items-end bg-black/70 animate-fadeIn" onClick={() => setOpen(false)}>
              <div
                className="w-full rounded-t-3xl border-t border-accent/30 bg-card/80 p-6 pb-8 backdrop-blur-md animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-ink">Новый угар</h2>
                  <button onClick={() => setOpen(false)} className="text-ink-muted"><X size={19} /></button>
                </div>
                <p className="mt-1 text-sm text-ink-muted">Поделитесь чем-то для своих</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Текст описания"
                  rows={3}
                  className="mt-5 w-full rounded-xl border border-line bg-input px-4 py-3 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-faint"
                />
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ссылка на картинку URL (необязательно)"
                  className="mt-2.5 h-13 w-full rounded-xl border border-line bg-input px-4 py-3 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-faint"
                />
                <button
                  onClick={() => void submit()}
                  className="mt-4 h-13 w-full rounded-xl bg-accent text-sm font-extrabold text-ink transition-transform active:scale-95"
                >
                  Закинуть в комнату
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
