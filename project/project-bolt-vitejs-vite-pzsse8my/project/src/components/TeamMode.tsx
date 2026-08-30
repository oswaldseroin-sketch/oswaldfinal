import { useEffect, useState } from 'react'
import { workersList } from '../lib/data'
import { getTitle } from '../lib/titles'
import { TEAM_DAILY_QUESTIONS } from '../lib/teamQuestions'
import { supabase } from '../lib/supabase'

type TeamModeProps = {
  onBack: () => void
}

export default function TeamMode({ onBack }: TeamModeProps) {
  const [playerName, setPlayerName] = useState('')
  const [nameOpen, setNameOpen] = useState(false)
  const [playerXP, setPlayerXP] = useState(0)
const [playerLevel, setPlayerLevel] = useState(1)
const [coins, setCoins] = useState(0)
const [titleXP, setTitleXP] = useState(0)
const [titleLevel, setTitleLevel] = useState(1)
  const todayQuestion =
  TEAM_DAILY_QUESTIONS[
    Math.floor(Date.now() / 86400000) % TEAM_DAILY_QUESTIONS.length
    
  ]
  const getGameDay = () => {
  const now = new Date()
  const shifted = new Date(now.getTime() - 8 * 60 * 60 * 1000)

  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`
}

const gameDay = getGameDay()
const [dailyVotes, setDailyVotes] = useState<string[]>([])
const [dailyVoteDone, setDailyVoteDone] = useState(false)
const [rewardPopup, setRewardPopup] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  useEffect(() => {
  if (!playerName) return

  const loadDailyVote = async () => {
    const { data, error } = await supabase
      .from('team_daily_votes')
      .select('choice_1, choice_2, choice_3')
      .eq('game_day', gameDay)
      .eq('voter_name', playerName)
      .maybeSingle()

    if (error) {
      console.error('Ошибка загрузки голоса:', error)
      return
    }

    if (data) {
      setDailyVotes([
        data.choice_1,
        data.choice_2,
        data.choice_3,
      ])
      setDailyVoteDone(true)
    } else {
      setDailyVotes([])
      setDailyVoteDone(false)
    }
  }

  void loadDailyVote()
}, [playerName, gameDay])
  return (
    <div className="min-h-screen bg-black px-4 pb-10 pt-6 text-white">
      <div className="mx-auto w-full max-w-md">

        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-xs font-black text-cyan-300"
        >
          ← НАЗАД
        </button>

        <div className="mb-5 text-center">
          <h1
            className="text-xl font-black uppercase tracking-wider text-cyan-300"
            style={{ textShadow: '0 0 12px rgba(0,229,255,0.45)' }}
          >
            КОМАНДНЫЙ РЕЖИМ
          </h1>

          <p className="mt-1 text-[10px] font-bold text-white/40">
            ежедневные игры команды
          </p>
        </div>

        {!playerName ? (
          <div className="rounded-2xl border border-purple-500/30 bg-white/[0.03] p-4">
            <p className="mb-3 text-center text-xs font-black uppercase text-purple-300">
              Кто ты?
            </p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNameOpen((v) => !v)}
                className="w-full rounded-xl border border-purple-500/40 bg-black/70 px-4 py-3 text-left text-sm font-bold text-purple-300"
              >
                <div className="flex items-center justify-between">
                  <span>Выбрать ФИО</span>
                  <span>{nameOpen ? '⌃' : '⌄'}</span>
                </div>
              </button>

              {nameOpen && (
                <div className="absolute left-0 right-0 top-[52px] z-50 max-h-64 overflow-y-auto rounded-xl border border-purple-500/40 bg-black/95 p-2">
                  {workersList.map((worker) => (
                    <button
                      key={worker.name}
                      type="button"
                      onClick={() => {
                        setPlayerName(worker.name)
                        setNameOpen(false)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-purple-300 active:bg-purple-500/10"
                    >
                      {worker.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">

            <div className="rounded-2xl border border-cyan-400/30 bg-white/[0.03] p-4 text-center">
              <p className="text-sm font-black text-cyan-300">
                {playerName}
              </p>

              <p className="mt-1 text-[11px] font-black text-amber-300">
                ⭐ УРОВЕНЬ {playerLevel}
              </p>

              <div className="mx-auto mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
  <div
    className="h-full rounded-full bg-amber-400 transition-all duration-300"
    style={{
      width: `${Math.min((playerXP / 20) * 100, 100)}%`,
    }}
  />
</div>

<p className="mt-1 text-[9px] font-bold text-white/35">
  {playerXP}/20 XP
</p>
<p className="mt-2 text-[10px] font-bold text-purple-300">
  Звание: {getTitle(titleLevel)}
</p>
              <p
  className="mt-2 text-sm font-black text-amber-300"
  style={{ textShadow: '0 0 8px rgba(255,215,0,0.45)' }}
>
  🪙 {coins}
</p>
            </div>

           <button
  type="button"
  onClick={() => setGameStarted(true)}
  className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 py-3 text-sm font-black uppercase tracking-wider text-cyan-300 transition-all active:scale-95"
>
  🎮 НАЧАТЬ ИГРУ
</button>
{gameStarted && (
  <div
    className="rounded-2xl border border-purple-500/40 bg-black/70 p-4"
    style={{
      boxShadow: '0 0 22px rgba(168,85,247,0.14)',
    }}
  >
    <div className="mb-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300">
        🗳 МИНИ-ИГРА 01
      </p>

      <p className="mt-2 text-base font-black text-white">
        {todayQuestion}
      </p>

      <p className="mt-1 text-[10px] font-bold text-white/40">
        Выбери 3 человек
      </p>
    </div>

    {!dailyVoteDone ? (
      <>
        <div className="space-y-2">
          {[0, 1, 2].map((slot) => (
            <select
              key={slot}
              value={dailyVotes[slot] ?? ''}
              onChange={(event) => {
                const value = event.target.value

                setDailyVotes((prev) => {
                  const next = [...prev]
                  next[slot] = value
                  return next
                })
              }}
              className="w-full rounded-xl border border-purple-500/30 bg-black/80 px-3 py-3 text-sm font-bold text-purple-200 outline-none"
            >
              <option value="">
                {slot + 1}. Выбрать ФИО
              </option>

              {workersList
                .filter(
                  (worker) =>
                    worker.name !== playerName &&
                    (!dailyVotes.includes(worker.name) ||
                      dailyVotes[slot] === worker.name)
                )
                .map((worker) => (
                  <option key={worker.name} value={worker.name}>
                    {worker.name}
                  </option>
                ))}
            </select>
          ))}
        </div>

        <button
          type="button"
          disabled={
            dailyVotes.filter(Boolean).length !== 3 ||
            new Set(dailyVotes.filter(Boolean)).size !== 3
          }
          onClick={async () => {
  if (dailyVotes.length !== 3 || dailyVotes.some((name) => !name)) return
  if (!playerName) return

  const { error } = await supabase
    .from('team_daily_votes')
    .insert({
      game_day: gameDay,
      voter_name: playerName,
      question: todayQuestion,
      choice_1: dailyVotes[0],
      choice_2: dailyVotes[1],
      choice_3: dailyVotes[2],
    })

  if (error) {
    console.error('Ошибка сохранения голоса:', error)
    return
  }

  setPlayerXP((xp) => xp + 2)
  setCoins((value) => value + 1)
  setDailyVoteDone(true)
  setRewardPopup(true)

  setTimeout(() => {
    setRewardPopup(false)
  }, 2200)
}}
          className="mt-4 w-full rounded-xl bg-purple-500 py-3 text-sm font-black uppercase text-white transition-all active:scale-95 disabled:opacity-30"
        >
          ПОДТВЕРДИТЬ ВЫБОР
        </button>
      </>
    ) : (
      <div className="text-center">
        <p className="text-sm font-black text-green-400">
          ✅ ВЫПОЛНЕНО
        </p>

        <div className="mt-3 space-y-1">
          {dailyVotes.map((name, index) => (
            <p
              key={name}
              className="text-sm font-bold text-purple-300"
            >
              {index + 1}. {name}
            </p>
          ))}
        </div>
      </div>
    )}

    {rewardPopup && (
      <div className="mt-4 flex items-center justify-center gap-4 rounded-xl border border-amber-400/30 bg-amber-400/10 py-3">
        <span className="text-sm font-black text-cyan-300">
          ⭐ +2 XP
        </span>

        <span className="text-sm font-black text-amber-300">
          🪙 +1
        </span>
      </div>
    )}
  </div>
)}
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-purple-500/30 bg-purple-500/10 py-3 text-xs font-black text-purple-300">
                💬 ЧАТ КОМАНДЫ
              </button>

              <button className="rounded-xl border border-amber-400/30 bg-amber-400/10 py-3 text-xs font-black text-amber-300">
                🎰 ЛОТЕРЕЯ
              </button>

              <button className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-3 text-xs font-black text-cyan-300">
                🏪 МАГАЗИНЬШ
              </button>

              <button className="rounded-xl border border-green-400/30 bg-green-400/10 py-3 text-xs font-black text-green-300">
                🏆 СТАТИСТИКА
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}