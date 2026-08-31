import { useEffect, useMemo, useState } from 'react'
import { Zap, ChevronDown, Plus, X, LockKeyhole, Search } from 'lucide-react'
import { useApp, type TeamStats } from '../context/AppContext'
import { type Worker } from '../lib/data'
import { getItem, setItem, todayKey } from '../lib/storage'
import { TITLES, getTitle, isMaxTitle, MAX_TITLE_LEVEL, TITLE_XP_PER_LEVEL } from '../lib/titles'

type Stats = { weight: number; happiness: number; balance: number }
type WorkerStats = Record<string, Stats>
type DailyActions = { date: string; left: number }

const ACTIONS_KEY = 'team-life-actions-v3'
const MY_NAME_KEY = 'team-life-my-name'
const DAILY_LIMIT = 3

const BASE_STATS: Stats = { weight: 0, happiness: 0, balance: 0 }

type ActionDef = {
  id: string
  emoji: string
  label: string
  color: string
  glow: string
  apply: (s: Stats) => Stats
}

const ACTIONS: ActionDef[] = [
  { id: 'pierojok', emoji: '🥮 +1 кг', label: 'Угостить Пирожком', color: '#39ff14', glow: 'rgba(57,255,20,0.5)', apply: (s) => ({ ...s, weight: s.weight + 1 }) },
  { id: 'tormozok', emoji: '🍱 -1 кг', label: 'Съесть Тормозок', color: '#ff9933', glow: 'rgba(255,153,51,0.5)', apply: (s) => ({ ...s, weight: s.weight - 1 }) },
  { id: 'hug', emoji: '🫂 +1 ❤️', label: 'Обнять', color: '#ff2bd6', glow: 'rgba(255,43,214,0.5)', apply: (s) => ({ ...s, happiness: s.happiness + 1 }) },
  { id: 'lesch', emoji: '🐟 -1 ❤️', label: 'Дать Леща', color: '#00e5ff', glow: 'rgba(0,229,255,0.5)', apply: (s) => ({ ...s, happiness: s.happiness - 1 }) },
  { id: 'smena', emoji: '🛠 +100 ₽', label: 'Отдать смену', color: '#a3e635', glow: 'rgba(163,230,53,0.5)', apply: (s) => ({ ...s, balance: s.balance + 100 }) },
  { id: 'dolg', emoji: '🧾 -100 ₽', label: 'Занять с концами', color: '#ff4444', glow: 'rgba(255,68,68,0.5)', apply: (s) => ({ ...s, balance: s.balance - 100 }) },
]

function loadActionsLeft(): number {
  const data = getItem<DailyActions | null>(ACTIONS_KEY, null)
  const key = todayKey()
  if (!data || data.date !== key) return DAILY_LIMIT
  if (typeof data.left === 'number') return data.left
  return DAILY_LIMIT
}

function saveActionsLeft(left: number): void {
  setItem(ACTIONS_KEY, { date: todayKey(), left })
}

type Leader = { icon: string; label: string; name: string; value: string; color: string }

function computeLeaders(stats: WorkerStats, workers: Worker[]): Leader[] {
  const entries = workers.map((w) => ({ name: w.name, s: stats[w.name] ?? BASE_STATS }))
  const allZero = entries.every((e) => e.s.weight === 0 && e.s.happiness === 0 && e.s.balance === 0)

  const maxBy = (key: keyof Stats, fmt: (v: number) => string, reverse = false): Leader => {
    const sorted = [...entries].sort((a, b) => (reverse ? a.s[key] - b.s[key] : b.s[key] - a.s[key]))
    const top = sorted[0]
    const isTie = entries.filter((e) => e.s[key] === top.s[key]).length === entries.length
    return { icon: '', label: '', name: allZero || isTie ? 'Не определен' : top.name, value: fmt(top.s[key]), color: '' }
  }

  const fattest = maxBy('weight', (v) => `${v} кг`)
  fattest.icon = '👑'; fattest.label = 'Самый жирный'; fattest.color = '#39ff14'
  const thinnest = maxBy('weight', (v) => `${v} кг`, true)
  thinnest.icon = '💀'; thinnest.label = 'Самый худой'; thinnest.color = '#aaaaaa'
  const richest = maxBy('balance', (v) => `${v} ₽`)
  richest.icon = '💰'; richest.label = 'Самый богатый'; richest.color = '#a3e635'
  const poorest = maxBy('balance', (v) => `${v} ₽`, true)
  poorest.icon = '📉'; poorest.label = 'Самый нищий'; poorest.color = '#ff4444'
  const happiest = maxBy('happiness', (v) => `${v}`)
  happiest.icon = '😂'; happiest.label = 'Самый счастливый'; happiest.color = '#ff2bd6'
  const saddest = maxBy('happiness', (v) => `${v}`, true)
  saddest.icon = '😭'; saddest.label = 'Самый несчастный'; saddest.color = '#00e5ff'

  return [fattest, thinnest, richest, poorest, happiest, saddest]
}

export default function TeamLifePanel() {
  const { isAdmin, unlock, lock, workers, teamStats, adjustTeamStats, adjustTitleXP } = useApp()
  const stats = teamStats as TeamStats
  const [actionsLeft, setActionsLeft] = useState<number>(loadActionsLeft)
  const [myName, setMyName] = useState<string>(() => getItem<string | null>(MY_NAME_KEY, null) ?? '')
  const [whoOpen, setWhoOpen] = useState(false)
  const [whoSearch, setWhoSearch] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<string>('')
  const [toast, setToast] = useState<string | null>(null)
  const [titleToast, setTitleToast] = useState<string | null>(null)
  const [pulseKey, setPulseKey] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminWorker, setAdminWorker] = useState('')
  const [adminWeight, setAdminWeight] = useState('')
  const [adminHappiness, setAdminHappiness] = useState('')
  const [adminBalance, setAdminBalance] = useState('')

  useEffect(() => {
    if (!myName) setWhoOpen(true)
  }, [myName])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!titleToast) return
    const t = setTimeout(() => setTitleToast(null), 3000)
    return () => clearTimeout(t)
  }, [titleToast])

  const leaders = useMemo(() => computeLeaders(stats, workers), [stats, workers])

  const myStats = myName ? (stats[myName] ?? { weight: 0, happiness: 0, balance: 0, titleLevel: 1, titleXP: 0 }) : null
  const myTitleLevel = myStats?.titleLevel ?? 1
  const myTitleXP = myStats?.titleXP ?? 0
  const myMaxed = isMaxTitle(myTitleLevel)
  const myTitle = getTitle(myTitleLevel)

  const whoFiltered = useMemo(() => {
    const q = whoSearch.trim().toLowerCase()
    if (!q) return workers
    return workers.filter((w) => w.name.toLowerCase().includes(q))
  }, [workers, whoSearch])

  const pickName = (name: string): void => {
    setMyName(name)
    setItem(MY_NAME_KEY, name)
    setWhoOpen(false)
    setWhoSearch('')
  }

  const handleAction = (action: ActionDef): void => {
    if (!selectedWorker) return
    if (actionsLeft <= 0) {
      setToast('Лимит действий исчерпан! Приходи на следующий день')
      return
    }
    const current = stats[selectedWorker] ?? BASE_STATS
    const next = action.apply(current)
    void adjustTeamStats(selectedWorker, {
      weight: next.weight - current.weight,
      happiness: next.happiness - current.happiness,
      balance: next.balance - current.balance,
    }).then((saved) => {
      if (!saved) {
        setToast('Не удалось сохранить действие')
        return
      }
      const newLeft = actionsLeft - 1
      setActionsLeft(newLeft)
      saveActionsLeft(newLeft)
      setToast(`${action.emoji} ${action.label} → ${selectedWorker}`)
      setPulseKey((k) => k + 1)

      if (myName) {
        void adjustTitleXP(myName).then((result) => {
          if (result?.leveledUp) {
            setTitleToast(`🏅 НОВОЕ ЗВАНИЕ\n${getTitle(result.newLevel)}`)
          }
        })
      }
    })
  }

  const openAdmin = () => {
    if (isAdmin) {
      setAdminOpen(true); setAdminWorker(''); setAdminWeight(''); setAdminHappiness(''); setAdminBalance('')
    } else {
      setAdminOpen(true); setAdminPassword(''); setAdminError('')
    }
  }

  const submitAdminPassword = () => {
    if (unlock(adminPassword)) {
      setAdminPassword(''); setAdminError(''); setAdminWorker(''); setAdminWeight(''); setAdminHappiness(''); setAdminBalance('')
    } else {
      setAdminError('Неверный пароль')
    }
  }

  const applyAdminEdit = () => {
    if (!adminWorker) return
    const current = stats[adminWorker] ?? BASE_STATS
    const next: Stats = {
      weight: adminWeight !== '' ? Number(adminWeight) : current.weight,
      happiness: adminHappiness !== '' ? Number(adminHappiness) : current.happiness,
      balance: adminBalance !== '' ? Number(adminBalance) : current.balance,
    }
    void adjustTeamStats(adminWorker, {
      weight: next.weight - current.weight,
      happiness: next.happiness - current.happiness,
      balance: next.balance - current.balance,
    })
    setAdminWeight(''); setAdminHappiness(''); setAdminBalance('')
    setToast(`✅ Значения обновлены: ${adminWorker}`)
    setPulseKey((k) => k + 1)
  }

  const adjustAdminValue = (field: keyof Stats, delta: number) => {
    void adjustTeamStats(adminWorker, {
      weight: field === 'weight' ? delta : 0,
      happiness: field === 'happiness' ? delta : 0,
      balance: field === 'balance' ? delta : 0,
    })
    setPulseKey((k) => k + 1)
  }

  const s = selectedWorker ? (stats[selectedWorker] ?? BASE_STATS) : null
  const selectedTitleLevel = selectedWorker ? (stats[selectedWorker]?.titleLevel ?? 1) : 1
  const selectedTitle = getTitle(selectedTitleLevel)
  const index = s ? s.happiness * 10 + s.balance : 0
  const positive = index >= 0
  const barColor = positive ? '#39ff14' : '#ff2020'
  const barGlow = positive ? 'rgba(57,255,20,0.6)' : 'rgba(255,32,32,0.6)'
  const barWidth = s ? Math.min(Math.abs(index) / 2, 50) : 0

  const titleBarXP = myMaxed ? TITLE_XP_PER_LEVEL : myTitleXP
  const titleBarPct = (titleBarXP / TITLE_XP_PER_LEVEL) * 100

  return (
    <div className="rounded-2xl border border-neon/30 bg-black/40 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 22px rgba(0,229,255,0.10)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
          Жизнь команды
        </h2>
        <div className="flex items-center gap-1.5 rounded-full border-2 px-3 py-1" style={{ borderColor: actionsLeft > 0 ? 'rgba(0,229,255,0.5)' : 'rgba(255,68,68,0.5)', boxShadow: actionsLeft > 0 ? '0 0 12px rgba(0,229,255,0.3)' : '0 0 12px rgba(255,68,68,0.3)' }}>
          <Zap size={14} className={actionsLeft > 0 ? 'text-neon' : 'text-red-400'} />
          <span className="text-xs font-black" style={{ color: actionsLeft > 0 ? '#00e5ff' : '#ff4444' }}>
            {actionsLeft} / {DAILY_LIMIT}
          </span>
        </div>
      </div>

      {/* Player panel */}
      {myName && (
        <div className="mb-3 rounded-xl border border-neon/20 bg-black/50 p-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-ink">{myName}</p>
              <p className="mt-0.5 truncate text-xs font-bold text-neon" style={{ textShadow: '0 0 6px rgba(0,229,255,0.3)' }}>🏅 {myTitle}</p>
            </div>
            <button onClick={() => setWhoOpen(true)} className="ml-2 shrink-0 rounded-lg border border-line px-2 py-1 text-[10px] font-bold text-ink-muted active:scale-95">Сменить</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/60">
              <div className="h-full rounded-full bg-neon transition-all duration-500" style={{ width: `${titleBarPct}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
            </div>
            <span className="shrink-0 text-[10px] font-black text-ink-muted">
              {myMaxed ? 'MAX' : `${myTitleXP}/${TITLE_XP_PER_LEVEL}`}
            </span>
          </div>
        </div>
      )}

      <p className="mb-3 text-center text-[11px] font-bold text-ink-faint">
        ⚡ Твои действия на сегодня: {actionsLeft} из {DAILY_LIMIT}
      </p>

      {/* SELECT */}
      <div className="relative mb-3">
        <label className="mb-2 block text-sm font-black text-ink">🔍 Кого выбираем?</label>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border-2 border-neon/40 bg-black/60 px-4 py-3 text-left transition-all duration-200 hover:border-neon/60"
          style={{ boxShadow: '0 0 12px rgba(0,229,255,0.15)' }}
        >
          <span className={`text-sm font-bold ${selectedWorker ? 'text-ink' : 'text-ink-faint'}`}>
            {selectedWorker || 'Выбери сотрудника...'}
          </span>
          <ChevronDown size={18} className={`shrink-0 text-neon transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-neon/40 bg-black/95 py-1 backdrop-blur-md" style={{ boxShadow: '0 8px 30px rgba(0,229,255,0.2)' }}>
            {workers.map((w) => (
              <button
                key={w.name}
                onClick={() => { setSelectedWorker(w.name); setDropdownOpen(false) }}
                className={`block w-full px-4 py-2 text-left text-sm font-bold transition-colors hover:bg-neon/10 ${selectedWorker === w.name ? 'text-neon' : 'text-ink'}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CARD */}
      {s && (
        <div
          key={pulseKey}
          className="mb-3 rounded-2xl border-2 bg-black/60 p-3 transition-all duration-300"
          style={{ borderColor: `${barColor}88`, boxShadow: `0 0 20px ${barGlow}` }}
        >
          <p className="mb-1 truncate text-sm font-extrabold text-ink">{selectedWorker}</p>
          <p className="mb-2 text-xs font-bold text-neon" style={{ textShadow: '0 0 6px rgba(0,229,255,0.3)' }}>🏅 {selectedTitle}</p>

          <div className="mb-3 space-y-1">
            <p className="text-[13px] font-black" style={{ color: '#39ff14', textShadow: '0 0 6px rgba(57,255,20,0.5)' }}>
              ⚖️ Вес: <span className="text-base">{s.weight}</span> кг
            </p>
            <p className="text-[13px] font-black" style={{ color: '#ff2bd6', textShadow: '0 0 6px rgba(255,43,214,0.5)' }}>
              ❤️ Счастье: <span className="text-base">{s.happiness}</span>
            </p>
            <p className="text-[13px] font-black" style={{ color: '#00e5ff', textShadow: '0 0 6px rgba(0,229,255,0.5)' }}>
              💵 Баланс: <span className="text-base">{s.balance}</span> ₽
            </p>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={actionsLeft <= 0}
                className="flex flex-col items-center gap-1 rounded-lg border bg-black/50 px-2 py-4 transition-all duration-150 hover:scale-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100"
                style={{ borderColor: `${action.color}55`, boxShadow: `inset 0 0 6px ${action.glow}` }}
              >
                <span className="text-sm font-black leading-tight" style={{ color: action.color, textShadow: `0 0 4px ${action.glow}` }}>
                  {action.emoji}
                </span>
                <span className="text-[11px] font-black leading-tight text-white">
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          <div className="relative h-7 w-full overflow-hidden rounded-lg border border-white/10 bg-black/80">
            {positive ? (
              <div className="absolute left-1/2 top-0 h-full rounded-r-lg transition-all duration-500" style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`, boxShadow: `0 0 10px ${barGlow}` }} />
            ) : (
              <div className="absolute top-0 h-full rounded-l-lg transition-all duration-500" style={{ right: '50%', width: `${barWidth}%`, background: `linear-gradient(270deg, ${barColor}aa, ${barColor})`, boxShadow: `0 0 10px ${barGlow}` }} />
            )}
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black tracking-wide" style={{ color: barColor, textShadow: `0 0 8px ${barGlow}, 0 0 2px rgba(0,0,0,0.8)` }}>
                Рейтинг: {index > 0 ? '+' : ''}{index}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LEADERS TABLE */}
      <div className="rounded-2xl border border-accent/30 bg-black/50 p-3" style={{ boxShadow: '0 0 15px rgba(255,43,214,0.1)' }}>
        <p className="mb-2 text-center text-xs font-black uppercase tracking-wider text-accent" style={{ textShadow: '0 0 8px rgba(255,43,214,0.4)' }}>
          🏆 Самые известные
        </p>
        <div className="space-y-1.5">
          {leaders.map((l) => (
            <div key={l.label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <span className="text-base">{l.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-ink-faint">{l.label}</p>
                <p className={`truncate text-xs font-black ${l.name === 'Не определен' ? 'text-ink-faint' : 'text-ink'}`}>{l.name}</p>
              </div>
              <span className="shrink-0 text-sm font-black" style={{ color: l.color, textShadow: `0 0 6px ${l.color}55` }}>
                {l.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <button
          onClick={openAdmin}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/70 shadow-lg backdrop-blur-md transition-transform active:scale-90"
          title="Админ-управление"
        >
          {isAdmin ? <Plus size={18} color="#22ff88" strokeWidth={2.5} /> : <LockKeyhole size={17} color="#8b92a3" strokeWidth={2.2} />}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-bold backdrop-blur-md whitespace-nowrap" style={{ borderColor: 'rgba(0,229,255,0.5)', background: 'rgba(0,0,0,0.9)', color: '#00e5ff', boxShadow: '0 0 20px rgba(0,229,255,0.3)' }}>
          {toast}
        </div>
      )}

      {titleToast && (
        <div className="fixed left-1/2 top-1/3 z-[55] -translate-x-1/2 rounded-2xl border border-neon/40 bg-black/90 px-6 py-4 text-center backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}>
          <p className="text-xs font-black text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.5)' }}>🏅 НОВОЕ ЗВАНИЕ</p>
          <p className="mt-1 text-sm font-extrabold text-ink">{getTitle(myTitleLevel)}</p>
        </div>
      )}

      {/* WHO ARE YOU modal */}
      {whoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fadeIn" onClick={() => { if (myName) setWhoOpen(false) }}>
          <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl border border-neon/25 bg-card p-5 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">КТО ТЫ?</h2>
              {myName && <button onClick={() => setWhoOpen(false)} className="text-ink-muted"><X size={19} /></button>}
            </div>
            <p className="mb-3 text-xs text-ink-muted">Выбери своё ФИО из списка</p>

            <div className="mb-3 flex h-10 items-center rounded-lg border border-line bg-input px-3">
              <Search size={16} color="#8b92a3" />
              <input
                value={whoSearch}
                onChange={(e) => setWhoSearch(e.target.value)}
                placeholder="Поиск ФИО..."
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {whoSearch && <button onClick={() => setWhoSearch('')} className="text-ink-muted"><X size={15} /></button>}
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {whoFiltered.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">Ничего не найдено</p>
              ) : whoFiltered.map((w) => (
                <button
                  key={w.name}
                  onClick={() => pickName(w.name)}
                  className={`block w-full rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition-colors active:scale-[0.98] ${myName === w.name ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line bg-input/50 text-ink hover:bg-neon/5'}`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 animate-fadeIn" onClick={() => setAdminOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-neon/25 bg-card/80 p-6 backdrop-blur-md animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAdminOpen(false)} className="absolute right-4 top-4 text-ink-muted"><X size={19} /></button>

            {!isAdmin ? (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10"><LockKeyhole size={22} color="#00e5ff" /></div>
                <h2 className="text-xl font-extrabold text-ink">Админ-доступ</h2>
                <p className="mt-1 text-sm text-ink-muted">Введите пароль для управления значениями</p>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAdminPassword()}
                  placeholder="Пароль"
                  inputMode="numeric"
                  className="mt-4 h-12 w-full rounded-xl border border-line bg-input px-4 py-3 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
                />
                {adminError && <p className="mt-2 text-xs text-error">{adminError}</p>}
                <button onClick={submitAdminPassword} className="mt-4 h-12 w-full rounded-xl bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95">Войти</button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>Управление значениями</h2>
                <p className="mt-1 text-sm text-ink-muted">Выбери сотрудника и выставь любые значения</p>

                <div className="relative mb-3 mt-4">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border-2 border-neon/40 bg-black/60 px-4 py-3 text-left transition-all duration-200 hover:border-neon/60"
                    style={{ boxShadow: '0 0 12px rgba(0,229,255,0.15)' }}
                  >
                    <span className={`text-sm font-bold ${adminWorker ? 'text-ink' : 'text-ink-faint'}`}>{adminWorker || 'Выбери сотрудника...'}</span>
                    <ChevronDown size={18} className={`shrink-0 text-neon transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-neon/40 bg-black/95 py-1 backdrop-blur-md" style={{ boxShadow: '0 8px 30px rgba(0,229,255,0.2)' }}>
                      {workers.map((w) => (
                        <button
                          key={w.name}
                          onClick={() => { setAdminWorker(w.name); setDropdownOpen(false) }}
                          className={`block w-full px-4 py-2 text-left text-sm font-bold transition-colors hover:bg-neon/10 ${adminWorker === w.name ? 'text-neon' : 'text-ink'}`}
                        >
                          {w.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {adminWorker && (
                  <>
                    <div className="mb-3 space-y-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-ink-faint">⚖️ Вес (кг)</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjustAdminValue('weight', -1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/40 bg-black/50 text-sm font-black text-red-400 active:scale-90">−</button>
                          <input type="number" value={adminWeight} onChange={(e) => setAdminWeight(e.target.value)} placeholder={`${stats[adminWorker]?.weight ?? 0}`} className="h-9 w-full rounded-lg border border-line bg-input px-3 text-sm font-bold text-ink outline-none focus:border-neon/50" />
                          <button onClick={() => adjustAdminValue('weight', 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-green-400/40 bg-black/50 text-sm font-black text-green-400 active:scale-90">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-ink-faint">❤️ Счастье</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjustAdminValue('happiness', -1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/40 bg-black/50 text-sm font-black text-red-400 active:scale-90">−</button>
                          <input type="number" value={adminHappiness} onChange={(e) => setAdminHappiness(e.target.value)} placeholder={`${stats[adminWorker]?.happiness ?? 0}`} className="h-9 w-full rounded-lg border border-line bg-input px-3 text-sm font-bold text-ink outline-none focus:border-neon/50" />
                          <button onClick={() => adjustAdminValue('happiness', 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-green-400/40 bg-black/50 text-sm font-black text-green-400 active:scale-90">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-ink-faint">💵 Баланс (₽)</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => adjustAdminValue('balance', -100)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/40 bg-black/50 text-sm font-black text-red-400 active:scale-90">−</button>
                          <input type="number" value={adminBalance} onChange={(e) => setAdminBalance(e.target.value)} placeholder={`${stats[adminWorker]?.balance ?? 0}`} className="h-9 w-full rounded-lg border border-line bg-input px-3 text-sm font-bold text-ink outline-none focus:border-neon/50" />
                          <button onClick={() => adjustAdminValue('balance', 100)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-green-400/40 bg-black/50 text-sm font-black text-green-400 active:scale-90">+</button>
                        </div>
                      </div>
                    </div>

                    <button onClick={applyAdminEdit} className="h-12 w-full rounded-xl bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95">Применить значения</button>
                  </>
                )}

                <button onClick={() => { lock(); setAdminOpen(false) }} className="mt-3 w-full text-center text-xs font-bold text-ink-muted hover:text-error transition-colors">Выйти из админа</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
