import { useEffect, useRef, useState } from 'react'
import { Store, Backpack, RotateCcw, Gift, X, ChevronLeft, BookOpen, Heart } from 'lucide-react'

import { todayKey } from '../lib/storage'
import { getRoadWeights, type RoadEvent } from '../lib/levelData'
import {
  getCurrentPlayerName,
  setCurrentPlayerName,
  getPlayerData,
  savePlayerData,
  resetPlayerData,
  buyItem,
  getGameStats,
  SHOP_ITEMS,
  getShopItem,
  REWARD_INTERVAL_MS,
  DAILY_REWARDS,
  LUCKY_BOXES,
  MAX_LEVELS,
  type PlayerData,
  type GameStats,
} from '../lib/gameStorage'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function msUntilMidnight(): number {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  return tomorrow.getTime() - Date.now()
}

type Screen = 'main' | 'shop' | 'inventory' | 'game'

type CombatStage = 'intro' | 'fight' | 'victory' | 'defeat' | 'radio_list' | null

type CombatState = {
  enemyName: string
  enemyIcon: string
  enemyTaunt: string
  enemyHp: number
  playerHp: number
  stage: CombatStage
  log: string[]
  abilitiesUsed: { raciya: boolean; naruchniki: boolean; palka: boolean }
  busy: boolean
}

const ENEMIES = [
  { name: 'Досмотровое зеркало', icon: '🪞', taunt: 'Я досмотрю твоё днище!' },
  { name: 'Буханка (УАЗ)', icon: '🚐', taunt: 'Получи путёлку в ад!' },
  { name: 'Очколуп', icon: '🔍', taunt: 'Я вижу тебя насквозь!' },
  { name: 'Бобок', icon: '🦠', taunt: 'Я отправлю тебя в медпункт!' },
  { name: 'Пиотрович', icon: '🧔', taunt: 'Не называй меня Петровичем!' },
  { name: 'Опанасенко', icon: '🚜', taunt: 'Я тебя перееду!' },
  { name: 'Ортяков старший', icon: '👴', taunt: 'Во!' },
  { name: 'Туалет на двойке', icon: '🚽', taunt: 'Я никогда тебя не прощу!' },
  { name: 'Кровать в спальне', icon: '🛏️', taunt: 'Щас ты вырубишься!' },
  { name: 'Золоотвал', icon: '🏭', taunt: 'Ты зашёл слишком далеко!' },
  { name: 'Огнетушитель', icon: '🧯', taunt: 'Я тебя потушу!' },
]

const PLAYER_ATTACKS = [
  { id: 'hand', icon: '👊', name: 'Рука', chance: 0.70, damage: 2 },
  { id: 'leg', icon: '🦵', name: 'Нога', chance: 0.60, damage: 3 },
  { id: 'head', icon: '🤪', name: 'Голова', chance: 0.40, damage: 4 },
  { id: 'spit', icon: '💦', name: 'Плюнуть', chance: 0.80, damage: 1 },
  { id: 'bite', icon: '🦷', name: 'Укусить', chance: 0.20, damage: 5 },
]

const MAX_COMBAT_HP = 5

type BossStage = 'fight' | 'victory' | 'defeat' | null

type BossCombatState = {
  name: string
  icon: string
  icon2: string | null
  taunt: string
  isDouble: boolean
  bossHp: number
  bossMaxHp: number
  playerHp: number
  stage: BossStage
  log: string[]
  abilitiesUsed: { dream: boolean; shot: boolean; insult: boolean; vigilance: boolean; article: boolean }
  vigilanceMisses: number
  sleepSkips: number
  extraTurns: number
  busy: boolean
}

const FINAL_BOSSES = [
  { name: 'Жвакина', icon: '👹', icon2: null, taunt: 'Ты слишком плох как сотрудник, чтобы стоять со мной рядом!', isDouble: false, hp: 10, weight: 45 },
  { name: 'Шинкоренко', icon: '😈', icon2: null, taunt: 'Опять буксуешь? Я тебя щас УВОЛЮ!!!', isDouble: false, hp: 10, weight: 45 },
  { name: 'Жвакина И Шинкоренко', icon: '👹', icon2: '😈', taunt: 'ВМЕСТЕ МЫ СИЛА! ТЕБЕ НЕ УЙТИ ОТСЮДА!', isDouble: true, hp: 12, weight: 10 },
]

const BOSS_ABILITIES = [
  { id: 'dream', icon: '😴', name: 'Дремануть' },
  { id: 'shot', icon: '🔫', name: 'Выстрел вверх' },
  { id: 'insult', icon: '🤬', name: 'Оскорбить' },
  { id: 'vigilance', icon: '👁️', name: 'Бдительность' },
  { id: 'article', icon: '📖', name: 'Утомить статьёй' },
]

export default function GamePanel({ onBack }: { onBack: () => void }) {
  const [playerName, setPlayerName] = useState<string | null>(getCurrentPlayerName())
  const [data, setData] = useState<PlayerData | null>(null)
  const [showSelect, setShowSelect] = useState(false)
  const [screen, setScreen] = useState<Screen>('main')
  const [now, setNow] = useState(Date.now())
  const [showDaily, setShowDaily] = useState(false)
  const [showLucky, setShowLucky] = useState(false)
  const [luckyBoxes, setLuckyBoxes] = useState<typeof LUCKY_BOXES | null>(null)
  const [luckyPicked, setLuckyPicked] = useState<number | null>(null)
  const [luckyRevealed, setLuckyRevealed] = useState<number | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [abilityPopup, setAbilityPopup] = useState<string | null>(null)
  const [showBossHelp, setShowBossHelp] = useState(false)

  // Journey state
  const [isJourneyActive, setIsJourneyActive] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [roadEvents, setRoadEvents] = useState<RoadEvent[]>([])
  const [levelIcon, setLevelIcon] = useState<string>('🌲')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionText, setTransitionText] = useState<string | null>(null)
  const [transitionSubtext, setTransitionSubtext] = useState<string | null>(null)
  const [transitionColor, setTransitionColor] = useState<string>('#00e5ff')
  const [encounteredTraveler, setEncounteredTraveler] = useState<string | null>(null)
  const [screenOpacity, setScreenOpacity] = useState(1)
  const [deathMessage, setDeathMessage] = useState<string | null>(null)
  const [luckToast, setLuckToast] = useState<string | null>(null)

  // Traveler encounter state
  type TravelerType = 'CAT' | 'WORKERS' | 'FEMALE' | 'MALE'
  type TravelerStage = 'intro' | 'choice' | 'result'
  type TravelerOutcome = 'short_path' | 'wrong_road' | 'death' | 'hallucination' | null
  const [encounter, setEncounter] = useState<{
    type: TravelerType
    icon: string
    name: string
    gender: 'м' | 'ж'
    stage: TravelerStage
    outcome: TravelerOutcome
  } | null>(null)

  // Journey item state
  const [showItemSelect, setShowItemSelect] = useState(false)
  const [selectedJourneyItems, setSelectedJourneyItems] = useState<string[]>([])
  const [revealedRoads, setRevealedRoads] = useState<Set<number>>(new Set())
  const [blockedRoads, setBlockedRoads] = useState<Set<number>>(new Set())
  const [shieldedRoads, setShieldedRoads] = useState<Set<number>>(new Set())
  const [binocularLevelsRemaining, setBinocularLevelsRemaining] = useState(0)
  const [shieldToast, setShieldToast] = useState<string | null>(null)

  // Combat state
  const [combat, setCombat] = useState<CombatState | null>(null)
  const [combatDisplay, setCombatDisplay] = useState<{
    turn: 'player' | 'enemy' | null
    icon: string
    result: 'hit' | 'miss' | 'ability' | 'defeat' | null
    title: string
    subtitle: string
    damageTo: 'enemy' | 'player' | 'both' | null
    damageAmount: number | null
  } | null>(null)
  const [enemyFlash, setEnemyFlash] = useState(false)
  const [playerFlash, setPlayerFlash] = useState(false)
  const [showCombatHelp, setShowCombatHelp] = useState(false)
  const [battleLog, setBattleLog] = useState<{
    id: number
    icon: string
    text: string
    color: 'green' | 'red' | 'gray' | 'cyan' | 'gold'
  }[]>([])
  const battleLogRef = useRef<HTMLDivElement | null>(null)
  const battleLogIdRef = useRef(0)
  const addBattleLogEntry = (icon: string, text: string, color: 'green' | 'red' | 'gray' | 'cyan' | 'gold'): void => {
    const entry = { id: battleLogIdRef.current++, icon, text, color }
    setBattleLog((prev) => [...prev, entry])
  }
  const [ambushFlash, setAmbushFlash] = useState(false)
  const [bossCombat, setBossCombat] = useState<BossCombatState | null>(null)
  const [bossCombatDisplay, setBossCombatDisplay] = useState<{
    turn: 'player' | 'enemy' | null
    icon: string
    result: 'hit' | 'miss' | 'ability' | 'defeat' | null
    title: string
    subtitle: string
    damageTo: 'enemy' | 'player' | 'both' | null
    damageAmount: number | null
  } | null>(null)
  const [bossEnemyFlash, setBossEnemyFlash] = useState(false)
  const [bossPlayerFlash, setBossPlayerFlash] = useState(false)
  const [bossBattleLog, setBossBattleLog] = useState<{
    id: number
    icon: string
    text: string
    color: 'green' | 'red' | 'gray' | 'cyan' | 'gold'
  }[]>([])
  const bossBattleLogRef = useRef<HTMLDivElement | null>(null)
  const bossBattleLogIdRef = useRef(0)
  const addBossBattleLogEntry = (icon: string, text: string, color: 'green' | 'red' | 'gray' | 'cyan' | 'gold'): void => {
    const entry = { id: bossBattleLogIdRef.current++, icon, text, color }
    setBossBattleLog((prev) => [...prev, entry])
  }
  const [finalBossFlash, setFinalBossFlash] = useState(false)
  const [journeyComplete, setJourneyComplete] = useState(false)
  const [showVictoryScreen, setShowVictoryScreen] = useState(false)
  const [chestOpened, setChestOpened] = useState(false)
  const [chestOpening, setChestOpening] = useState(false)
  const [chestRewards, setChestRewards] = useState<{ items: typeof SHOP_ITEMS } | null>(null)
  const chestOpenedRef = useRef(false)

  const [rareEvent, setRareEvent] = useState<{
    type: 'tower' | 'tormozok' | 'rosguard' | 'balok'
    stage: 'intro' | 'tower_select' | 'tower_reveal' | 'tormozok_result' | 'rosguard_result' | 'balok_result'
    lines: string[]
    towerSelected: number[]
    towerRevealed: number[]
  } | null>(null)
  const rareEventCheckedRef = useRef<number>(-1)
  const highestLevelReachedThisRun = useRef<number>(1)
  const [checkpointLevel, setCheckpointLevel] = useState<number | null>(null)
  const [initialJourneyItems, setInitialJourneyItems] = useState<string[]>([])
  const [balokRevive, setBalokRevive] = useState(false)

  // Road visual labels + colors (purely cosmetic — do NOT affect hidden road values)
  const ROAD_LOCATIONS = ['Лес', 'Горы', 'Каньон', 'Топи', 'Озеро', 'Сады', 'Пещера', 'Пустошь', 'Тундра', 'Свалка']
  const ROAD_COLORS = [
    { name: '#00e5ff', glow: 'rgba(0,229,255,0.35)' },
    { name: '#a855f7', glow: 'rgba(168,85,247,0.35)' },
    { name: '#ff4444', glow: 'rgba(255,68,68,0.35)' },
    { name: '#39ff14', glow: 'rgba(57,255,20,0.35)' },
    { name: '#ff8800', glow: 'rgba(255,136,0,0.35)' },
    { name: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
    { name: '#ec4899', glow: 'rgba(236,72,153,0.35)' },
    { name: '#facc15', glow: 'rgba(250,204,21,0.35)' },
  ]
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const [roadLabels, setRoadLabels] = useState<string[]>(['Лес', 'Горы', 'Каньон', 'Топи'])
  const [roadColors, setRoadColors] = useState<{ name: string; glow: string }[]>([
    ROAD_COLORS[0], ROAD_COLORS[1], ROAD_COLORS[2], ROAD_COLORS[3],
  ])
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  const [godMode, setGodMode] = useState<boolean>(() => {
    try { return localStorage.getItem('amalgama_godMode') === 'true' } catch { return false }
  })
  const [showGodModal, setShowGodModal] = useState(false)
  const [godPasswordInput, setGodPasswordInput] = useState('')
  const [godPasswordError, setGodPasswordError] = useState(false)
  const [godToast, setGodToast] = useState<string | null>(null)

  useEffect(() => {
    if (!playerName) {
      setShowSelect(true)
      return
    }
    const d = getPlayerData(playerName)
    setData(d)
    setStats(getGameStats())
    const today = todayKey()
    if (d.dailyClaimedDate !== today) {
      setShowDaily(true)
    }
  }, [playerName])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight
    }
  }, [battleLog])

  useEffect(() => {
    if (bossBattleLogRef.current) {
      bossBattleLogRef.current.scrollTop = bossBattleLogRef.current.scrollHeight
    }
  }, [bossBattleLog])

  // Regenerate cosmetic road labels + colors whenever road events change
  useEffect(() => {
    if (!isJourneyActive || roadEvents.length === 0) return
    setRoadLabels(shuffleArray(ROAD_LOCATIONS).slice(0, 4))
    setRoadColors(shuffleArray(ROAD_COLORS).slice(0, 4))
  }, [roadEvents, isJourneyActive])

  const showToast = (msg: string, isError = false): void => {
    setToast(msg)
    setToastError(isError)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const update = (updater: (d: PlayerData) => PlayerData): void => {
    if (!playerName) return
    setData((prev) => {
      const base = prev ?? getPlayerData(playerName)
      const next = updater(base)
      savePlayerData(playerName, next)
      return next
    })
    setStats(getGameStats())
  }

  const awardXP = (newLevel: number): void => {
    const highest = highestLevelReachedThisRun.current
    if (newLevel <= highest) return
    const gained = newLevel - highest
    highestLevelReachedThisRun.current = newLevel
    update((d) => {
      const totalXP = d.playerXP + gained
      const levelsGained = Math.floor(totalXP / 20)
      return {
        ...d,
        playerXP: totalXP % 20,
        playerLevel: d.playerLevel + levelsGained,
      }
    })
  }

  const recordLuck = (success: boolean): void => {
    update((d) => ({
      ...d,
      luckAttempts: (d.luckAttempts ?? 0) + 1,
      luckSuccesses: (d.luckSuccesses ?? 0) + (success ? 1 : 0),
      luckFailures: (d.luckFailures ?? 0) + (success ? 0 : 1),
    }))
  }

  const handleSelectPlayer = (name: string): void => {
    setCurrentPlayerName(name)
    setPlayerName(name)
    setShowSelect(false)
  }

  const reward3hRemaining = data ? data.reward3hAt - now : 0
  const reward3hReady = reward3hRemaining <= 0

  const claim3hReward = (): void => {
    if (!reward3hReady) return
    update((d) => ({ ...d, coins: d.coins + 2, reward3hAt: Date.now() + REWARD_INTERVAL_MS }))
    showToast('+2 🪙')
  }

  const claimDaily = (): void => {
    if (!data) return
    const today = todayKey()
    if (data.dailyClaimedDate === today) return
    const reward = DAILY_REWARDS[data.dailyDay - 1] ?? DAILY_REWARDS[0]
    const nextDay = data.dailyDay >= 7 ? 1 : data.dailyDay + 1
    update((d) => ({ ...d, coins: d.coins + reward, dailyDay: nextDay, dailyClaimedDate: today }))
    setShowDaily(false)
    showToast(`+${reward} 🪙`)
  }

  const openLucky = (): void => {
    if (!data) return
    if (data.luckyDate === todayKey()) return
    setLuckyBoxes(shuffle(LUCKY_BOXES))
    setLuckyPicked(null)
    setLuckyRevealed(null)
    setShowLucky(true)
  }

  const pickBox = (boxId: number): void => {
    if (luckyPicked !== null || !luckyBoxes) return
    const box = luckyBoxes.find((b) => b.id === boxId)!
    setLuckyPicked(boxId)
    setLuckyRevealed(boxId)
    if (box.coins > 0) {
      update((d) => ({ ...d, coins: d.coins + box.coins }))
      showToast(`+${box.coins} 🪙`)
    } else {
      showToast('Пусто')
    }
    update((d) => ({ ...d, luckyDate: todayKey() }))
  }

  const handleReset = (): void => {
    if (!playerName) return
    resetPlayerData(playerName)
    setData(getPlayerData(playerName))
    setStats(getGameStats())
    setShowReset(false)
    showToast('Прогресс сброшен')
  }

  const handleBuy = (itemId: string): void => {
    if (!playerName) return
    if (godMode) {
      update((d) => ({ ...d, inventory: { ...d.inventory, [itemId]: (d.inventory[itemId] ?? 0) + 1 } }))
      const item = getShopItem(itemId)
      showToast(item ? `Куплено: ${item.name}` : 'Куплено')
      return
    }
    const result = buyItem(playerName, itemId)
    if (result.success) {
      setData(getPlayerData(playerName))
      setStats(getGameStats())
      showToast(result.message)
    } else {
      showToast(result.message, true)
    }
  }

  const consumeJourneyItem = (itemId: string): void => {
    setSelectedJourneyItems((prev) => {
      const idx = prev.indexOf(itemId)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1)
      return next
    })
    if (!godMode) {
      update((d) => {
        const inv = { ...d.inventory }
        inv[itemId] = (inv[itemId] ?? 0) - 1
        if (inv[itemId] <= 0) delete inv[itemId]
        return { ...d, inventory: inv }
      })
    }
  }

  const getJourneyItemCounts = (): Record<string, number> => {
    const counts: Record<string, number> = {}
    for (const id of selectedJourneyItems) {
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }

  const hasJourneyItem = (itemId: string): boolean => {
    return selectedJourneyItems.includes(itemId)
  }

  const activateKey = (): void => {
    if (isTransitioning || !isJourneyActive) return
    if (!hasJourneyItem('key_doubleka') && !godMode) return
    setRevealedRoads((prev) => new Set(prev).add(1))
    if (!godMode) consumeJourneyItem('key_doubleka')
  }

  const activateBushido = (): void => {
    if (isTransitioning || !isJourneyActive) return
    if (!hasJourneyItem('bushido_pink') && !godMode) return
    setRevealedRoads((prev) => new Set(prev).add(0).add(3))
    if (!godMode) consumeJourneyItem('bushido_pink')
  }

  const activateBinocular = (): void => {
    if (isTransitioning || !isJourneyActive) return
    if (!hasJourneyItem('binokl') && !godMode) return
    setBinocularLevelsRemaining(3)
    if (!godMode) consumeJourneyItem('binokl')
  }

  const tryDeathProtection = (): boolean => {
    const priority = ['bronozhilet', 'kaska', 'otrazhaying_zhilet']
    for (const itemId of priority) {
      if (hasJourneyItem(itemId)) {
        if (itemId === 'bronozhilet') {
          consumeJourneyItem(itemId)
          return true
        }
        if (itemId === 'kaska') {
          consumeJourneyItem(itemId)
          const ok = Math.random() < 0.5
          recordLuck(ok)
          return ok
        }
        if (itemId === 'otrazhaying_zhilet') {
          consumeJourneyItem(itemId)
          const ok = Math.random() < 0.25
          recordLuck(ok)
          return ok
        }
      }
    }
    return false
  }

  const generateRoadEvents = (level: number): RoadEvent[] => {
    const weights = getRoadWeights(level)
    const entries: [RoadEvent, number][] = [
      ['FORWARD', weights.FORWARD],
      ['TRAVELER', weights.TRAVELER],
      ['BACK', weights.BACK],
      ['DEATH', weights.DEATH],
    ]
    const total = entries.reduce((sum, [, w]) => sum + w, 0)
    const events: RoadEvent[] = []
    for (let i = 0; i < 4; i++) {
      let roll = Math.random() * total
      for (const [event, w] of entries) {
        roll -= w
        if (roll < 0) {
          events.push(event)
          break
        }
      }
    }
    if (!events.includes('FORWARD')) {
      events[Math.floor(Math.random() * 4)] = 'FORWARD'
    }
    return events
  }

  const roadEventLabel = (event: RoadEvent): string => {
    switch (event) {
      case 'FORWARD': return 'ВПЕРЁД'
      case 'BACK': return 'НАЗАД'
      case 'TRAVELER': return 'ПУТНИК'
      case 'DEATH': return 'СМЕРТЬ'
    }
  }

  const roadEventColor = (event: RoadEvent): string => {
    switch (event) {
      case 'FORWARD': return '#39ff14'
      case 'BACK': return '#facc15'
      case 'TRAVELER': return '#00e5ff'
      case 'DEATH': return '#ff4444'
    }
  }

  const handleHeartClick = (): void => {
    setGodPasswordInput('')
    setGodPasswordError(false)
    setShowGodModal(true)
  }

  const handleGodSubmit = (): void => {
    if (godPasswordInput === '30103') {
      setGodMode(true)
      try { localStorage.setItem('amalgama_godMode', 'true') } catch { /* ignore */ }
      setShowGodModal(false)
      setGodToast('РЕЖИМ БОГА АКТИВИРОВАН')
      setTimeout(() => setGodToast(null), 2200)
    } else {
      setGodPasswordError(true)
    }
  }

  const handleGodToggleOff = (): void => {
    setGodMode(false)
    try { localStorage.removeItem('amalgama_godMode') } catch { /* ignore */ }
    setShowGodModal(false)
  }

  const startJourney = (): void => {
    if (!playerName) return
    setSelectedJourneyItems([])
    setRevealedRoads(new Set())
    setBlockedRoads(new Set())
    setShieldedRoads(new Set())
    setBinocularLevelsRemaining(0)
    setShieldToast(null)
    setCombat(null)
    setAmbushFlash(false)
    setBossCombat(null)
    setFinalBossFlash(false)
    setJourneyComplete(false)
    setRareEvent(null)
    rareEventCheckedRef.current = -1
    setCheckpointLevel(null)
    setBalokRevive(false)
    setShowItemSelect(true)
  }

  const beginJourneyWithItems = (): void => {
    if (!playerName) return
    update((d) => ({ ...d, runs: d.runs + 1 }))
    highestLevelReachedThisRun.current = 1
    setEncounteredTraveler(null)
    setEncounter(null)
    setTransitionText(null)
    setTransitionSubtext(null)
    setDeathMessage(null)
    setIsTransitioning(false)
    setScreenOpacity(1)
    setLuckToast(null)
    setRevealedRoads(new Set())
    setBlockedRoads(new Set())
    setShieldedRoads(new Set())
    setBinocularLevelsRemaining(0)
    setShieldToast(null)
    setCurrentLevel(1)
    setLevelIcon(pickLevelIcon())
    setRoadEvents(generateRoadEvents(1))
    setShowItemSelect(false)
    setIsJourneyActive(true)
    setScreen('game')
    setInitialJourneyItems([...selectedJourneyItems])
  }

  const endJourney = (): void => {
    setIsJourneyActive(false)
    setCurrentLevel(1)
    setRoadEvents([])
    setEncounteredTraveler(null)
    setEncounter(null)
    setTransitionText(null)
    setTransitionSubtext(null)
    setDeathMessage(null)
    setIsTransitioning(false)
    setScreenOpacity(1)
    setSelectedJourneyItems([])
    setRevealedRoads(new Set())
    setBlockedRoads(new Set())
    setShieldedRoads(new Set())
    setBinocularLevelsRemaining(0)
    setShieldToast(null)
    setCombat(null)
    setAmbushFlash(false)
    setBossCombat(null)
    setFinalBossFlash(false)
    setJourneyComplete(false)
    setShowVictoryScreen(false)
    setChestOpened(false)
    setChestOpening(false)
    setChestRewards(null)
    chestOpenedRef.current = false
    setRareEvent(null)
    rareEventCheckedRef.current = -1
    setCheckpointLevel(null)
    setBalokRevive(false)
    setScreen('main')
    setLuckToast('Повезёт в следующий раз...')
    setTimeout(() => setLuckToast(null), 2000)
  }

  const abandonJourney = (): void => {
    setShowQuitConfirm(false)
    setIsJourneyActive(false)
    setCurrentLevel(1)
    setRoadEvents([])
    setEncounteredTraveler(null)
    setEncounter(null)
    setTransitionText(null)
    setTransitionSubtext(null)
    setDeathMessage(null)
    setIsTransitioning(false)
    setScreenOpacity(1)
    setSelectedJourneyItems([])
    setRevealedRoads(new Set())
    setBlockedRoads(new Set())
    setShieldedRoads(new Set())
    setBinocularLevelsRemaining(0)
    setShieldToast(null)
    setCombat(null)
    setCombatDisplay(null)
    setAmbushFlash(false)
    setBossCombat(null)
    setBossCombatDisplay(null)
    setFinalBossFlash(false)
    setJourneyComplete(false)
    setShowVictoryScreen(false)
    setChestOpened(false)
    setChestOpening(false)
    setChestRewards(null)
    chestOpenedRef.current = false
    setRareEvent(null)
    rareEventCheckedRef.current = -1
    setCheckpointLevel(null)
    setBalokRevive(false)
    setScreen('main')
  }

  const LEVEL_ICONS = ['🌲', '🌫️', '🌑', '🕯️', '🪦', '🌀', '🌘', '🌲', '🌑', '🌫️', '🕯️', '🪦', '🌀', '🌘', '🌲', '🌫️', '🌑', '🕯️', '🪦', '🌀']

  const pickLevelIcon = (): string => {
    return LEVEL_ICONS[Math.floor(Math.random() * LEVEL_ICONS.length)]
  }

  // === COMBAT SYSTEM ===

  const maybeStartCombat = (onLevel: number): boolean => {
    if (Math.random() >= 0.20) return false
    const enemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)]
    setAmbushFlash(true)
    setIsTransitioning(true)
    setTransitionText('ЗАСАДА!')
    setTransitionSubtext(null)
    setScreenOpacity(0)
    setDeathMessage(null)

    setTimeout(() => {
      setAmbushFlash(false)
      setCombat({
        enemyName: enemy.name,
        enemyIcon: enemy.icon,
        enemyTaunt: enemy.taunt,
        enemyHp: MAX_COMBAT_HP,
        playerHp: MAX_COMBAT_HP,
        stage: 'fight',
        log: [enemy.taunt],
        abilitiesUsed: { raciya: false, naruchniki: false, palka: false },
        busy: false,
      })
      setTransitionText(null)
      setIsTransitioning(false)
      setScreenOpacity(1)
      setCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
      setBattleLog([])
      battleLogIdRef.current = 0
      addBattleLogEntry('⚔️', `Засада! ${enemy.name}`, 'gold')
    }, 1400)
    return true
  }

  const enemyTurn = (playerHp: number, enemyHp: number, log: string[]): void => {
    if (enemyHp <= 0) return
    setCombat((c) => c ? { ...c, busy: true } : c)
    setCombatDisplay({ turn: 'enemy', icon: '🧯', result: null, title: 'ХОД ПРОТИВНИКА', subtitle: '', damageTo: null, damageAmount: null })
    setTimeout(() => {
      const hit = Math.random() >= 0.50
      recordLuck(hit)
      if (!hit) {
        const newLog = [...log, 'ПРОМАХ']
        setCombat((c) => c ? { ...c, log: newLog, busy: true } : c)
        setCombatDisplay({ turn: 'enemy', icon: '💨', result: 'miss', title: 'ПРОТИВНИК ПРОМАХНУЛСЯ!', subtitle: 'Урон не получен', damageTo: null, damageAmount: null })
        addBattleLogEntry('🔥', `${combat?.enemyName ?? 'Враг'} — ПРОМАХ`, 'gray')
        setTimeout(() => {
          setCombat((c) => c ? { ...c, busy: false } : c)
          setCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
        }, 2000)
        return
      }
      const enemyHitMessages: Record<string, string[]> = {
  'Досмотровое зеркало': [
    'ТВОЯ ТОЧКА G ОСМОТРЕНА',
    'ПОЛУЧЕН ОСКОЛОК В ПЯТКУ',
    'ПРОСМОТР В РАЗБИТОЕ ЗЕРКАЛО',
    'ЗЕРКАЛЬНАЯ БОЛЕЗНЬ',
    'ПАЛКОЙ ПО ХРЕБТУ',
  ],

  'Буханка (УАЗ)': [
    'ТЕБЯ ПЕРЕЕХАЛИ',
    'В ТЕБЯ КИНУЛИ ПУТЁВКУ',
    'ТЕБЯ УВЕЗЛИ И ВЫКИНУЛИ',
    'ТЕБЯ НАПУГАЛИ ГУДКОМ',
    'ТЕБЯ ЗАЖЕВАЛО ДВОРНИКАМИ',
  ],

  'Очколуп': [
    'ТЕБЯ ВИДЯТ НАСКВОЗЬ',
    'ХОЛОДНЫЙ ВЗГЛЯД',
    'ОЧКО ЛУПИНДОРУ!',
    'ТЫ ОЧКОНУЛ',
    'ОЧКИ ВДАВИЛО В ПЕРЕНОСИЦУ',
  ],

  'Бобок': [
    'В ВАС КИНУЛИ РОЗОВУЮ ШЛЯПКУ',
    'ВАМ РАССКАЗАЛИ НЕСМЕШНУЮ ИСТОРИЮ',
    'ВАМ ПОСТАВИЛИ УКОЛ С ВОЗДУХОМ',
    'ВАМ СДЕЛАЛИ КЛИЗМУ',
    'ВАМ ДАЛИ ТАБЛЕТКУ ОТ ГРИППА',
  ],

  'Пиотрович': [
    'НА ВАС НАПАЛ ЗАМ И ШЛЁПНУЛ',
    'ВАМ ОТКЛЮЧИЛИ ГОРЯЧУЮ ВОДУ',
    'ВАС СБРОСИЛИ С ТРУБЫ ТЭЦ',
    'РАСПИСАЛСЯ НА ВАШЕМ ЛИЦЕ',
    'НАТРАВИЛ РАБОЧИХ НА ВАС',
  ],

  'Опанасенко': [
    'ВАС ДАВЯТ КОЛЁСА',
    'ВАС КИНУЛИ В БАГАЖНИК',
    'ПРИВЁЗ ВАЖНЫХ ДЯДЕК ДЛЯ УСТРАШЕНИЯ',
    'УДАР ПАТРИОТА',
    'УДАР В ДЫШЛО',
  ],

  'Ортяков старший': [
    'ПОКАЗАЛ ВАМ СВОЙ БАНАН',
    'КИНУЛ В ВАС ПЕЛЬМЕНЬ',
    'ГРОМКО КРИКНУЛ «ВО!»',
    'ОТРЫГНУЛ ВАМ В РОТ',
    'ЛЁГ НА ВАС И НЕ ВСТАЁТ',
  ],

  'Туалет на двойке': [
    'ШОКОЛАДНОЕ ИЗВЕРЖЕНИЕ',
    'ПОЦЕЛУЙ ПОСЕЙДОНА',
    'УДАР МОКРЫМ ОБОДКОМ',
    'БРОСОК ТУАЛЕТНОЙ БУМАГОЙ',
    'ВАС СМЫЛИ В КАНАЛИЗАЦИЮ',
  ],

  'Кровать в спальне': [
    'УКУС КЛОПА',
    'КРЫСА ЗАЛЕЗЛА В ТРУСЫ',
    'УДУШЕНИЕ ЗАСАЛЕННОЙ ПОДУШКОЙ',
    'ПРУЖИНА МАТРАСА ВПИЛАСЬ В БОЧИНУ',
    'ВЛАЖНЫЙ СОН СТАЛ ЯВЬЮ',
  ],

  'Золоотвал': [
    'ВАС ИЗБИЛИ СТРОИТЕЛИ',
    'НА ВАС УПАЛИ ВОРОТА',
    'МАШИНЫ ПРОЕХАЛИСЬ ПО ВАМ',
    'ПРО ВАС ЗАБЫЛИ',
    'ВАС СОЖРАЛА МОШКА',
  ],

  'Огнетушитель': [
    'ВАС ЗАЛИЛИ ПЕНОЙ',
    'СТРУЁЙ ПРЯМО В ЛИЦО',
    'БАЛЛОНОМ ПО БАШКЕ',
    'ЧЕКУ МЕТНУЛИ В ГЛАЗ',
    'ВАС ПОТУШИЛИ ОКОНЧАТЕЛЬНО',
  ],
}

const enemyMessages =
  enemyHitMessages[combat?.enemyName ?? ''] ?? ['ВАС АТАКОВАЛИ']

const enemyHitMessage =
  enemyMessages[Math.floor(Math.random() * enemyMessages.length)]
      const newPlayerHp = godMode ? playerHp : Math.max(0, playerHp - 1)
      const newLog = [...log, 'Враг бьёт! −1 ❤️']
      setPlayerFlash(true)
      setTimeout(() => setPlayerFlash(false), 500)
      if (newPlayerHp <= 0 && !godMode) {
        setCombat((c) => c ? { ...c, playerHp: 0, log: newLog, stage: 'defeat', busy: false } : c)
        setCombatDisplay({ turn: 'enemy', icon: '💥', result: 'defeat', title: 'ПРОТИВНИК ПОПАЛ!', subtitle: '−1 ❤️ ТЕБЕ', damageTo: 'player', damageAmount: 1 })
        addBattleLogEntry('🔥', `${combat?.enemyName ?? 'Враг'} — ПОПАДАНИЕ, −1 ❤️ тебе`, 'red')
        addBattleLogEntry('💀', 'Игрок повержен', 'red')
        handleDeath('Тебя одолели...')
      } else {
        setCombat((c) => c ? { ...c, playerHp: newPlayerHp, log: newLog, busy: true } : c)
        setCombatDisplay({
  turn: 'enemy',
  icon: '💥',
  result: 'hit',
  title: enemyHitMessage,
  subtitle: godMode ? '-1 ❤️ ОТМЕНЕНО' : '-1 ❤️ ЗДОРОВЬЕ',
  damageTo: 'player',
  damageAmount: 1
})
        addBattleLogEntry('🔥', `${combat?.enemyName ?? 'Враг'} — ПОПАДАНИЕ, −1 ❤️ тебе`, 'red')
        setTimeout(() => {
          setCombat((c) => c ? { ...c, busy: false } : c)
          setCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
        }, 2000)
      }
    }, 900)
  }

  const handlePlayerAttack = (attackId: string): void => {
    if (!combat || combat.stage !== 'fight' || combat.busy) return
    const attack = PLAYER_ATTACKS.find((a) => a.id === attackId)
    if (!attack) return
    setCombat((c) => c ? { ...c, busy: true } : c)
    setCombatDisplay({ turn: 'player', icon: attack.icon, result: null, title: 'ТВОЙ ХОД', subtitle: attack.name, damageTo: null, damageAmount: null })
    const hit = Math.random() < attack.chance
    recordLuck(hit)
    setTimeout(() => {
      if (!hit) {
        const newLog = [...combat.log, `${attack.name} — ПРОМАХ`]
        setCombat((c) => c ? { ...c, log: newLog, busy: true } : c)
        setCombatDisplay({ turn: 'player', icon: '💨', result: 'miss', title: 'ПРОМАХ!', subtitle: 'Ты не попал по противнику', damageTo: null, damageAmount: null })
        addBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПРОМАХ`, 'gray')
        setTimeout(() => {
  enemyTurn(combat.playerHp, combat.enemyHp, newLog)
}, 2000)
        return
      }
      const newEnemyHp = Math.max(0, combat.enemyHp - attack.damage)
      const newLog = [...combat.log, `${attack.icon} ${attack.name} — попадание! −${attack.damage} ❤️`]
      setEnemyFlash(true)
      setTimeout(() => setEnemyFlash(false), 500)
      if (newEnemyHp <= 0) {
        setCombat((c) => c ? { ...c, enemyHp: 0, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
        setCombatDisplay({ turn: 'player', icon: '💥', result: 'hit', title: 'ПОПАДАНИЕ!', subtitle: `−${attack.damage} ❤️ ВРАГУ`, damageTo: 'enemy', damageAmount: attack.damage })
        addBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПОПАДАНИЕ, −${attack.damage} ❤️ врагу`, 'green')
        addBattleLogEntry('🏆', `Победа над ${combat.enemyName}`, 'gold')
        return
      }
      setCombat((c) => c ? { ...c, enemyHp: newEnemyHp, log: newLog, busy: true } : c)
      setCombatDisplay({ turn: 'player', icon: '💥', result: 'hit', title: 'ПОПАДАНИЕ!', subtitle: `−${attack.damage} ❤️ ВРАГУ`, damageTo: 'enemy', damageAmount: attack.damage })
      addBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПОПАДАНИЕ, −${attack.damage} ❤️ врагу`, 'green')
setTimeout(() => {
  enemyTurn(
    combat.playerHp,
    newEnemyHp,
    newLog
  )
}, 2000)

}, 400)
  }

  const handleCombatVictoryContinue = (): void => {
    setCombat(null)
    setCombatDisplay(null)
    setRoadEvents(generateRoadEvents(currentLevel))
  }

  const handleRaciya = (): void => {
    if (!combat || combat.stage !== 'fight' || combat.busy) return
    if (combat.abilitiesUsed.raciya) return
    setCombat((c) => c ? { ...c, busy: true, abilitiesUsed: { ...c.abilitiesUsed, raciya: true }, stage: 'radio_list' } : c)
  }

  const handleRaciyaSelect = (selectedName: string): void => {
    if (!combat) return
    const roll = Math.random()
    let newPlayerHp = combat.playerHp
    let newEnemyHp = combat.enemyHp
    let msg = ''
    let displayTitle = ''
    let displaySub = ''
    let displayIcon = '📻'
    let displayDmgTo: 'enemy' | 'player' | 'both' | null = null
    let displayDmg: number | null = null
    let escaped = false
    let defeated = false

    const raciyaSuccess = roll >= 0.34 && roll < 0.77
    recordLuck(raciyaSuccess)

    if (roll < 0.34) {
      msg = `${selectedName} падает в обморок`
      displayTitle = 'РАЦИЯ'
      displaySub = `${selectedName} падает в обморок`
      addBattleLogEntry('📻', `Рация — ${selectedName} падает в обморок`, 'cyan')
    } else if (roll < 0.44) {
      msg = 'Беги, я возьму его на себя'
      escaped = true
      displayTitle = 'РАЦИЯ'
      displaySub = 'Беги, я возьму его на себя'
      addBattleLogEntry('📻', `Рация — ${selectedName}: «Беги, я возьму его»`, 'cyan')
    } else if (roll < 0.64) {
      newEnemyHp = Math.max(0, combat.enemyHp - 3)
      msg = `−3 ❤️ врагу. Дальше сам`
      displayTitle = 'РАЦИЯ'
      displaySub = `${selectedName} пришёл на помощь!`
      displayDmgTo = 'enemy'
      displayDmg = 3
      addBattleLogEntry('📻', `Рация — ${selectedName} пришёл на помощь, −3 ❤️ врагу`, 'cyan')
      if (newEnemyHp <= 0) defeated = true
    } else if (roll < 0.77) {
      msg = 'Предательство'
      displayTitle = 'РАЦИЯ — ПРЕДАТЕЛЬСТВО!'
      displaySub = '−1 ❤️ ТЕБЕ'
      displayDmgTo = 'player'
      displayDmg = 1
      addBattleLogEntry('📻', `Рация — «Предательство», −1 ❤️ тебе`, 'red')
      if (!godMode) newPlayerHp = Math.max(0, combat.playerHp - 1)
    } else {
      msg = 'Не понял, кто есть враг'
      newEnemyHp = Math.max(0, combat.enemyHp - 1)
      displayTitle = 'РАЦИЯ'
      displaySub = 'Не понял кто есть враг. Обоим −1 ❤️'
      displayDmgTo = 'both'
      displayDmg = 1
      addBattleLogEntry('📻', `Рация — «Не понял кто враг», −1 ❤️ обоим`, 'red')
      if (!godMode) newPlayerHp = Math.max(0, combat.playerHp - 1)
    }

    const newLog = [...combat.log, `304, нужна помощь → ${selectedName}`, msg]
    setAbilityPopup(msg)
setTimeout(() => setAbilityPopup(null), 5000)

    if (displayDmgTo === 'enemy' || displayDmgTo === 'both') {
      setEnemyFlash(true)
      setTimeout(() => setEnemyFlash(false), 500)
    }
    if (displayDmgTo === 'player' || displayDmgTo === 'both') {
      setPlayerFlash(true)
      setTimeout(() => setPlayerFlash(false), 500)
    }

    if (defeated) {
      setCombat((c) => c ? { ...c, enemyHp: 0, playerHp: newPlayerHp, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: displayIcon, result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('🏆', `Победа над ${combat.enemyName}`, 'gold')
      return
    }
    if (escaped) {
      setCombat((c) => c ? { ...c, log: newLog, busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: displayIcon, result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: null, damageAmount: null })
      setTimeout(() => {
        setCombat(null)
        setRoadEvents(generateRoadEvents(currentLevel))
      }, 1600)
      return
    }
    if (newPlayerHp <= 0 && !godMode) {
      setCombat((c) => c ? { ...c, playerHp: 0, log: newLog, stage: 'defeat', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: displayIcon, result: 'defeat', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('💀', 'Игрок повержен', 'red')
      handleDeath('Тебя одолели...')
      return
    }
    setCombat((c) => c ? { ...c, playerHp: newPlayerHp, enemyHp: newEnemyHp, log: newLog, stage: 'fight', busy: true } : c)
    setCombatDisplay({ turn: 'player', icon: displayIcon, result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
    enemyTurn(newPlayerHp, newEnemyHp, newLog)
  }

  const handleNaruchniki = (): void => {
    if (!combat || combat.stage !== 'fight' || combat.busy) return
    if (combat.abilitiesUsed.naruchniki) return
    setCombat((c) => c ? { ...c, busy: true, abilitiesUsed: { ...c.abilitiesUsed, naruchniki: true } } : c)
    const roll = Math.random()
    let newPlayerHp = combat.playerHp
    let newEnemyHp = combat.enemyHp
    let msg = ''
    let displayTitle = 'НАРУЧНИКИ'
    let displaySub = ''
    let displayDmgTo: 'enemy' | 'player' | 'both' | null = null
    let displayDmg: number | null = null
    let defeated = false

    const naruchnikiSuccess = roll < 0.10 || (roll >= 0.50 && roll < 0.70) || roll >= 0.70
    recordLuck(naruchnikiSuccess)

    if (roll < 0.10) {
      newEnemyHp = 0
      msg = 'Ты арестован!'
      displaySub = 'Ты арестован! Враг повержен!'
      displayDmgTo = 'enemy'
      displayDmg = combat.enemyHp
      addBattleLogEntry('⛓️', `Наручники — «Ты арестован!», враг повержен`, 'cyan')
      defeated = true
    } else if (roll < 0.20) {
      msg = 'Случайно надел на себя'
      displaySub = 'Случайно надел на себя. −1 ❤️ ТЕБЕ'
      displayDmgTo = 'player'
      displayDmg = 1
      addBattleLogEntry('⛓️', `Наручники — «Случайно надел на себя», −1 ❤️ тебе`, 'red')
      if (!godMode) newPlayerHp = Math.max(0, combat.playerHp - 1)
    } else if (roll < 0.50) {
      msg = 'Наручники не налезают'
      displaySub = 'Наручники не налезают'
      addBattleLogEntry('⛓️', `Наручники — «Не налезают», без эффекта`, 'gray')
    } else if (roll < 0.70) {
      newEnemyHp = Math.max(0, combat.enemyHp - 2)
      msg = 'Кинул наручники в лицо! −2 ❤️'
      displaySub = 'Кинул наручники в лицо! −2 ❤️ ВРАГУ'
      displayDmgTo = 'enemy'
      displayDmg = 2
      addBattleLogEntry('⛓️', `Наручники — «Кинул в лицо», −2 ❤️ врагу`, 'cyan')
      if (newEnemyHp <= 0) defeated = true
    } else {
      newEnemyHp = Math.max(0, combat.enemyHp - 1)
      if (!godMode) newPlayerHp = Math.max(0, combat.playerHp - 1)
      msg = 'Приковал себя и врага. Обоим −1 ❤️'
      displaySub = 'Приковал себя и врага. Обоим −1 ❤️'
      displayDmgTo = 'both'
      displayDmg = 1
      addBattleLogEntry('⛓️', `Наручники — «Приковал обоих», −1 ❤️ обоим`, 'red')
      if (newEnemyHp <= 0) defeated = true
    }

    const newLog = [...combat.log, msg]
    setAbilityPopup(msg)
setTimeout(() => setAbilityPopup(null), 5000)

    if (displayDmgTo === 'enemy' || displayDmgTo === 'both') {
      setEnemyFlash(true)
      setTimeout(() => setEnemyFlash(false), 500)
    }
    if (displayDmgTo === 'player' || displayDmgTo === 'both') {
      setPlayerFlash(true)
      setTimeout(() => setPlayerFlash(false), 500)
    }

    if (defeated) {
      setCombat((c) => c ? { ...c, enemyHp: 0, playerHp: newPlayerHp, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: '⛓️', result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('🏆', `Победа над ${combat.enemyName}`, 'gold')
      return
    }
    if (newPlayerHp <= 0 && !godMode) {
      setCombat((c) => c ? { ...c, playerHp: 0, log: newLog, stage: 'defeat', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: '⛓️', result: 'defeat', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('💀', 'Игрок повержен', 'red')
      handleDeath('Тебя одолели...')
      return
    }
    setCombat((c) => c ? { ...c, playerHp: newPlayerHp, enemyHp: newEnemyHp, log: newLog, busy: true } : c)
    setCombatDisplay({ turn: 'player', icon: '⛓️', result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
    enemyTurn(newPlayerHp, newEnemyHp, newLog)
  }

  const handlePalka = (): void => {
    if (!combat || combat.stage !== 'fight' || combat.busy) return
    if (combat.abilitiesUsed.palka) return
    setCombat((c) => c ? { ...c, busy: true, abilitiesUsed: { ...c.abilitiesUsed, palka: true } } : c)
    const roll = Math.random()
    let newPlayerHp = combat.playerHp
    let newEnemyHp = combat.enemyHp
    let msg = ''
    let displayTitle = 'ПАЛКА'
    let displaySub = ''
    let displayDmgTo: 'enemy' | 'player' | 'both' | null = null
    let displayDmg: number | null = null
    let defeated = false

    const palkaSuccess = roll < 0.10 || (roll >= 0.50 && roll < 0.70)
    recordLuck(palkaSuccess)

    if (roll < 0.10) {
      newEnemyHp = 0
      msg = 'Теперь месяц срать не сможет!'
      displaySub = 'Критический удар! Враг повержен!'
      displayDmgTo = 'enemy'
      displayDmg = combat.enemyHp
      addBattleLogEntry('🥢', `Палка — Крит! Враг повержен`, 'cyan')
      defeated = true
    } else if (roll < 0.30) {
      msg = 'Палка застряла в чехле'
      displaySub = 'Палка застряла в чехле'
      addBattleLogEntry('🥢', `Палка — «Застряла в чехле», без эффекта`, 'gray')
    } else if (roll < 0.50) {
      msg = 'Палка оказалась вялой'
      displaySub = 'Палка оказалась вялой'
      addBattleLogEntry('🥢', `Палка — «Оказалась вялой», без эффекта`, 'gray')
    } else if (roll < 0.70) {
      newEnemyHp = Math.max(0, combat.enemyHp - 2)
      msg = 'Кинул пару палок! −2 ❤️'
      displaySub = 'Кинул пару палок! −2 ❤️ ВРАГУ'
      displayDmgTo = 'enemy'
      displayDmg = 2
      addBattleLogEntry('🥢', `Палка — «Кинул пару палок», −2 ❤️ врагу`, 'cyan')
      if (newEnemyHp <= 0) defeated = true
    } else if (roll < 0.85) {
      msg = 'Враг отобрал палку'
      displaySub = 'Враг отобрал палку. −1 ❤️ ТЕБЕ'
      displayDmgTo = 'player'
      displayDmg = 1
      addBattleLogEntry('🥢', `Палка — «Враг отобрал», −1 ❤️ тебе`, 'red')
      if (!godMode) newPlayerHp = Math.max(0, combat.playerHp - 1)
    } else {
      msg = 'Палка рассыпалась в руках'
      displaySub = 'Палка рассыпалась в руках'
      addBattleLogEntry('🥢', `Палка — «Рассыпалась», без эффекта`, 'gray')
    }

    const newLog = [...combat.log, msg]
    setAbilityPopup(msg)
setTimeout(() => setAbilityPopup(null), 5000)

    if (displayDmgTo === 'enemy') {
      setEnemyFlash(true)
      setTimeout(() => setEnemyFlash(false), 500)
    }
    if (displayDmgTo === 'player') {
      setPlayerFlash(true)
      setTimeout(() => setPlayerFlash(false), 500)
    }

    if (defeated) {
      setCombat((c) => c ? { ...c, enemyHp: 0, playerHp: newPlayerHp, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: '🥢', result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('🏆', `Победа над ${combat.enemyName}`, 'gold')
      return
    }
    if (newPlayerHp <= 0 && !godMode) {
      setCombat((c) => c ? { ...c, playerHp: 0, log: newLog, stage: 'defeat', busy: false } : c)
      setCombatDisplay({ turn: 'player', icon: '🥢', result: 'defeat', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
      addBattleLogEntry('💀', 'Игрок повержен', 'red')
      handleDeath('Тебя одолели...')
      return
    }
    setCombat((c) => c ? { ...c, playerHp: newPlayerHp, enemyHp: newEnemyHp, log: newLog, busy: true } : c)
    setCombatDisplay({ turn: 'player', icon: '🥢', result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
    enemyTurn(newPlayerHp, newEnemyHp, newLog)
  }

  // === FINAL BOSS SYSTEM ===

  const pickFinalBoss = () => {
    const total = FINAL_BOSSES.reduce((s, b) => s + b.weight, 0)
    let roll = Math.random() * total
    for (const b of FINAL_BOSSES) {
      roll -= b.weight
      if (roll < 0) return b
    }
    return FINAL_BOSSES[0]
  }

  // === RARE EVENTS SYSTEM ===

  const maybeRareEvent = (onLevel: number): boolean => {
    if (rareEventCheckedRef.current === onLevel) return false
    rareEventCheckedRef.current = onLevel

    if (Math.random() >= 0.12) return false

    const roll = Math.floor(Math.random() * 4)
    let type: 'tower' | 'tormozok' | 'rosguard' | 'balok'
    if (roll === 0) type = 'tower'
    else if (roll === 1) type = 'tormozok'
    else if (roll === 2) type = 'rosguard'
    else type = 'balok'

    setRareEvent({ type, stage: 'intro', lines: [], towerSelected: [], towerRevealed: [] })
    return true
  }

  // --- Tower ---
  const handleTowerClick = (): void => {
    setRareEvent((e) => e ? { ...e, stage: 'tower_select', lines: ['Отсюда видно почти всё...'] } : e)
  }

  const handleTowerToggle = (roadIndex: number): void => {
    if (!rareEvent || rareEvent.stage !== 'tower_select') return
    const sel = rareEvent.towerSelected
    if (sel.includes(roadIndex)) {
      setRareEvent((e) => e ? { ...e, towerSelected: e.towerSelected.filter((r) => r !== roadIndex) } : e)
    } else if (sel.length < 3) {
      setRareEvent((e) => e ? { ...e, towerSelected: [...e.towerSelected, roadIndex] } : e)
    }
  }

  const handleTowerConfirm = (): void => {
    if (!rareEvent || rareEvent.towerSelected.length !== 3) return
    setRareEvent((e) => e ? { ...e, stage: 'tower_reveal' } : e)
  }

  // --- Tormozok ---
  const handleTormozokEat = (): void => {
    const success = Math.random() < 0.5
    recordLuck(success)
    if (success) {
      const usedItems = initialJourneyItems.filter((id) => !selectedJourneyItems.includes(id))
      const remaining = initialJourneyItems.filter((id) => selectedJourneyItems.includes(id))
      const restored = usedItems.length
      setSelectedJourneyItems([...remaining, ...usedItems])
      setRareEvent((e) => e ? { ...e, stage: 'tormozok_result', lines: ['ВОТ ЭТО ПОДКРЕПИЛСЯ!', restored > 0 ? `Восстановлено предметов: ${restored}` : 'Но использовать было нечего...'] } : e)
    } else {
      setRareEvent((e) => e ? { ...e, stage: 'tormozok_result', lines: ['Обычная еда. Ничего особенного...'] } : e)
    }
  }

  const handleTormozokSkip = (): void => {
    setRareEvent(null)
  }

  // --- Rosguard ---
  const handleRosguardYes = (): void => {
    setRareEvent((e) => e ? { ...e, stage: 'rosguard_result', lines: ['Отлично, до свидания.'] } : e)
  }

  const handleRosguardNo = (): void => {
    setRareEvent((e) => e ? { ...e, stage: 'rosguard_result', lines: ['На меня не надейся, я тут чисто отметиться.'] } : e)
  }

  // --- Balok ---
  const handleBalokYes = (): void => {
    setCheckpointLevel(currentLevel)
    setRareEvent((e) => e ? { ...e, stage: 'balok_result', lines: ['Немного отдыха не помешает...', 'Точка сохранения активирована.'] } : e)
  }

  const handleBalokNo = (): void => {
    setRareEvent(null)
  }

  const handleRareEventContinue = (): void => {
    setRareEvent(null)
  }

  // === DEATH HANDLING WITH CHECKPOINT ===

  const handleDeath = (deathMessage: string, secondMessage?: string): void => {
    if (checkpointLevel !== null && !balokRevive) {
      setBalokRevive(true)
      setCheckpointLevel(null)
      setCombat(null)
      setBossCombat(null)
      setEncounter(null)
      setEncounteredTraveler(null)
      setDeathMessage(null)
      setIsTransitioning(true)
      setScreenOpacity(0)
      setTransitionText(null)
      setTransitionSubtext(null)

      setTimeout(() => {
        setTransitionText('ЭТО БЫЛ ДУРНОЙ СОН...')
        setScreenOpacity(1)
      }, 800)

      setTimeout(() => {
        setTransitionText('🏚️')
        setTransitionSubtext('Загадочный балок...')
      }, 2000)

      setTimeout(() => {
        setCurrentLevel(checkpointLevel)
        setLevelIcon(pickLevelIcon())
        setRevealedRoads(new Set())
        setBlockedRoads(new Set())
        setShieldedRoads(new Set())
        setRoadEvents(generateRoadEvents(checkpointLevel))
        setTransitionText(null)
        setTransitionSubtext(null)
        setIsTransitioning(false)
        setScreenOpacity(1)
      }, 3500)
      return
    }

    setIsTransitioning(true)
    setScreenOpacity(0)
    setDeathMessage(deathMessage)
    if (secondMessage) {
      setTimeout(() => setDeathMessage(secondMessage), 1200)
    }
    setTimeout(() => endJourney(), 2800)
  }

  const maybeStartCombatOrBoss = (onLevel: number): void => {
    if (onLevel >= MAX_LEVELS) {
      const boss = pickFinalBoss()
      setFinalBossFlash(true)
      setIsTransitioning(true)
      setTransitionText('ПОСЛЕДНЕЕ ИСПЫТАНИЕ')
      setTransitionSubtext(null)
      setScreenOpacity(0)
      setDeathMessage(null)

      setTimeout(() => {
        setFinalBossFlash(false)
        setBossCombat({
          name: boss.name,
          icon: boss.icon,
          icon2: boss.icon2,
          taunt: boss.taunt,
          isDouble: boss.isDouble,
          bossHp: boss.hp,
          bossMaxHp: boss.hp,
          playerHp: MAX_COMBAT_HP,
          stage: 'fight',
          log: [boss.taunt],
          abilitiesUsed: { dream: false, shot: false, insult: false, vigilance: false, article: false },
          vigilanceMisses: 0,
          sleepSkips: 0,
          extraTurns: 0,
          busy: false,
        })
        setTransitionText(null)
        setIsTransitioning(false)
        setScreenOpacity(1)
        setBossCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ФИНАЛЬНЫЙ БОЙ', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
        setBossBattleLog([])
        bossBattleLogIdRef.current = 0
        addBossBattleLogEntry('⚔️', `Финальный бой: ${boss.name}`, 'gold')
      }, 2000)
      return
    }
    if (!maybeRareEvent(onLevel)) {
      maybeStartCombat(onLevel)
    }
  }

  const bossEnemyTurn = (playerHp: number, bossHp: number, log: string[], vigilanceMisses: number, sleepSkips: number): void => {
    if (bossHp <= 0) return
    const bossName = bossCombat?.name ?? 'Босс'
    if (sleepSkips > 0) {
      const newLog = [...log, 'Босс спит... пропуск хода']
      setBossCombat((c) => c ? { ...c, log: newLog, busy: false, sleepSkips: sleepSkips - 1 } : c)
      addBossBattleLogEntry('😴', `${bossName} спит — пропуск хода`, 'gray')
      setBossCombatDisplay({ turn: 'enemy', icon: '😴', result: 'miss', title: 'БОСС СПИТ', subtitle: 'Пропуск хода', damageTo: null, damageAmount: null })
      setTimeout(() => {
        setBossCombat((c) => c ? { ...c, busy: false } : c)
        setBossCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
      }, 2000)
      return
    }
    setBossCombat((c) => c ? { ...c, busy: true } : c)
    setBossCombatDisplay({ turn: 'enemy', icon: '🔥', result: null, title: 'ХОД БОССА', subtitle: '', damageTo: null, damageAmount: null })
    setTimeout(() => {
      let hit: boolean
      if (vigilanceMisses > 0) {
        hit = false
      } else {
        hit = Math.random() < 0.30
      }
      if (!hit) {
        const newLog = [...log, 'ПРОМАХ']
        const newVig = vigilanceMisses > 0 ? vigilanceMisses - 1 : 0
        setBossCombat((c) => c ? { ...c, log: newLog, busy: false, vigilanceMisses: newVig } : c)
        if (vigilanceMisses > 0) {
          setBossCombatDisplay({ turn: 'enemy', icon: '👁️', result: 'miss', title: 'БДИТЕЛЬНОСТЬ!', subtitle: `${bossName} — ПРОМАХ. Осталось: ${vigilanceMisses - 1}`, damageTo: null, damageAmount: null })
          addBossBattleLogEntry('👁️', `Бдительность: ${bossName} — ПРОМАХ. Осталось: ${vigilanceMisses - 1}`, 'cyan')
          if (vigilanceMisses - 1 === 0) {
            addBossBattleLogEntry('👁️', 'Эффект бдительности закончился', 'gray')
          }
        } else {
          setBossCombatDisplay({ turn: 'enemy', icon: '💨', result: 'miss', title: 'БОСС ПРОМАХНУЛСЯ!', subtitle: 'Урон не получен', damageTo: null, damageAmount: null })
          addBossBattleLogEntry(bossCombat?.icon ?? '👹', `${bossName} — ПРОМАХ`, 'gray')
        }
        setTimeout(() => {
          setBossCombat((c) => c ? { ...c, busy: false } : c)
          setBossCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
        }, 2000)
        return
      }
const bossHitMessages = [
  'ВАМ ВСАНДАЛИЛИ',
  'ВАС УДАРИЛИ ГРЯЗНОЙ ТРЯПКОЙ',
  'ВАМ ДАЛИ В ПАХ',
  'В ВАС КИНУЛИ ГРЯЗНУЮ КРУЖКУ',
  'ВАС ПРИДУШИЛИ ГАЛСТУКОМ',
  'ВАС ПОРЕЗАЛИ УДОСТОВЕРЕНИЕМ',
]

const bossHitMessage =
  bossHitMessages[Math.floor(Math.random() * bossHitMessages.length)]

const newPlayerHp = godMode ? playerHp : Math.max(0, playerHp - 1)
      const newLog = [...log, 'Босс бьёт! −1 ❤️']
      setBossPlayerFlash(true)
      setTimeout(() => setBossPlayerFlash(false), 500)
      if (newPlayerHp <= 0 && !godMode) {
        setBossCombat((c) => c ? { ...c, playerHp: 0, log: newLog, stage: 'defeat', busy: false } : c)
        setBossCombatDisplay({ turn: 'enemy', icon: '💥', result: 'defeat', title: 'БОСС ПОПАЛ!', subtitle: '−1 ❤️ ТЕБЕ', damageTo: 'player', damageAmount: 1 })
        addBossBattleLogEntry(bossCombat?.icon ?? '👹', `${bossName} — ПОПАДАНИЕ, −1 ❤️ тебе`, 'red')
        addBossBattleLogEntry('💀', 'Ты — 0 ❤️. ПОРАЖЕНИЕ', 'red')
        setIsTransitioning(true)
        handleDeath('Тебя одолели...')
      } else {
        setBossCombat((c) => c ? { ...c, playerHp: newPlayerHp, log: newLog, busy: true } : c)
setBossCombatDisplay({
  turn: 'enemy',
  icon: '💥',
  result: 'hit',
  title: bossHitMessage,
  subtitle: godMode ? '-1 ❤️ ОТМЕНЕНО' : '-1 ❤️ ЗДОРОВЬЕ',
  damageTo: 'player',
  damageAmount: 1
})
        if (godMode) {
          addBossBattleLogEntry(bossCombat?.icon ?? '👹', `${bossName} — ПОПАДАНИЕ`, 'red')
          addBossBattleLogEntry('🛡️', 'Режим Бога — урон отменён', 'gray')
        } else {
          addBossBattleLogEntry(bossCombat?.icon ?? '👹', `${bossName} — ПОПАДАНИЕ, −1 ❤️ тебе`, 'red')
        }
        setTimeout(() => {
          setBossCombat((c) => c ? { ...c, busy: false } : c)
          setBossCombatDisplay({ turn: 'player', icon: '👤', result: null, title: 'ТВОЙ ХОД', subtitle: 'Выбери действие', damageTo: null, damageAmount: null })
        }, 2000)
      }
    }, 900)
  }

  const handleBossAttack = (attackId: string): void => {
    if (!bossCombat || bossCombat.stage !== 'fight' || bossCombat.busy) return
    const attack = PLAYER_ATTACKS.find((a) => a.id === attackId)
    if (!attack) return
    setBossCombat((c) => c ? { ...c, busy: true } : c)
    setBossCombatDisplay({ turn: 'player', icon: attack.icon, result: null, title: 'ТВОЙ ХОД', subtitle: attack.name, damageTo: null, damageAmount: null })
    const hit = Math.random() < attack.chance
    recordLuck(hit)
    setTimeout(() => {
      if (!hit) {
        const newLog = [...bossCombat.log, `${attack.name} — ПРОМАХ`]
        setBossCombat((c) => c ? { ...c, log: newLog, busy: true } : c)
        setBossCombatDisplay({ turn: 'player', icon: '💨', result: 'miss', title: 'ПРОМАХ!', subtitle: 'Ты не попал по боссу', damageTo: null, damageAmount: null })
        addBossBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПРОМАХ`, 'gray')
setTimeout(() => {
  bossEnemyTurn(
    bossCombat.playerHp,
    bossCombat.bossHp,
    newLog,
    bossCombat.vigilanceMisses,
    bossCombat.sleepSkips
  )
}, 2000)
        return
      }
      const newBossHp = Math.max(0, bossCombat.bossHp - attack.damage)
      const newLog = [...bossCombat.log, `${attack.icon} ${attack.name} — попадание! −${attack.damage} ❤️`]
      setBossEnemyFlash(true)
      setTimeout(() => setBossEnemyFlash(false), 500)
      if (newBossHp <= 0) {
        setBossCombat((c) => c ? { ...c, bossHp: 0, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
        setBossCombatDisplay({ turn: 'player', icon: '💥', result: 'hit', title: 'ПОПАДАНИЕ!', subtitle: `−${attack.damage} ❤️ БОССУ`, damageTo: 'enemy', damageAmount: attack.damage })
        addBossBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПОПАДАНИЕ, −${attack.damage} ❤️ боссу`, 'green')
        addBossBattleLogEntry('💥', `${bossCombat.name} получает последний урон`, 'gold')
        addBossBattleLogEntry('🏆', `${bossCombat.name} — 0 ❤️. БОСС ПОБЕЖДЁН`, 'gold')
        return
      }
      setBossCombat((c) => c ? { ...c, bossHp: newBossHp, log: newLog, busy: true } : c)
      setBossCombatDisplay({ turn: 'player', icon: '💥', result: 'hit', title: 'ПОПАДАНИЕ!', subtitle: `−${attack.damage} ❤️ БОССУ`, damageTo: 'enemy', damageAmount: attack.damage })
      addBossBattleLogEntry(attack.icon, `Ты: ${attack.name} — ПОПАДАНИЕ, −${attack.damage} ❤️ боссу`, 'green')
      setTimeout(() => {
  bossEnemyTurn(
    bossCombat.playerHp,
    newBossHp,
    newLog,
    bossCombat.vigilanceMisses,
    bossCombat.sleepSkips
  )
}, 2000)
}, 400)
  }

  const handleBossAbility = (abilityId: string): void => {
    if (!bossCombat || bossCombat.stage !== 'fight' || bossCombat.busy) return
    const key = abilityId as keyof BossCombatState['abilitiesUsed']
    if (bossCombat.abilitiesUsed[key]) return
    setBossCombat((c) => c ? { ...c, busy: true, abilitiesUsed: { ...c.abilitiesUsed, [key]: true } } : c)
    const bossName = bossCombat.name

    setTimeout(() => {
      let newPlayerHp = bossCombat.playerHp
      let newBossHp = bossCombat.bossHp
      let newVig = bossCombat.vigilanceMisses
      let newSleep = bossCombat.sleepSkips
      let newExtra = bossCombat.extraTurns
      let msg = ''
      let defeated = false
      let skipBossTurn = false
      let displayTitle = ''
      let displaySub = ''
      let displayIcon = '✨'
      let displayDmgTo: 'enemy' | 'player' | 'both' | null = null
      let displayDmg: number | null = null

      if (abilityId === 'dream') {
        displayIcon = '😴'
        displayTitle = 'ДРЕМАНУТЬ'
        const dreamSuccess = Math.random() < 0.50
        recordLuck(dreamSuccess)
        if (dreamSuccess) {
          const healed = Math.min(MAX_COMBAT_HP, bossCombat.playerHp + 2) - bossCombat.playerHp
          newPlayerHp = Math.min(MAX_COMBAT_HP, bossCombat.playerHp + 2)
          msg = `Дремануть — восстановлено ${healed} ❤️ (${bossCombat.playerHp} → ${newPlayerHp})`
          displaySub = `УСПЕХ! +${healed} ❤️ ТЕБЕ`
          displayDmgTo = 'player'
          displayDmg = healed
          addBossBattleLogEntry('😴', `Дремануть — УСПЕХ, +${healed} ❤️ тебе`, 'green')
        } else {
          msg = 'Дремануть — не удалось уснуть'
          displaySub = 'НЕ ПОЛУЧИЛОСЬ'
          addBossBattleLogEntry('😴', 'Дремануть — НЕ ПОЛУЧИЛОСЬ', 'gray')
        }
      } else if (abilityId === 'shot') {
        displayIcon = '🔫'
        displayTitle = 'ВЫСТРЕЛ ВВЕРХ'
        const helper = workersList[Math.floor(Math.random() * workersList.length)]
        addBossBattleLogEntry('🔫', `Выстрел вверх — ${helper.name} пришёл на помощь`, 'cyan')
        const shotSuccess = Math.random() < 0.60
        recordLuck(shotSuccess)
        if (shotSuccess) {
          const dmg = Math.floor(Math.random() * 3) + 1
          newBossHp = Math.max(0, bossCombat.bossHp - dmg)
          msg = `${helper.name} ПРИШЁЛ НА ПОМОЩЬ! −${dmg} ❤️`
          displaySub = `${helper.name} наносит −${dmg} ❤️ БОССУ`
          displayDmgTo = 'enemy'
          displayDmg = dmg
          addBossBattleLogEntry('💥', `${helper.name} — −${dmg} ❤️ боссу`, 'green')
          if (newBossHp <= 0) defeated = true
        } else {
          msg = `${helper.name} ПРИШЁЛ НА ПОМОЩЬ! Но промахнулся...`
          displaySub = `${helper.name} не помог`
          addBossBattleLogEntry('🔫', `${helper.name} не помог — урона нет`, 'gray')
        }
      } else if (abilityId === 'insult') {
        displayIcon = '🤬'
        displayTitle = 'ОСКОРБИТЬ'
        const insultSuccess = Math.random() < 0.50
        recordLuck(insultSuccess)
        if (insultSuccess) {
          newBossHp = Math.max(0, bossCombat.bossHp - 2)
          msg = 'Оскорбить −2 ❤️'
          displaySub = 'УСПЕХ! −2 ❤️ БОССУ'
          displayDmgTo = 'enemy'
          displayDmg = 2
          addBossBattleLogEntry('🤬', 'Оскорбить — УСПЕХ, −2 ❤️ боссу', 'green')
          if (newBossHp <= 0) defeated = true
        } else {
          msg = 'Оскорбить — не сработало'
          displaySub = 'НЕ СРАБОТАЛО'
          addBossBattleLogEntry('🤬', 'Оскорбить — НЕ СРАБОТАЛО', 'gray')
        }
      } else if (abilityId === 'vigilance') {
        displayIcon = '👁️'
        displayTitle = 'БДИТЕЛЬНОСТЬ'
        const vigSuccess = Math.random() < 0.50
        recordLuck(vigSuccess)
        if (vigSuccess) {
          newVig = 2
          msg = 'БДИТЕЛЬНОСТЬ УСИЛЕНА — 2 промаха босса'
          displaySub = 'УСПЕХ! 2 промаха босса'
          addBossBattleLogEntry('👁️', 'Усилить бдительность — УСПЕХ. 2 промаха босса', 'cyan')
        } else {
          msg = 'Усилить бдительность — не сработало'
          displaySub = 'НЕ СРАБОТАЛО'
          addBossBattleLogEntry('👁️', 'Усилить бдительность — НЕ СРАБОТАЛО', 'gray')
        }
      } else if (abilityId === 'article') {
        displayIcon = '📖'
        displayTitle = 'УТОМИТЬ СТАТЬЁЙ'
        const articleSuccess = Math.random() < 0.50
        recordLuck(articleSuccess)
        if (articleSuccess) {
          newSleep = 2
          newExtra = 2
          msg = 'ПРОТИВНИК ЗАСНУЛ — 2 дополнительных хода'
          displaySub = `${bossName} уснула. +2 хода`
          skipBossTurn = true
          addBossBattleLogEntry('📖', `Утомить статьёй — УСПЕХ. ${bossName} уснула`, 'cyan')
          addBossBattleLogEntry('📖', 'Дополнительный ход 1 / 2', 'cyan')
        } else {
          msg = 'Утомить статьёй — не сработало'
          displaySub = 'НЕ СРАБОТАЛО'
          addBossBattleLogEntry('📖', 'Утомить статьёй — НЕ СРАБОТАЛО', 'gray')
        }
      }

      const newLog = [...bossCombat.log, msg]
      setAbilityPopup(msg)
setTimeout(() => setAbilityPopup(null), 5000)

      if (displayDmgTo === 'enemy') {
        setBossEnemyFlash(true)
        setTimeout(() => setBossEnemyFlash(false), 500)
      }
      if (displayDmgTo === 'player') {
        setBossPlayerFlash(true)
        setTimeout(() => setBossPlayerFlash(false), 500)
      }

      if (defeated) {
        setBossCombat((c) => c ? { ...c, bossHp: 0, playerHp: newPlayerHp, log: [...newLog, 'ПОБЕДА'], stage: 'victory', busy: false } : c)
        setBossCombatDisplay({ turn: 'player', icon: displayIcon, result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })
        addBossBattleLogEntry('💥', `${bossName} получает последний урон`, 'gold')
        addBossBattleLogEntry('🏆', `${bossName} — 0 ❤️. БОСС ПОБЕЖДЁН`, 'gold')
        return
      }

      setBossCombat((c) => c ? { ...c, playerHp: newPlayerHp, bossHp: newBossHp, log: newLog, vigilanceMisses: newVig, sleepSkips: newSleep, extraTurns: newExtra, busy: true } : c)
      setBossCombatDisplay({ turn: 'player', icon: displayIcon, result: 'ability', title: displayTitle, subtitle: displaySub, damageTo: displayDmgTo, damageAmount: displayDmg })

      if (skipBossTurn) {
  setTimeout(() => {
    setBossCombat((c) => c ? { ...c, busy: false } : c)

    setBossCombatDisplay({
      turn: 'player',
      icon: '👤',
      result: null,
      title: 'ТВОЙ ХОД',
      subtitle: 'Выбери действие',
      damageTo: null,
      damageAmount: null
    })
  }, 2000)

  return
}
      bossEnemyTurn(newPlayerHp, newBossHp, newLog, newVig, newSleep)
    }, 400)
  }

  const handleBossVictoryContinue = (): void => {
    setBossCombat(null)
    setBossCombatDisplay(null)
    chestOpenedRef.current = false
    setChestOpened(false)
    setChestOpening(false)
    const item1 = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)]
    const item2 = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)]
    setChestRewards({ items: [item1, item2] })
    setIsTransitioning(true)
    setTransitionText(null)
    setTransitionSubtext(null)
    setScreenOpacity(0)
    setDeathMessage(null)

    setTimeout(() => {
      setShowVictoryScreen(true)
      setIsTransitioning(false)
      setScreenOpacity(1)
    }, 1200)
  }

  const handleOpenChest = (): void => {
    if (chestOpenedRef.current || chestOpening) return
    chestOpenedRef.current = true
    setChestOpening(true)
    setTimeout(() => {
      setChestOpening(false)
      setChestOpened(true)
      if (!godMode && playerName && chestRewards) {
        update((d) => {
          const totalXP = d.playerXP + 20
          const levelsGained = Math.floor(totalXP / 20)
          const inv = { ...d.inventory }
          for (const item of chestRewards.items) {
            inv[item.id] = (inv[item.id] ?? 0) + 1
          }
          return {
            ...d,
            playerXP: totalXP % 20,
            playerLevel: d.playerLevel + levelsGained,
            coins: d.coins + 20,
            inventory: inv,
          }
        })
      }
    }, 1400)
  }

  const handleVictoryReturn = (): void => {
    setShowVictoryScreen(false)
    setChestOpened(false)
    setChestOpening(false)
    setChestRewards(null)
    chestOpenedRef.current = false
    if (!godMode && playerName) {
      update((d) => ({ ...d, completedRuns: d.completedRuns + 1 }))
    }
    endJourney()
  }

  const doTransition = (
    text: string,
    subtext: string | null,
    action: () => void,
    duration = 1600,
    color: string = '#00e5ff',
  ): void => {
    setIsTransitioning(true)
    setTransitionText(text)
    setTransitionSubtext(subtext)
    setTransitionColor(color)
    setScreenOpacity(0)

    setTimeout(() => {
      action()
      setScreenOpacity(1)
    }, 800)

    setTimeout(() => {
      setTransitionText(null)
      setTransitionSubtext(null)
      setIsTransitioning(false)
    }, duration)
  }

  const pickWorkerByGender = (gender: 'м' | 'ж'): string => {
    const pool = workersList.filter((w) => w.gender === gender && w.name !== playerName)
    if (pool.length === 0) {
      const fallback = workersList.filter((w) => w.gender === gender)
      if (fallback.length === 0) return playerName ?? ''
      return fallback[Math.floor(Math.random() * fallback.length)].name
    }
    return pool[Math.floor(Math.random() * pool.length)].name
  }

  const rollTravelerType = (): TravelerType => {
    const roll = Math.random()
    if (roll < 0.1) return 'CAT'
    if (roll < 0.2) return 'WORKERS'
    if (roll < 0.6) return 'FEMALE'
    return 'MALE'
  }

  const rollTrustOutcome = (): 'short_path' | 'wrong_road' | 'death' | 'hallucination' => {
    const roll = Math.floor(Math.random() * 4)
    const success = roll === 0
    recordLuck(success)
    if (roll === 0) return 'short_path'
    if (roll === 1) return 'wrong_road'
    if (roll === 2) return 'death'
    return 'hallucination'
  }

  const rollEscape = (): boolean => {
    const ok = Math.random() < 0.6
    recordLuck(ok)
    return ok
  }

  const startEncounter = (): void => {
    const type = rollTravelerType()
    let icon = ''
    let name = ''
    let gender: 'м' | 'ж' = 'м'

    if (type === 'CAT') {
      icon = '🐱'
      name = 'Белый котик'
      gender = 'м'
    } else if (type === 'WORKERS') {
      icon = '👷'
      name = 'Гастарбайтеры'
      gender = 'м'
    } else if (type === 'FEMALE') {
      icon = '👩'
      name = pickWorkerByGender('ж')
      gender = 'ж'
    } else {
      icon = '👨'
      name = pickWorkerByGender('м')
      gender = 'м'
    }

    doTransition(type === 'FEMALE' || type === 'MALE' ? `Вы встретили\n${name}` : '', null, () => {
      setEncounter({ type, icon, name, gender, stage: 'choice', outcome: null })
    }, 1800, '#ff8800')
  }

  const closeEncounterAndResume = (shuffleRoads = true, level?: number): void => {
    setEncounter(null)
    if (shuffleRoads) setRoadEvents(generateRoadEvents(level ?? currentLevel))
  }

  const handleCatChoice = (choice: 'coins' | 'advance'): void => {
    if (choice === 'coins') {
      update((d) => ({ ...d, coins: d.coins + 2 }))
      setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
      setTimeout(() => {
        doTransition('Котик поделился монетами', null, () => {
          closeEncounterAndResume()
        }, 1600)
      }, 100)
    } else {
      const maxLevel = MAX_LEVELS
      const nextLevel = Math.min(currentLevel + 1, maxLevel)
      setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
      setTimeout(() => {
        doTransition('↑ СЛЕДУЮЩИЙ УРОВЕНЬ', null, () => {
          setCurrentLevel(nextLevel)
          setLevelIcon(pickLevelIcon())
          if (playerName) {
            update((d) => ({ ...d, maxLevel: Math.max(d.maxLevel, nextLevel) }))
          }
          awardXP(nextLevel)
          closeEncounterAndResume(true, nextLevel)
          maybeStartCombatOrBoss(nextLevel)
        }, 1600, '#39ff14')
      }, 100)
    }
  }

  const handleWorkersPay = (): void => {
    if ((data?.coins ?? 0) < 2) return
    update((d) => ({ ...d, coins: d.coins - 2 }))
    setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
    setTimeout(() => {
      doTransition('Договорились...', null, () => {
        closeEncounterAndResume()
      }, 1600)
    }, 100)
  }

  const handleWorkersRun = (): void => {
    const escaped = rollEscape()
    setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
    if (escaped) {
      setTimeout(() => {
        doTransition('Удалось оторваться...', null, () => {
          closeEncounterAndResume()
        }, 1600)
      }, 100)
    } else {
      handleDeath('Тебя нахлобучили...', '...и отняли всё.')
    }
  }

  const handleTrustNo = (): void => {
    setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
    setTimeout(() => {
      doTransition('Лучше идти своей дорогой...', null, () => {
        closeEncounterAndResume()
      }, 1600)
    }, 100)
  }

  const handleTrustYes = (): void => {
    const outcome = rollTrustOutcome()
    setEncounter((e) => e ? { ...e, stage: 'result', outcome } : e)
    const maxLevel = MAX_LEVELS

    if (outcome === 'short_path') {
      const nextLevel = Math.min(currentLevel + 2, maxLevel)
      setTimeout(() => {
        doTransition('↑ КОРОТКИЙ ПУТЬ\n+2 УРОВНЯ ВПЕРЁД', null, () => {
          setCurrentLevel(nextLevel)
          setLevelIcon(pickLevelIcon())
          if (playerName) {
            update((d) => ({ ...d, maxLevel: Math.max(d.maxLevel, nextLevel) }))
          }
          awardXP(nextLevel)
          closeEncounterAndResume(true, nextLevel)
          maybeStartCombatOrBoss(nextLevel)
        }, 1600, '#39ff14')
      }, 100)
    } else if (outcome === 'wrong_road') {
      const prevLevel = Math.max(1, currentLevel - 1)
      setTimeout(() => {
        doTransition('↶ ВЫ ХОДИТЕ КРУГАМИ...\n−1 УРОВЕНЬ НАЗАД', null, () => {
          setCurrentLevel(prevLevel)
          closeEncounterAndResume(true, prevLevel)
        }, 1600, '#cc5533')
      }, 100)
    } else if (outcome === 'death') {
      handleDeath('Никому верить нельзя...')
    } else {
      setTimeout(() => {
        doTransition('Это была галлюцинация...', null, () => {
          closeEncounterAndResume()
        }, 1600)
      }, 100)
    }
  }

  const handleDubinka = (): void => {
    if (!encounter) return
    if (!hasJourneyItem('dubinka') && !godMode) return
    if (!godMode) consumeJourneyItem('dubinka')
    const success = Math.random() < 0.5
    recordLuck(success)
    setEncounter((e) => e ? { ...e, stage: 'result', outcome: null } : e)
    const maxLevel = MAX_LEVELS
    if (success) {
      const nextLevel = Math.min(currentLevel + 2, maxLevel)
      setTimeout(() => {
        doTransition('↑ КОРОТКИЙ ПУТЬ\n+2 УРОВНЯ ВПЕРЁД', null, () => {
          setCurrentLevel(nextLevel)
          setLevelIcon(pickLevelIcon())
          if (playerName) {
            update((d) => ({ ...d, maxLevel: Math.max(d.maxLevel, nextLevel) }))
          }
          awardXP(nextLevel)
          closeEncounterAndResume(true, nextLevel)
          maybeStartCombatOrBoss(nextLevel)
        }, 1600, '#39ff14')
      }, 100)
    } else {
      setTimeout(() => {
        doTransition('Не впечатлило...', null, () => {
          closeEncounterAndResume()
        }, 1600)
      }, 100)
    }
  }

  const handleRoadChoice = (buttonIndex: number): void => {
    if (isTransitioning || !isJourneyActive) return
    if (blockedRoads.has(buttonIndex)) return
    const event = roadEvents[buttonIndex]
    if (!event) return

    const clearRoadsAndShuffle = (): void => {
      setRevealedRoads(new Set())
      setBlockedRoads(new Set())
      setShieldedRoads(new Set())
      setRoadEvents(generateRoadEvents(currentLevel))
    }

    const transitionToNewLevel = (text: string, targetLevel: number, action: () => void, color: string = '#00e5ff'): void => {
      doTransition(text, null, () => {
        action()
        setRevealedRoads(new Set())
        setBlockedRoads(new Set())
        setShieldedRoads(new Set())
        if (binocularLevelsRemaining > 0) {
          setBinocularLevelsRemaining((n) => n - 1)
          setRevealedRoads(new Set([2]))
        }
        setRoadEvents(generateRoadEvents(targetLevel))
        maybeStartCombatOrBoss(targetLevel)
      }, 1600, color)
    }

    if (event === 'FORWARD') {
      if (currentLevel >= MAX_LEVELS) {
        doTransition('Путь дальше пока скрыт...', null, () => {
          clearRoadsAndShuffle()
        }, 1600)
        return
      }
      const nextLevel = currentLevel + 1
      transitionToNewLevel('↑ СЛЕДУЮЩИЙ УРОВЕНЬ', nextLevel, () => {
        setCurrentLevel(nextLevel)
        setLevelIcon(pickLevelIcon())
        if (playerName) {
          update((d) => ({ ...d, maxLevel: Math.max(d.maxLevel, nextLevel) }))
        }
        awardXP(nextLevel)
      }, '#39ff14')
    } else if (event === 'BACK') {
      if (currentLevel <= 1) {
        doTransition('Дальше назад уже некуда...', null, () => {
          setRevealedRoads(new Set())
          setBlockedRoads(new Set())
          setShieldedRoads(new Set())
          if (binocularLevelsRemaining > 0) {
            setBinocularLevelsRemaining((n) => n - 1)
            setRevealedRoads(new Set([2]))
          }
          setRoadEvents(generateRoadEvents(1))
        })
      } else {
        const prevLevel = currentLevel - 1
        transitionToNewLevel('↓ ШАГ НАЗАД', prevLevel, () => {
          setCurrentLevel(prevLevel)
          setLevelIcon(pickLevelIcon())
        }, '#cc5533')
      }
    } else if (event === 'TRAVELER') {
      setRevealedRoads(new Set())
      setBlockedRoads(new Set())
      setShieldedRoads(new Set())
      doTransition('👤 ПУТНИК', null, () => {
        startEncounter()
      }, 1600, '#ff8800')
    } else if (event === 'DEATH') {
      const protected_ = tryDeathProtection()
      if (protected_) {
        setShieldedRoads((prev) => new Set(prev).add(buttonIndex))
        setBlockedRoads((prev) => new Set(prev).add(buttonIndex))
        const msg = hasJourneyItem('bronozhilet') || godMode ? 'Бронежилет спас тебя' : 'Каска выдержала удар'
        setShieldToast(msg)
        setTimeout(() => setShieldToast(null), 2000)
        return
      }
      handleDeath('Вы заблудились...', '...и сошли с ума.')
    }
  }

  const dailyDone = data ? data.dailyClaimedDate === todayKey() : false
  const luckyDone = data ? data.luckyDate === todayKey() : false
  const midnightRemaining = msUntilMidnight()

  const panelStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,229,255,0.25)',
    boxShadow: '0 0 18px rgba(0,229,255,0.1)',
  }

  // Player selection modal
  if (showSelect) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn">
        <div className="w-full max-w-sm rounded-2xl p-6 animate-scaleIn" style={panelStyle}>
          <h2 className="text-center text-xl font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
            Кто ты?
          </h2>
          <p className="mt-2 text-center text-xs font-bold text-ink-faint">Выбери своё ФИО из списка сотрудников</p>
          <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {workersList.map((w) => (
              <button
                key={w.name}
                onClick={() => handleSelectPlayer(w.name)}
                className="block w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-left text-sm font-bold text-ink transition-all duration-150 hover:border-neon/40 hover:bg-neon/10 active:scale-95"
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Shop screen
  if (screen === 'shop') {
    return (
      <div className="relative z-10 px-5 pb-8 pt-3 animate-fadeIn">
        <button onClick={() => setScreen('main')} className="mb-3 flex items-center gap-1 text-sm font-bold text-white hover:text-neon transition-colors" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
          <ChevronLeft size={16} /> Назад
        </button>

        <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3" style={panelStyle}>
          <h2 className="text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
            Магазиньш
          </h2>
          <p className="text-sm font-black text-amber-300" style={{ textShadow: '0 0 6px rgba(255,215,0,0.5)' }}>
            {godMode ? <span style={{ color: '#ff2bd6', textShadow: '0 0 8px rgba(255,43,214,0.5)' }}>∞ РЕЖИМ БОГА</span> : <>🪙 {data?.coins ?? 0}</>}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SHOP_ITEMS.map((item) => {
            const isExpanded = expandedItem === item.id
            const canAfford = godMode || (data?.coins ?? 0) >= item.price
            return (
              <div
                key={item.id}
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                className="group relative cursor-pointer rounded-xl p-3 transition-all duration-200"
                style={panelStyle}
              >
                <div className="mb-2 flex h-12 items-center justify-center rounded-lg bg-black/40 text-2xl">
                  {item.icon}
                </div>
                <p className="text-center text-xs font-black text-ink">{item.name}</p>
                {item.subtype && (
                  <p className="text-center text-[9px] font-bold text-ink-faint">{item.subtype}</p>
                )}
                <p className="mt-1 text-center text-sm font-black text-amber-300">🪙 {item.price}</p>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBuy(item.id)
                  }}
                  disabled={!canAfford}
                  className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-black transition-all duration-150 active:scale-95 disabled:opacity-40"
                  style={{
                    background: canAfford ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${canAfford ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: canAfford ? '#00e5ff' : '#6b7280',
                  }}
                >
                  Купить
                </button>

                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: isExpanded ? 80 : 0, opacity: isExpanded ? 1 : 0 }}
                >
                  <p className="mt-2 text-[10px] font-bold leading-snug text-ink-muted">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Inventory screen
  if (screen === 'inventory') {
    const inventory = data?.inventory ?? {}
    const ownedItems = Object.entries(inventory).filter(([, qty]) => qty > 0)

    return (
      <div className="relative z-10 px-5 pb-8 pt-3 animate-fadeIn">
        <button onClick={() => setScreen('main')} className="mb-3 flex items-center gap-1 text-sm font-bold text-white hover:text-neon transition-colors" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
          <ChevronLeft size={16} /> Назад
        </button>

        <div className="mb-4 rounded-xl px-4 py-3" style={panelStyle}>
          <h2 className="text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
            🎒 Инвентарь
          </h2>
        </div>

        {ownedItems.length === 0 ? (
          <p className="text-center text-sm font-bold text-ink-faint">Пока пусто</p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {ownedItems.map(([itemId, qty]) => {
              const item = getShopItem(itemId)
              if (!item) return null
              return (
                <div key={itemId} className="rounded-xl p-3 text-center" style={panelStyle}>
                  <div className="mb-1 flex h-10 items-center justify-center text-xl">{item.icon}</div>
                  <p className="text-[10px] font-black text-ink">{item.name}</p>
                  <p className="mt-1 text-xs font-black text-neon">×{qty}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Item selection screen — before journey
  if (showItemSelect) {
    const inventory = data?.inventory ?? {}
    const ownedItems = Object.entries(inventory).filter(([, qty]) => qty > 0)
    const selectedCounts: Record<string, number> = {}
    for (const id of selectedJourneyItems) selectedCounts[id] = (selectedCounts[id] ?? 0) + 1
    const totalSelected = selectedJourneyItems.length
    const maxItems = 3

    const toggleItem = (itemId: string): void => {
      const ownedQty = inventory[itemId] ?? 0
      const currentlySelected = selectedCounts[itemId] ?? 0
      if (currentlySelected >= ownedQty) return
      if (totalSelected >= maxItems) return
      setSelectedJourneyItems((prev) => [...prev, itemId])
    }

    const removeItem = (itemId: string): void => {
      setSelectedJourneyItems((prev) => {
        const idx = prev.lastIndexOf(itemId)
        if (idx === -1) return prev
        const next = [...prev]
        next.splice(idx, 1)
        return next
      })
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="w-full max-w-sm rounded-2xl p-5 animate-scaleIn" style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,229,255,0.35)',
          boxShadow: '0 0 24px rgba(0,229,255,0.2)',
        }}>
          <h2 className="text-center text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
            Что берём с собой?
          </h2>
          <p className="mt-1 text-center text-xs font-bold text-ink-faint">
            Выбрано {totalSelected} / {maxItems}
          </p>

          {ownedItems.length === 0 ? (
            <p className="mt-6 text-center text-sm font-bold text-ink-faint">Инвентарь пуст</p>
          ) : (
            <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {ownedItems.map(([itemId, ownedQty]) => {
                const item = getShopItem(itemId)
                if (!item) return null
                const selectedQty = selectedCounts[itemId] ?? 0
                const canSelect = selectedQty < ownedQty && totalSelected < maxItems
                return (
                  <div
                    key={itemId}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{
                      background: selectedQty > 0 ? 'rgba(0,229,255,0.08)' : 'rgba(0,0,0,0.4)',
                      borderColor: selectedQty > 0 ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-xs font-black text-ink">{item.name}</p>
                        <p className="text-[10px] font-bold text-ink-faint">в наличии: {ownedQty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedQty > 0 && (
                        <button onClick={() => removeItem(itemId)} className="flex h-6 w-6 items-center justify-center rounded bg-red-500/30 text-xs font-black text-red-300 active:scale-90">−</button>
                      )}
                      {selectedQty > 0 && <span className="text-xs font-black text-neon">×{selectedQty}</span>}
                      <button
                        onClick={() => toggleItem(itemId)}
                        disabled={!canSelect}
                        className="flex h-6 w-6 items-center justify-center rounded bg-neon/20 text-xs font-black text-neon active:scale-90 disabled:opacity-30"
                      >+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={() => { setSelectedJourneyItems([]); setShowItemSelect(false) }}
              className="flex-1 rounded-lg border border-white/15 bg-black/50 py-2.5 text-xs font-bold text-ink transition-transform active:scale-95"
            >
              Идти без предметов
            </button>
            <button
              onClick={beginJourneyWithItems}
              className="flex-1 rounded-lg bg-neon py-2.5 text-xs font-black text-bg transition-transform active:scale-95"
            >
              В ПУТЬ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Game screen — journey
  if (screen === 'game' && isJourneyActive) {
    return (
      <>
        {/* Atmospheric dark background */}
        <div
          className="absolute z-0"
          style={{
            top: '-3rem',
            bottom: '-2rem',
            left: '-1.25rem',
            right: '-1.25rem',
            background: 'radial-gradient(ellipse at 50% 40%, #0a0b0f 0%, #06070a 60%, #030304 100%)',
            opacity: screenOpacity,
            transition: 'opacity 800ms ease-in-out',
          }}
        >
          {/* Soft fog layers */}
          <div className="absolute inset-0 animate-fogShift" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(0,229,255,0.04) 0%, transparent 50%)' }} />
          <div className="absolute inset-0 animate-fogShift2" style={{ background: 'radial-gradient(ellipse at 70% 60%, rgba(0,229,255,0.03) 0%, transparent 55%)' }} />

          {/* Floating particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: '3px',
                height: '3px',
                background: 'rgba(0,229,255,0.4)',
                left: `${10 + i * 11}%`,
                bottom: `${15 + (i % 3) * 20}%`,
                animation: `particleDrift ${6 + (i % 4) * 2}s ease-in-out ${i * 0.7}s infinite`,
                ['--drift' as string]: `${(i % 2 === 0 ? 1 : -1) * (10 + i * 4)}px`,
              }}
            />
          ))}

          {/* Central atmospheric icon with glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Glow halo */}
              <div
                className="absolute rounded-full animate-glowPulse"
                style={{
                  width: '180px',
                  height: '180px',
                  background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)',
                }}
              />
              <span
                className="relative animate-iconFloat"
                style={{
                  fontSize: '5.5rem',
                  filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.25))',
                }}
              >
{!showVictoryScreen && levelIcon}
              </span>
            </div>
          </div>
        </div>

        {/* HUD overlay */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-3 pb-4 pt-1">
        {/* Level indicator */}
        <div className="flex items-center justify-center gap-2 py-1">
          <div
            className="rounded-lg px-4 py-1.5 text-center"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,229,255,0.35)',
              boxShadow: '0 0 14px rgba(0,229,255,0.18)',
            }}
          >
            <span className="text-sm font-black text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.55)' }}>
              УРОВЕНЬ {currentLevel} / {MAX_LEVELS}
            </span>
          </div>
        </div>

        {/* Spacer — keeps central area free */}
        <div className="flex-1" />

        {/* Road choice */}
        <div className="space-y-2">
          <p className="text-center text-sm font-black uppercase tracking-wider text-ink" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
            КУДА НАПРАВЛЯЕМСЯ?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => {
              const event = roadEvents[i]
              const isRevealed = revealedRoads.has(i) || godMode
              const isBlocked = blockedRoads.has(i)
              const isShielded = shieldedRoads.has(i)
              const color = roadColors[i] ?? { name: '#00e5ff', glow: 'rgba(0,229,255,0.35)' }
              const label = roadLabels[i] ?? '—'
              const isLongName = label.length > 5
              return (
                <button
                  key={i}
                  onClick={() => handleRoadChoice(i)}
                  disabled={isTransitioning || isBlocked}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border transition-all duration-150 active:scale-90 disabled:opacity-40"
                  style={{
                    background: isShielded ? 'rgba(255,180,0,0.15)' : 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: isShielded ? '1px solid rgba(255,180,0,0.5)' : `1px solid ${color.name}59`,
                    boxShadow: isShielded ? '0 0 14px rgba(255,180,0,0.3)' : `0 0 14px ${color.glow}`,
                    color: color.name,
                    textShadow: `0 0 10px ${color.glow}`,
                  }}
                >
                  <span
                    className="font-black leading-tight"
                    style={{
                      fontSize: isLongName ? '0.7rem' : '0.85rem',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                    }}
                  >
                    {label}
                  </span>
                  {isShielded && <span className="mt-0.5 text-xs">🛡</span>}
                  {isRevealed && event && (
                    <span
                      className="mt-0.5 text-[8px] font-black leading-none"
                      style={{ color: roadEventColor(event), textShadow: `0 0 6px ${roadEventColor(event)}80` }}
                    >
                      {roadEventLabel(event)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Abandon journey button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setShowQuitConfirm(true)}
              disabled={isTransitioning}
              className="rounded-lg border border-red-500/20 bg-black/50 px-4 py-1.5 text-[11px] font-black text-ink-faint transition-all active:scale-95 disabled:opacity-40"
            >
              🚪 ПОКИНУТЬ ПУТЕШЕСТВИЕ
            </button>
          </div>

          {/* Quit confirmation modal */}
          {showQuitConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.8)' }}>
              <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-black/80 p-5 text-center animate-scaleIn">
                <p className="text-base font-black text-ink">Покинуть путешествие?</p>
                <p className="mt-1 text-xs font-bold text-ink-faint">Прогресс текущего забега будет потерян.</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="flex-1 rounded-xl bg-neon/80 px-4 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    Остаться
                  </button>
                  <button
                    onClick={abandonJourney}
                    className="flex-1 rounded-xl border border-red-500/30 bg-black/50 px-4 py-2.5 text-sm font-black text-red-400 transition-transform active:scale-95"
                  >
                    Покинуть
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Equipment bar */}
          {selectedJourneyItems.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {Object.entries(getJourneyItemCounts()).map(([itemId, qty]) => {
                const item = getShopItem(itemId)
                if (!item) return null
                const isActivatable = ['key_doubleka', 'bushido_pink', 'binokl'].includes(itemId)
                return (
                  <button
                    key={itemId}
                    onClick={() => {
                      if (itemId === 'key_doubleka') activateKey()
                      else if (itemId === 'bushido_pink') activateBushido()
                      else if (itemId === 'binokl') activateBinocular()
                    }}
                    disabled={!isActivatable || isTransitioning}
                    className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-black transition-all active:scale-95 disabled:opacity-60"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: `1px solid ${isActivatable ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: isActivatable ? '#00e5ff' : '#8b92a3',
                    }}
                  >
                    {item.icon} {item.name} ×{qty}
                  </button>
                )
              })}
              {binocularLevelsRemaining > 0 && (
                <span className="text-[10px] font-bold text-ink-faint">🔭 {binocularLevelsRemaining} ур.</span>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Shield toast */}
        {shieldToast && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <p className="text-lg font-black text-amber-300 animate-fadeIn" style={{ textShadow: '0 0 14px rgba(255,180,0,0.6)' }}>
              🛡 {shieldToast}
            </p>
          </div>
        )}

        {/* Transition overlay */}
        {isTransitioning && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="text-center px-8">
              {deathMessage ? (
                <p className="text-xl font-black leading-relaxed text-red-400" style={{ textShadow: '0 0 14px rgba(255,68,68,0.6)' }}>
                  {deathMessage}
                </p>
              ) : transitionText ? (
                <p className="whitespace-pre-line text-xl font-black leading-relaxed animate-fadeIn" style={{ color: (ambushFlash || finalBossFlash) ? '#ff4444' : transitionColor, textShadow: (ambushFlash || finalBossFlash) ? '0 0 18px rgba(255,68,68,0.8)' : `0 0 14px ${transitionColor}99` }}>
                  {transitionText}
                </p>
              ) : null}
              {transitionSubtext && (
                <p className="mt-2 text-sm font-bold text-ink-muted">{transitionSubtext}</p>
              )}
            </div>
          </div>
        )}

        {/* Luck toast on return */}
        {luckToast && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <p
              className="text-lg font-black text-neon animate-fadeIn"
              style={{ textShadow: '0 0 14px rgba(0,229,255,0.6)' }}
            >
              {luckToast}
            </p>
          </div>
        )}

        {/* Rare event overlay */}
        {rareEvent && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            {/* === TOWER === */}
            {rareEvent.type === 'tower' && rareEvent.stage === 'intro' && (
              <div className="flex flex-col items-center gap-4">
                <span className="animate-iconFloat" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 16px rgba(0,229,255,0.3))' }}>🔭</span>
                <h2 className="text-center text-xl font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 12px rgba(0,229,255,0.5)' }}>
                  ДОСМОТРОВАЯ ВЫШКА
                </h2>
                <button
                  onClick={handleTowerClick}
                  className="rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  Осмотреться
                </button>
              </div>
            )}

            {rareEvent.type === 'tower' && rareEvent.stage === 'tower_select' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-sm font-bold text-ink-muted">Отсюда видно почти всё...</p>
                <p className="text-center text-xs font-bold text-ink-faint">Выбери 3 дороги из 4</p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const selected = rareEvent.towerSelected.includes(idx)
                    const color = roadColors[idx] ?? { name: '#00e5ff', glow: 'rgba(0,229,255,0.35)' }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleTowerToggle(idx)}
                        className="flex h-16 w-20 items-center justify-center rounded-xl border-2 text-sm font-black transition-all active:scale-90"
                        style={{
                          borderColor: selected ? color.name : 'rgba(255,255,255,0.15)',
                          background: selected ? `${color.name}1a` : 'rgba(0,0,0,0.4)',
                          color: selected ? color.name : '#8b92a3',
                          boxShadow: selected ? `0 0 12px ${color.glow}` : 'none',
                        }}
                      >
                        {roadLabels[idx] ?? idx + 1}
                      </button>
                    )
                  })}
                </div>
                {rareEvent.towerSelected.length === 3 && (
                  <button
                    onClick={handleTowerConfirm}
                    className="rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    Посмотреть
                  </button>
                )}
              </div>
            )}

            {rareEvent.type === 'tower' && rareEvent.stage === 'tower_reveal' && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                {rareEvent.towerSelected.map((idx) => {
                  const event = roadEvents[idx]
                  const label = event ? roadEventLabel(event) : '?'
                  const color = event ? roadEventColor(event) : '#8b92a3'
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm font-black text-ink-faint">{roadLabels[idx] ?? idx + 1} —</span>
                      <span className="text-lg font-black" style={{ color, textShadow: `0 0 8px ${color}40` }}>{label}</span>
                    </div>
                  )
                })}
                <p className="mt-2 text-center text-xs font-bold text-ink-faint">Четвёртая дорога остаётся неизвестной...</p>
                <button
                  onClick={handleRareEventContinue}
                  className="mt-2 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  Продолжить путь
                </button>
              </div>
            )}

            {/* === TORMOZOK === */}
            {rareEvent.type === 'tormozok' && rareEvent.stage === 'intro' && (
              <div className="flex flex-col items-center gap-4">
                <span className="animate-iconFloat" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 16px rgba(255,200,100,0.3))' }}>🍱</span>
                <h2 className="text-center text-xl font-black uppercase tracking-wider text-amber-300" style={{ textShadow: '0 0 12px rgba(255,200,100,0.5)' }}>
                  ПОТЕРЯННЫЙ ТОРМОЗОК
                </h2>
                <p className="text-sm font-bold text-ink-muted">Съесть?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleTormozokEat}
                    className="rounded-xl bg-amber-500/80 px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    СЪЕСТЬ
                  </button>
                  <button
                    onClick={handleTormozokSkip}
                    className="rounded-xl border border-white/20 bg-black/50 px-6 py-2.5 text-sm font-black text-ink-muted transition-transform active:scale-95"
                  >
                    НЕ ЕСТЬ
                  </button>
                </div>
              </div>
            )}

            {rareEvent.type === 'tormozok' && rareEvent.stage === 'tormozok_result' && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                {rareEvent.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-center text-lg font-black"
                    style={{
                      color: line.includes('ПОДКРЕПИЛСЯ') || line.includes('Восстановлено') ? '#39ff14'
                        : line.includes('нечего') ? '#8b92a3'
                        : '#8b92a3',
                      textShadow: '0 0 10px rgba(0,229,255,0.2)',
                      animation: `fadeIn 0.5s ease ${i * 0.3}s both`,
                    }}
                  >
                    {line}
                  </p>
                ))}
                <button
                  onClick={handleRareEventContinue}
                  className="mt-2 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  Продолжить путь
                </button>
              </div>
            )}

            {/* === ROSGUARD === */}
            {rareEvent.type === 'rosguard' && rareEvent.stage === 'intro' && (
              <div className="flex flex-col items-center gap-4">
                <span className="animate-iconFloat" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 16px rgba(100,180,255,0.3))' }}>🛡️</span>
                <h2 className="text-center text-xl font-black uppercase tracking-wider text-blue-300" style={{ textShadow: '0 0 12px rgba(100,180,255,0.5)' }}>
                  ПРОВЕРКА РОСГВАРДИИ
                </h2>
                <p className="text-sm font-bold text-ink-muted">У вас всё в порядке?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRosguardYes}
                    className="rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    ДА
                  </button>
                  <button
                    onClick={handleRosguardNo}
                    className="rounded-xl border border-white/20 bg-black/50 px-6 py-2.5 text-sm font-black text-ink-muted transition-transform active:scale-95"
                  >
                    НЕТ
                  </button>
                </div>
              </div>
            )}

            {rareEvent.type === 'rosguard' && rareEvent.stage === 'rosguard_result' && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                {rareEvent.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-center text-lg font-black text-ink-muted"
                    style={{ animation: `fadeIn 0.5s ease ${i * 0.3}s both` }}
                  >
                    {line}
                  </p>
                ))}
                <button
                  onClick={handleRareEventContinue}
                  className="mt-2 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  Продолжить путь
                </button>
              </div>
            )}

            {/* === BALOK === */}
            {rareEvent.type === 'balok' && rareEvent.stage === 'intro' && (
              <div className="flex flex-col items-center gap-4">
                <span className="animate-iconFloat" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 16px rgba(120,80,60,0.4))' }}>🏚️</span>
                <h2 className="text-center text-xl font-black uppercase tracking-wider text-amber-200" style={{ textShadow: '0 0 12px rgba(255,200,100,0.3)' }}>
                  ЗАГАДОЧНЫЙ БАЛОК
                </h2>
                <p className="text-sm font-bold text-ink-muted">Остановиться и поспать?</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleBalokYes}
                    className="rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    ДА
                  </button>
                  <button
                    onClick={handleBalokNo}
                    className="rounded-xl border border-white/20 bg-black/50 px-6 py-2.5 text-sm font-black text-ink-muted transition-transform active:scale-95"
                  >
                    НЕТ
                  </button>
                </div>
              </div>
            )}

            {rareEvent.type === 'balok' && rareEvent.stage === 'balok_result' && (
              <div className="flex flex-col items-center gap-3 animate-fadeIn">
                {rareEvent.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-center text-lg font-black"
                    style={{
                      color: line.includes('сохранения') ? '#39ff14' : '#8b92a3',
                      textShadow: line.includes('сохранения') ? '0 0 10px rgba(57,255,20,0.3)' : 'none',
                      animation: `fadeIn 0.5s ease ${i * 0.3}s both`,
                    }}
                  >
                    {line}
                  </p>
                ))}
                <button
                  onClick={handleRareEventContinue}
                  className="mt-2 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  Продолжить путь
                </button>
              </div>
            )}
          </div>
        )}

        {/* Combat overlay */}
        {combat && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(10px)', gap: '0.5rem' }}
          >
            {/* Header with help button */}
            <div className="flex w-full max-w-sm items-center justify-between pt-1">
              <span className="text-xs font-black text-red-400" style={{ textShadow: '0 0 6px rgba(255,68,68,0.3)' }}>⚔️ БОЙ</span>
              <button
                onClick={() => setShowCombatHelp(true)}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-black text-neon transition-all active:scale-90"
              >
                <span>📖</span> КАК ИГРАТЬ
              </button>
            </div>

            {/* Enemy card */}
            <div
              className={`w-full max-w-sm rounded-2xl border-2 px-4 py-3 ${enemyFlash ? 'animate-shakeHit' : ''} ${enemyFlash ? 'animate-cardFlashRed' : ''}`}
              style={{
                borderColor: 'rgba(255,68,68,0.3)',
                background: 'linear-gradient(135deg, rgba(255,68,68,0.08), rgba(0,0,0,0.5))',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-red-400">🔥 Противник</span>
                </div>
                <span className="text-[10px] font-bold text-red-400/60">{combat.enemyHp} / {MAX_COMBAT_HP} HP</span>
              </div>
              <div className="flex items-center justify-center gap-3 py-1">
                <span className="animate-iconFloat" style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px rgba(255,68,68,0.3))' }}>
                  {combat.enemyIcon}
                </span>
                <div className="flex flex-col">
                  <p className="text-sm font-black text-red-400" style={{ textShadow: '0 0 6px rgba(255,68,68,0.3)' }}>
                    {combat.enemyName}
                  </p>
                  <p className="mt-1 text-[11px] font-bold italic text-red-300/80">
  «{combat.enemyTaunt}»
</p>
                  <div className="flex gap-0.5 text-base">
                    {Array.from({ length: MAX_COMBAT_HP }).map((_, i) => (
                      <span key={i} style={{ opacity: i < combat.enemyHp ? 1 : 0.15, transition: 'opacity 0.3s' }}>
                        {i < combat.enemyHp ? '❤️' : '🖤'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Central combat display */}
            <div className="flex min-h-[80px] w-full max-w-sm flex-col items-center justify-center">
              {combat.stage === 'victory' ? (
                <div className="flex flex-col items-center gap-2 animate-fadeIn">
                  <span style={{ fontSize: '2.5rem' }}>🏆</span>
                  <p className="text-2xl font-black text-green-400" style={{ textShadow: '0 0 16px rgba(57,255,20,0.5)' }}>
                    ПОБЕДА!
                  </p>
                  <p className="text-xs font-bold text-ink-muted">{combat.enemyName} повержен</p>
                  <button
                    onClick={handleCombatVictoryContinue}
                    className="mt-1 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    Продолжить путь
                  </button>
                </div>
              ) : combat.stage === 'defeat' ? (
                <div className="flex flex-col items-center gap-2 animate-fadeIn">
                  <span style={{ fontSize: '2.5rem' }}>💀</span>
                  <p className="text-2xl font-black text-red-400" style={{ textShadow: '0 0 16px rgba(255,68,68,0.5)' }}>
                    ТЫ ПРОИГРАЛ
                  </p>
                  <p className="text-xs font-bold text-ink-muted">Путешествие окончено...</p>
                </div>
              ) : combat.stage === 'radio_list' ? (
                <div className="w-full animate-fadeIn">
                  <p className="mb-2 text-center text-xs font-black text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.4)' }}>
                    📻 304, нужна помощь. Кого зовём?
                  </p>
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                    {workersList.filter((w) => w.name !== playerName).map((w) => (
                      <button
                        key={w.name}
                        onClick={() => handleRaciyaSelect(w.name)}
                        className="block w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-left text-xs font-bold text-ink transition-all duration-150 hover:border-neon/40 hover:bg-neon/10 active:scale-95"
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
           ) : abilityPopup ? (
  <div
    onClick={() => setAbilityPopup(null)}
    className="flex flex-col items-center gap-2 animate-fadeIn cursor-pointer text-center px-4"
  >
    <span className="text-[10px] font-black text-neon">
      ⚡ ЭФФЕКТ СПОСОБНОСТИ
    </span>

    <p
      className="text-sm font-extrabold text-white"
      style={{ textShadow: '0 0 12px rgba(0,229,255,0.35)' }}
    >
      {abilityPopup}
    </p>

    <span className="text-[8px] font-bold text-ink-faint">
      НАЖМИ, ЧТОБЫ ЗАКРЫТЬ
    </span>
  </div>
) : combatDisplay ? (
                <div key={`${combatDisplay.title}-${combatDisplay.result}`} className="flex flex-col items-center gap-1 animate-fadeIn">
                  <span style={{ fontSize: '1.5rem' }}>{combatDisplay.icon}</span>
                  <p
                    className="text-center text-sm font-black"
                    style={{
                      color: combatDisplay.result === 'miss' ? '#8b92a3'
                        : combatDisplay.result === 'defeat' ? '#ff4444'
                        : combatDisplay.turn === 'player' ? '#00e5ff'
                        : '#ff4444',
                      textShadow: `0 0 8px ${combatDisplay.result === 'miss' ? 'rgba(139,146,163,0.3)' : combatDisplay.turn === 'player' ? 'rgba(0,229,255,0.3)' : 'rgba(255,68,68,0.3)'}`,
                    }}
                  >
                    {combatDisplay.title}
                  </p>
                  {combatDisplay.subtitle && (
                    <p className="text-center text-xs font-bold text-ink-muted">{combatDisplay.subtitle}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold text-ink-faint">...</p>
              )}
            </div>

            {/* Player card */}
            <div
              className={`w-full max-w-sm rounded-2xl border-2 px-4 py-3 ${playerFlash ? 'animate-shakeHit' : ''} ${playerFlash ? 'animate-cardFlashRed' : ''}`}
              style={{
                borderColor: 'rgba(0,229,255,0.3)',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,0,0,0.5))',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-neon">👤 Ты</span>
                <span className="text-[10px] font-bold text-neon/60">{combat.playerHp} / {MAX_COMBAT_HP} HP</span>
              </div>
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="flex flex-col items-end">
                  <p className="text-sm font-black text-neon" style={{ textShadow: '0 0 6px rgba(0,229,255,0.3)' }}>
                    {godMode ? 'Бессмертие' : 'Игрок'}
                  </p>
                  <div className="flex gap-0.5 text-base">
                    {Array.from({ length: MAX_COMBAT_HP }).map((_, i) => (
                      <span key={i} style={{ opacity: i < combat.playerHp ? 1 : 0.15, transition: 'opacity 0.3s' }}>
                        {i < combat.playerHp ? '❤️' : '🖤'}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="animate-iconFloat" style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.3))' }}>
                  {godMode ? '👑' : '🧑'}
                </span>
              </div>
            </div>

            {/* Battle log */} 
<div className="relative w-full max-w-sm">
 
              <p className="mb-1 text-center text-[10px] font-black text-ink-faint">📜 ЖУРНАЛ БОЯ</p>
              <div
                ref={battleLogRef}
                className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5"
                style={{ maxHeight: '90px', overflowY: 'auto', scrollBehavior: 'smooth' }}
              >
                {battleLog.length === 0 ? (
                  <p className="py-1 text-center text-[10px] text-ink-faint">Бой ещё не начался...</p>
                ) : (
                  battleLog.map((entry, i) => {
                    const isLast = i === battleLog.length - 1
                    const color = entry.color === 'green' ? '#39ff14'
                      : entry.color === 'red' ? '#ff4444'
                      : entry.color === 'gray' ? '#8b92a3'
                      : entry.color === 'gold' ? '#ffd700'
                      : '#00e5ff'
                    return (
                      <div key={entry.id} className="flex items-start gap-1.5 py-0.5">
                        <span className="shrink-0 text-[9px] font-black text-ink-faint/50" style={{ minWidth: '18px' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="shrink-0 text-xs">{entry.icon}</span>
                        <span
                          className="text-[11px] font-bold leading-tight"
                          style={{
                            color: isLast ? color : `${color}cc`,
                            textShadow: isLast ? `0 0 6px ${color}40` : 'none',
                            transition: 'opacity 0.3s',
                          }}
                        >
                          {entry.text}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Fight actions */}
            {combat.stage === 'fight' && !combat.busy && (
              <div className="w-full max-w-sm space-y-2">
                {/* Attacks */}
                <div className="grid grid-cols-5 gap-1.5">
                  {PLAYER_ATTACKS.map((atk) => (
                    <button
                      key={atk.id}
                      onClick={() => handlePlayerAttack(atk.id)}
                      className="flex flex-col items-center rounded-lg border border-red-500/30 bg-black/50 py-1.5 transition-all active:scale-90"
                      style={{ boxShadow: '0 0 8px rgba(255,68,68,0.1)' }}
                    >
                      <span className="text-lg">{atk.icon}</span>
                      <span className="text-[8px] font-black text-ink-faint">{atk.name}</span>
                      <span className="text-[7px] font-bold text-white/40">
  {Math.round(atk.chance * 100)}% · {atk.damage} урон
</span>
                    </button>
                  ))}
                </div>

                {/* Abilities */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={handleRaciya}
                    disabled={combat.abilitiesUsed.raciya}
                    className="flex flex-col items-center rounded-lg border border-neon/30 bg-black/50 py-1.5 transition-all active:scale-90 disabled:opacity-30"
                    title="Позвать случайного сотрудника на помощь"
                  >
                    <span className="text-lg">📻</span>
                    <span className="text-[8px] font-black text-neon">Рация</span>
                    {combat.abilitiesUsed.raciya && <span className="text-[7px] font-bold text-ink-faint">✓ ИСП.</span>}
                  </button>
                  <button
                    onClick={handleNaruchniki}
                    disabled={combat.abilitiesUsed.naruchniki}
                    className="flex flex-col items-center rounded-lg border border-neon/30 bg-black/50 py-1.5 transition-all active:scale-90 disabled:opacity-30"
                    title="Рискованная попытка обезвредить врага"
                  >
                    <span className="text-lg">⛓️</span>
                    <span className="text-[8px] font-black text-neon">Наручники</span>
                    {combat.abilitiesUsed.naruchniki && <span className="text-[7px] font-bold text-ink-faint">✓ ИСП.</span>}
                  </button>
                  <button
                    onClick={handlePalka}
                    disabled={combat.abilitiesUsed.palka}
                    className="flex flex-col items-center rounded-lg border border-neon/30 bg-black/50 py-1.5 transition-all active:scale-90 disabled:opacity-30"
                    title="Непредсказуемая специальная атака"
                  >
                    <span className="text-lg">🥢</span>
                    <span className="text-[8px] font-black text-neon">Палка</span>
                    {combat.abilitiesUsed.palka && <span className="text-[7px] font-bold text-ink-faint">✓ ИСП.</span>}
                  </button>
                </div>
              </div>
            )}

            {/* Busy indicator */}
            {combat.stage === 'fight' && combat.busy && (
              <p className="text-xs font-bold text-ink-faint animate-pulseGlow">...</p>
            )}
          </div>
        )}

        {/* Combat help modal */}
        {showCombatHelp && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowCombatHelp(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/15 bg-black/80 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
                  ⚔️ КАК ПРОХОДИТ БОЙ
                </h2>
                <button
                  onClick={() => setShowCombatHelp(false)}
                  className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-xs font-bold text-ink-muted active:scale-90"
                >
                  ✕
                </button>
              </div>

              {/* Health */}
              <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="mb-1 text-sm font-black text-red-400">❤️ ЗДОРОВЬЕ</p>
                <p className="text-xs text-ink-muted">У тебя: {MAX_COMBAT_HP} ❤️</p>
                <p className="text-xs text-ink-muted">У противника: {MAX_COMBAT_HP} ❤️</p>
                <p className="mt-1 text-[11px] text-ink-faint">Если здоровье противника 0 — ты побеждаешь. Если твоё 0 — путешествие заканчивается.</p>
              </div>

              {/* Attacks */}
              <div className="mb-4 rounded-xl border border-red-500/20 bg-black/40 p-3">
                <p className="mb-2 text-sm font-black text-red-400">👊 ОБЫЧНЫЕ АТАКИ</p>
                {PLAYER_ATTACKS.map((atk) => (
                  <div key={atk.id} className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{atk.icon} {atk.name.toUpperCase()}</span>
                    <span className="text-[11px] text-ink-muted">Шанс: {Math.round(atk.chance * 100)}% · Урон: {atk.damage}</span>
                  </div>
                ))}
              </div>

              {/* Abilities */}
              <div className="rounded-xl border border-neon/20 bg-black/40 p-3">
                <p className="mb-2 text-sm font-black text-neon">🎒 СПОСОБНОСТИ</p>

                <div className="mb-3">
                  <p className="text-xs font-black text-neon">📻 РАЦИЯ</p>
                  <p className="text-[11px] text-ink-muted">1 раз за бой. Позвать случайного сотрудника.</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-ink-faint">34% — падает в обморок (ничего)</p>
                    <p className="text-[10px] text-ink-faint">10% — «Беги, я возьму его» (выход из боя)</p>
                    <p className="text-[10px] text-ink-faint">20% — −3 ❤️ врагу</p>
                    <p className="text-[10px] text-ink-faint">13% — Предательство: −1 ❤️ тебе</p>
                    <p className="text-[10px] text-ink-faint">23% — Не понял кто враг: обоим −1 ❤️</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-black text-neon">⛓️ НАРУЧНИКИ</p>
                  <p className="text-[11px] text-ink-muted">1 раз за бой. Рискованная попытка.</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-ink-faint">10% — «Ты арестован!» (враг повержен)</p>
                    <p className="text-[10px] text-ink-faint">10% — Случайно надел на себя: −1 ❤️ тебе</p>
                    <p className="text-[10px] text-ink-faint">30% — Не налезают (ничего)</p>
                    <p className="text-[10px] text-ink-faint">20% — Кинул в лицо: −2 ❤️ врагу</p>
                    <p className="text-[10px] text-ink-faint">30% — Приковал обоих: −1 ❤️ обоим</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-neon">🥢 ПАЛКА</p>
                  <p className="text-[11px] text-ink-muted">1 раз за бой. Непредсказуемая атака.</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-ink-faint">10% — Крит! Враг повержен</p>
                    <p className="text-[10px] text-ink-faint">20% — Застряла в чехле</p>
                    <p className="text-[10px] text-ink-faint">20% — Оказалась вялой</p>
                    <p className="text-[10px] text-ink-faint">20% −2 ❤️ врагу</p>
                    <p className="text-[10px] text-ink-faint">15% — Враг отобрал: −1 ❤️ тебе</p>
                    <p className="text-[10px] text-ink-faint">15% — Рассыпалась в руках</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final boss combat overlay */}
        {bossCombat && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', gap: '0.5rem' }}
          >
            {/* Header */}
            <div className="relative flex w-full max-w-sm items-center justify-center pt-1">
  <span className="text-xs font-black text-red-400" style={{ textShadow: '0 0 8px rgba(255,68,68,0.5)' }}>
    ⚔ ФИНАЛЬНЫЙ БОСС
  </span>

  <button
    onClick={() => setShowBossHelp(true)}
    className="absolute right-0 rounded-lg border border-neon/30 bg-black/60 px-2 py-1 text-[9px] font-black text-neon transition-all active:scale-95"
  >
    📖 КАК ИГРАТЬ
  </button>
</div>

{showBossHelp && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
    onClick={() => setShowBossHelp(false)}
  >
    <div
      className="w-full max-w-sm rounded-2xl border-2 border-neon/50 bg-black p-4 animate-fadeIn"
      style={{ boxShadow: '0 0 30px rgba(0,229,255,0.25)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 text-center text-sm font-black text-neon">
        📖 КАК ИГРАТЬ
      </div>

      <div className="space-y-2 text-[11px] font-bold text-white">
        <p>⚔️ Победи финального босса, опустив его здоровье до 0.</p>
        <p>❤️ Если твоё здоровье упадёт до 0 — путешествие закончено.</p>
        <p>👊 Обычные атаки можно использовать каждый ход.</p>
        <p>👜 Способности можно использовать только 1 раз за бой.</p>
      </div>

      <div className="my-3 border-t border-white/10" />

      <div className="space-y-2 text-[10px] text-ink-muted">
        <p><b className="text-amber-300">😴 Дремануть</b> — 50% шанс восстановить 2 ❤️.</p>
        <p><b className="text-amber-300">🔫 Выстрел вверх</b> — зовёт случайного сотрудника. 60% шанс помощи, урон 1–3 ❤️.</p>
        <p><b className="text-amber-300">🤬 Оскорбить</b> — 50% шанс нанести боссу 2 ❤️.</p>
        <p><b className="text-amber-300">👁️ Бдительность</b> — 50% шанс заставить босса промахнуться следующие 2 атаки.</p>
        <p><b className="text-amber-300">📖 Утомить статьёй</b> — 50% шанс усыпить босса и получить 2 дополнительных хода.</p>
      </div>

      <button
        onClick={() => setShowBossHelp(false)}
        className="mt-4 w-full rounded-xl border border-neon/40 bg-neon/10 py-2 text-[10px] font-black text-neon active:scale-95"
      >
        ПОНЯТНО
      </button>
    </div>
  </div>
)}            {/* Boss card */}
            <div
              className={`w-full max-w-sm rounded-2xl border-2 px-4 py-3 ${bossEnemyFlash ? 'animate-shakeHit' : ''} ${bossEnemyFlash ? 'animate-cardFlashRed' : ''}`}
              style={{
                borderColor: 'rgba(255,68,68,0.4)',
                background: 'linear-gradient(135deg, rgba(255,68,68,0.1), rgba(0,0,0,0.6))',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-red-400">🔥 Босс</span>
                <span className="text-[10px] font-bold text-red-400/60">{bossCombat.bossHp} / {bossCombat.bossMaxHp} HP</span>
              </div>
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="relative flex items-center justify-center gap-2">
                  <span
                    className="relative animate-iconFloat"
                    style={{
                      fontSize: bossCombat.isDouble ? '2.5rem' : '3rem',
                      filter: 'drop-shadow(0 0 12px rgba(255,68,68,0.3))',
                    }}
                  >
                    {bossCombat.icon}
                  </span>
                  {bossCombat.isDouble && bossCombat.icon2 && (
                    <span
                      className="relative animate-iconFloat"
                      style={{
                        fontSize: '2.5rem',
                        filter: 'drop-shadow(0 0 12px rgba(255,68,68,0.3))',
                        animationDelay: '0.5s',
                      }}
                    >
                      {bossCombat.icon2}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-black text-red-400" style={{ textShadow: '0 0 8px rgba(255,68,68,0.5)' }}>
                    {bossCombat.name}
                  </p>
                  <p className="mt-1 text-[11px] font-bold italic text-red-300/80">
  «{bossCombat.taunt}»
</p>
                  <div className="flex flex-wrap gap-0.5 text-sm" style={{ maxWidth: '120px' }}>
                    {Array.from({ length: bossCombat.bossMaxHp }).map((_, i) => (
                      <span key={i} style={{ opacity: i < bossCombat.bossHp ? 1 : 0.15, transition: 'opacity 0.3s' }}>
                        {i < bossCombat.bossHp ? '❤️' : '🖤'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Central combat display */}
            <div className="flex min-h-[80px] w-full max-w-sm flex-col items-center justify-center">
              {bossCombat.stage === 'victory' ? (
                <div className="flex flex-col items-center gap-2 animate-fadeIn">
                  <span style={{ fontSize: '2.5rem' }}>🏆</span>
                  <p className="text-2xl font-black text-green-400" style={{ textShadow: '0 0 16px rgba(57,255,20,0.5)' }}>
                    БОСС ПОБЕЖДЁН!
                  </p>
                  <p className="text-xs font-bold text-ink-muted">{bossCombat.name} повержен</p>
                  <button
                    onClick={handleBossVictoryContinue}
                    className="mt-1 rounded-xl bg-neon px-6 py-2.5 text-sm font-black text-bg transition-transform active:scale-95"
                  >
                    Дальше
                  </button>
                </div>
              ) : bossCombat.stage === 'defeat' ? (
                <div className="flex flex-col items-center gap-2 animate-fadeIn">
                  <span style={{ fontSize: '2.5rem' }}>💀</span>
                  <p className="text-2xl font-black text-red-400" style={{ textShadow: '0 0 16px rgba(255,68,68,0.5)' }}>
                    ПОРАЖЕНИЕ
                  </p>
                  <p className="text-xs font-bold text-ink-muted">Ты повержен...</p>
                </div>
) : abilityPopup ? (
  <div
    onClick={() => setAbilityPopup(null)}
    className="flex flex-col items-center gap-2 animate-fadeIn cursor-pointer text-center px-4"
  >
    <span className="text-[10px] font-black text-neon">
      ⚡ ЭФФЕКТ СПОСОБНОСТИ
    </span>

    <p
      className="text-sm font-extrabold text-white"
      style={{ textShadow: '0 0 12px rgba(0,229,255,0.35)' }}
    >
      {abilityPopup}
    </p>

    <span className="text-[8px] font-bold text-ink-faint">
      НАЖМИ, ЧТОБЫ ЗАКРЫТЬ
    </span>
  </div>
) : bossCombatDisplay ? (
                <div key={`${bossCombatDisplay.title}-${bossCombatDisplay.result}`} className="flex flex-col items-center gap-1 animate-fadeIn">
                  <span style={{ fontSize: '1.5rem' }}>{bossCombatDisplay.icon}</span>
                  <p
                    className="text-center text-sm font-black"
                    style={{
                      color: bossCombatDisplay.result === 'miss' ? '#8b92a3'
                        : bossCombatDisplay.result === 'defeat' ? '#ff4444'
                        : bossCombatDisplay.turn === 'player' ? '#00e5ff'
                        : '#ff4444',
                      textShadow: `0 0 8px ${bossCombatDisplay.result === 'miss' ? 'rgba(139,146,163,0.3)' : bossCombatDisplay.turn === 'player' ? 'rgba(0,229,255,0.3)' : 'rgba(255,68,68,0.3)'}`,
                    }}
                  >
                    {bossCombatDisplay.title}
                  </p>
                  {bossCombatDisplay.subtitle && (
                    <p className="text-center text-xs font-bold text-ink-muted">{bossCombatDisplay.subtitle}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold text-ink-faint">...</p>
              )}
            </div>

            {/* Player card */}
            <div
              className={`w-full max-w-sm rounded-2xl border-2 px-4 py-3 ${bossPlayerFlash ? 'animate-shakeHit' : ''} ${bossPlayerFlash ? 'animate-cardFlashRed' : ''}`}
              style={{
                borderColor: 'rgba(0,229,255,0.3)',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,0,0,0.5))',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-neon">👤 Ты</span>
                <span className="text-[10px] font-bold text-neon/60">{bossCombat.playerHp} / {MAX_COMBAT_HP} HP</span>
              </div>
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="flex flex-col items-end">
                  <p className="text-sm font-black text-neon" style={{ textShadow: '0 0 6px rgba(0,229,255,0.3)' }}>
                    {godMode ? 'Бессмертие' : 'Игрок'}
                  </p>
                  <div className="flex gap-0.5 text-base">
                    {Array.from({ length: MAX_COMBAT_HP }).map((_, i) => (
                      <span key={i} style={{ opacity: i < bossCombat.playerHp ? 1 : 0.15, transition: 'opacity 0.3s' }}>
                        {i < bossCombat.playerHp ? '❤️' : '🖤'}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="animate-iconFloat" style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.3))' }}>
                  {godMode ? '👑' : '🧑'}
                </span>
              </div>
            </div>

            {/* Boss battle log */}
            <div className="relative w-full max-w-sm">

              <p className="mb-1 text-center text-[10px] font-black text-ink-faint">📜 ЖУРНАЛ БОЯ</p>
              <div
                ref={bossBattleLogRef}
                className="rounded-lg border border-red-500/15 bg-black/40 px-2 py-1.5"
                style={{ maxHeight: '90px', overflowY: 'auto', scrollBehavior: 'smooth' }}
              >
                {bossBattleLog.length === 0 ? (
                  <p className="py-1 text-center text-[10px] text-ink-faint">Финальный бой ещё не начался...</p>
                ) : (
                  bossBattleLog.map((entry, i) => {
                    const isLast = i === bossBattleLog.length - 1
                    const color = entry.color === 'green' ? '#39ff14'
                      : entry.color === 'red' ? '#ff4444'
                      : entry.color === 'gray' ? '#8b92a3'
                      : entry.color === 'gold' ? '#ffd700'
                      : '#00e5ff'
                    return (
                      <div key={entry.id} className="flex items-start gap-1.5 py-0.5">
                        <span className="shrink-0 text-[9px] font-black text-ink-faint/50" style={{ minWidth: '18px' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="shrink-0 text-xs">{entry.icon}</span>
                        <span
                          className="text-[11px] font-bold leading-tight"
                          style={{
                            color: isLast ? color : `${color}cc`,
                            textShadow: isLast ? `0 0 6px ${color}40` : 'none',
                            transition: 'opacity 0.3s',
                          }}
                        >
                          {entry.text}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Fight actions */}
            {bossCombat.stage === 'fight' && !bossCombat.busy && (
              <div className="w-full max-w-sm space-y-2">
                {/* Attacks */}
                <div className="grid grid-cols-5 gap-1.5">
                  {PLAYER_ATTACKS.map((atk) => (
                    <button
                      key={atk.id}
                      onClick={() => handleBossAttack(atk.id)}
                      className="flex flex-col items-center rounded-lg border border-red-500/30 bg-black/50 py-1.5 transition-all active:scale-90"
                      style={{ boxShadow: '0 0 8px rgba(255,68,68,0.1)' }}
                    >
                     <span className="text-lg">{atk.icon}</span>
<span className="text-[8px] font-black text-ink-faint">{atk.name}</span>
<span className="text-[7px] font-bold text-white/40">
  {Math.round(atk.chance * 100)}% · {atk.damage} урон
</span>
</button>
                  ))}
                </div>

                {/* Boss abilities */}
                <div className="grid grid-cols-5 gap-1.5">
                  {BOSS_ABILITIES.map((ab) => {
                    const used = bossCombat.abilitiesUsed[ab.id as keyof BossCombatState['abilitiesUsed']]
                    return (
                      <button
                        key={ab.id}
                        onClick={() => handleBossAbility(ab.id)}
                        disabled={used}
                        className="flex flex-col items-center rounded-lg border border-amber-500/30 bg-black/50 py-1.5 transition-all active:scale-90 disabled:opacity-20"
                        title={ab.name}
                      >
                        <span className="text-lg">{ab.icon}</span>
                        <span className="text-[7px] font-black text-amber-300">{ab.name}</span>
                        {used && <span className="text-[7px] font-bold text-ink-faint">✓ ИСП.</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Busy indicator */}
            {bossCombat.stage === 'fight' && bossCombat.busy && (
              <p className="text-xs font-bold text-ink-faint animate-pulseGlow">...</p>
            )}
          </div>
        )}

        {/* Journey complete screen */}
        {journeyComplete && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fadeIn"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,229,255,0.08) 0%, rgba(0,0,0,0.95) 70%)' }}
          >
            <p
              className="text-center text-2xl font-black leading-relaxed text-neon animate-fadeIn"
              style={{ textShadow: '0 0 20px rgba(0,229,255,0.6)' }}
            >
              ТЫ ПОКИНУЛ<br />ОБИТЕЛЬ ТЕНЕЙ
            </p>
            <p className="mt-4 text-center text-sm font-bold text-ink-muted">
              Путешествие завершено. +1 к завершённым путешествиям.
            </p>
            <button
              onClick={() => {
                setJourneyComplete(false)
                setIsJourneyActive(false)
                setCurrentLevel(1)
                setScreen('main')
              }}
              className="mt-6 rounded-xl bg-neon px-8 py-3 text-sm font-black text-bg transition-transform active:scale-95"
            >
              Вернуться на базу
            </button>
          </div>
        )}

        {/* Victory screen with chest */}
        {showVictoryScreen && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fadeIn"
            style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(255,215,0,0.12) 0%, rgba(0,0,0,0.97) 70%)' }}
          >
            {/* Floating particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-sm animate-iconFloat"
                style={{
                  left: `${10 + i * 11}%`,
                  top: `${15 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.4}s`,
                  opacity: 0.5,
                  filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.4))',
                }}
              >
                ✨
              </span>
            ))}

            <p
              className="text-center text-2xl font-black leading-tight text-amber-300 animate-fadeIn"
              style={{ textShadow: '0 0 24px rgba(255,215,0,0.7), 0 0 8px rgba(255,180,0,0.5)' }}
            >
              ТЫ — ВЕРШИТЕЛЬ<br />СВОЕЙ СУДЬБЫ
            </p>
            <p className="mt-2 text-center text-sm font-bold text-amber-200/80">Поздравляю!</p>

            {/* Chest */}
            <div className="relative mt-8 flex flex-col items-center">
              <div
                className="absolute rounded-full"
                style={{
                  width: '180px',
                  height: '180px',
                  top: '-30px',
                  background: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)',
                  animation: 'glowPulse 2s ease-in-out infinite',
                }}
              />
              <span
                className="relative"
                style={{
                  fontSize: '5rem',
                  filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.5))',
                  animation: chestOpened ? 'none' : 'iconFloat 2.5s ease-in-out infinite',
                  transition: 'transform 0.4s',
                  transform: chestOpening ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {chestOpening ? '💥' : chestOpened ? '🎁' : '🧰'}
              </span>
            </div>

            {!chestOpened ? (
              <button
                onClick={handleOpenChest}
                disabled={chestOpening}
                className="mt-6 rounded-xl px-8 py-3 text-sm font-black text-bg transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,180,0,0.95))',
                  boxShadow: '0 0 20px rgba(255,215,0,0.4)',
                }}
              >
                {chestOpening ? 'Открываем...' : 'ОТКРЫТЬ СУНДУК'}
              </button>
            ) : (
              <div className="mt-6 w-full max-w-xs animate-fadeIn">
                <p className="mb-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-400/80">🎒 Награды</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-black/40 px-3 py-2">
                    <span className="text-base">⭐</span>
                    <span className="text-sm font-black text-amber-300">+20 опыта</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-black/40 px-3 py-2">
                    <span className="text-base">🪙</span>
                    <span className="text-sm font-black text-amber-300">+20 монет</span>
                  </div>
                  {chestRewards?.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-black/40 px-3 py-2">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm font-black text-amber-300">{item.name}</span>
                    </div>
                  ))}
                </div>
                {godMode && (
                  <p className="mt-2 text-center text-[10px] font-bold text-pink-400/70">God Mode — награды не сохраняются</p>
                )}
                <button
                  onClick={handleVictoryReturn}
                  className="mt-4 w-full rounded-xl bg-neon px-8 py-3 text-sm font-black text-bg transition-transform active:scale-95"
                >
                  ВЕРНУТЬСЯ В ОБИТЕЛЬ
                </button>
              </div>
            )}
          </div>
        )}

        {/* Traveler encounter overlay */}
        {encounter && encounter.stage === 'choice' && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
          >
            {/* Encounter icon — large, atmospheric */}
            <div className="mb-4 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute rounded-full animate-glowPulse"
                  style={{
                    width: '160px',
                    height: '160px',
                    background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)',
                  }}
                />
                <span
                  className="relative animate-iconFloat"
                  style={{
                    fontSize: '5rem',
                    filter: 'drop-shadow(0 0 18px rgba(0,229,255,0.2))',
                  }}
                >
                  {encounter.type === 'WORKERS' ? '👷 👷 👷' : encounter.icon}
                </span>
              </div>
            </div>

            {/* Title */}
            <h2
              className="whitespace-pre-line text-center text-lg font-black leading-relaxed text-neon"
              style={{ textShadow: '0 0 12px rgba(0,229,255,0.5)' }}
            >
              {encounter.type === 'CAT'
                ? 'Ты встретил Белого котика'
                : encounter.type === 'WORKERS'
                  ? 'Ты встретил гастарбайтеров'
                  : `Вы встретили\n${encounter.name}`}
            </h2>

            {/* Choice buttons */}
            <div className="mt-5 w-full max-w-xs space-y-2">
              {encounter.type === 'CAT' && (
                <>
                  <button
                    onClick={() => handleCatChoice('coins')}
                    className="w-full rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.85), rgba(255,180,0,0.9))', boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}
                  >
                    🪙 Получить 2 монеты
                  </button>
                  <button
                    onClick={() => handleCatChoice('advance')}
                    className="w-full rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, rgba(57,255,20,0.85), rgba(40,200,10,0.9))', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }}
                  >
                    Продвинуться на 1 уровень
                  </button>
                </>
              )}

              {encounter.type === 'WORKERS' && (
                <>
                  <div className="text-center text-xs font-bold text-ink-faint">
                    {(data?.coins ?? 0) < 2 ? 'Не хватает монет' : `У вас ${data?.coins ?? 0} 🪙`}
                  </div>
                  <button
                    onClick={handleWorkersPay}
                    disabled={(data?.coins ?? 0) < 2}
                    className="w-full rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.85), rgba(255,180,0,0.9))', boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}
                  >
                    🪙 Заплатить 2 монеты
                  </button>
                  <button
                    onClick={handleWorkersRun}
                    className="w-full rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                    style={{ background: 'linear-gradient(135deg, rgba(255,68,68,0.85), rgba(200,40,40,0.9))', boxShadow: '0 0 16px rgba(255,68,68,0.3)' }}
                  >
                    Попытаться убежать
                  </button>
                </>
              )}

              {(encounter.type === 'FEMALE' || encounter.type === 'MALE' || encounter.type === 'WORKERS') && (hasJourneyItem('dubinka') || godMode) && (
                <button
                  onClick={handleDubinka}
                  className="w-full rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                  style={{ background: 'linear-gradient(135deg, rgba(139,69,19,0.85), rgba(120,55,15,0.9))', boxShadow: '0 0 16px rgba(139,69,19,0.3)' }}
                >
                  🪵 Припугнуть путника
                </button>
              )}

              {(encounter.type === 'FEMALE' || encounter.type === 'MALE') && (
                <>
                  <p
                    className="text-center text-sm font-black text-neon"
                    style={{ textShadow: '0 0 8px rgba(0,229,255,0.4)' }}
                  >
                    Ты мне доверяешь?
                  </p>
                  <p className="text-center text-xs font-bold text-ink-faint">
                    {encounter.type === 'FEMALE' ? 'Довериться страннице?' : 'Довериться страннику?'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleTrustYes}
                      className="flex-1 rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, rgba(57,255,20,0.85), rgba(40,200,10,0.9))', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }}
                    >
                      ДА
                    </button>
                    <button
                      onClick={handleTrustNo}
                      className="flex-1 rounded-xl py-3 text-center text-sm font-black text-bg transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, rgba(255,68,68,0.85), rgba(200,40,40,0.9))', boxShadow: '0 0 16px rgba(255,68,68,0.3)' }}
                    >
                      НЕТ
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // Game screen — fallback (not active)
  if (screen === 'game') {
    return (
      <div className="relative z-10 px-5 pb-8 pt-3 animate-fadeIn">
        <button onClick={() => setScreen('main')} className="mb-3 flex items-center gap-1 text-sm font-bold text-white hover:text-neon transition-colors" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
          <ChevronLeft size={16} /> Назад
        </button>
        <p className="text-center text-sm font-bold text-ink-faint">Путешествие скоро начнётся...</p>
      </div>
    )
  }

  // Main game screen
  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col px-3 pb-4 pt-1">
      {/* === TOP HUD === */}
      <div className="space-y-2">
        {/* Row 1: Back + Player card + Rules + Coins */}
        <div className="flex items-stretch gap-2">
          <button onClick={onBack} className="flex shrink-0 items-center rounded-lg px-1 py-1.5 text-sm font-bold text-white hover:text-neon transition-colors" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
            <ChevronLeft size={18} />
          </button>

          {/* Player card — 3 lines: ФИО / level+XP / XP bar */}
          <div
            className="flex min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-1.5"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,229,255,0.35)',
              boxShadow: '0 0 14px rgba(0,229,255,0.18)',
            }}
          >
            <p
              className="truncate font-black leading-tight text-neon"
              style={{
                fontSize: (playerName?.length ?? 0) > 22 ? '11px' : (playerName?.length ?? 0) > 16 ? '13px' : '15px',
                textShadow: '0 0 10px rgba(0,229,255,0.55)',
              }}
            >
              {playerName ?? ''}
            </p>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="shrink-0 text-[11px] font-black text-amber-300" style={{ textShadow: '0 0 8px rgba(255,215,0,0.5)' }}>
                ⭐ УР. {data?.playerLevel ?? 1}
              </span>
              <span className="shrink-0 text-[9px] font-bold text-ink-faint">{data?.playerXP ?? 0}/20 XP</span>
            </div>
            <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${((data?.playerXP ?? 0) / 20) * 100}%` }}
              />
            </div>
          </div>

          {/* Rules — compact icon button */}
          <button
            onClick={() => setShowRules(true)}
            aria-label="Правила"
            className="flex shrink-0 items-center justify-center rounded-xl border border-neon/40 bg-black/50 px-2.5 text-neon transition-all duration-150 hover:bg-neon/10 active:scale-90"
          >
            <BookOpen size={16} />
          </button>

          {/* Coins — compact */}
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-black/50 px-2.5">
            <span className="text-sm font-black text-amber-300" style={{ textShadow: '0 0 8px rgba(255,215,0,0.55)' }}>🪙 {data?.coins ?? 0}</span>
          </div>
        </div>

        {/* Row 2: Game action cards — 3 per row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: +2 монетки */}
         <div
  className="flex h-[58px] min-w-0 flex-col items-center justify-center rounded-xl px-2 py-2"
  style={{
    background: 'linear-gradient(135deg, rgba(255,190,0,0.14), rgba(255,120,0,0.06))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,190,0,0.45)',
    boxShadow: '0 0 14px rgba(255,190,0,0.12)',
  }}
>
            {reward3hReady ? (
              <button
  onClick={claim3hReward}
  className="w-full rounded-lg bg-amber-400 py-1.5 text-center text-xs font-black text-black transition-transform active:scale-95"
>
  <span>🪙 +2 МОНЕТКИ</span>
</button>
            ) : (
              <>
               <span
  className="text-xs font-black text-amber-300"
  style={{ textShadow: '0 0 7px rgba(255,190,0,0.55)' }}
>
  🪙 +2 МОНЕТКИ
</span>
               <span className="mt-0.5 min-w-[72px] whitespace-nowrap text-center text-[10px] font-bold tabular-nums text-ink-faint">
  через {formatCountdown(reward3hRemaining)}
</span>
              </>
            )}
          </div>

          {/* Card 2: Испытай удачу */}
          <button
            onClick={openLucky}
            disabled={luckyDone}
            className="flex flex-col items-center rounded-xl px-2 py-2 transition-all duration-150 active:scale-95 disabled:opacity-50"
            style={{
              background: luckyDone ? 'rgba(0,0,0,0.45)' : 'linear-gradient(135deg, rgba(255,43,214,0.15), rgba(0,229,255,0.1))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,43,214,0.3)',
              boxShadow: luckyDone ? 'none' : '0 0 14px rgba(255,43,214,0.12)',
            }}
          >
            <span className="text-xs font-black" style={{ color: luckyDone ? '#6b7280' : '#ff2bd6', textShadow: luckyDone ? 'none' : '0 0 6px rgba(255,43,214,0.4)' }}>🎁 ИСПЫТАЙ УДАЧУ</span>
            <span className="mt-0.5 min-w-[72px] whitespace-nowrap text-center text-[10px] font-bold tabular-nums text-ink-faint">
  {luckyDone ? `через ${formatCountdown(midnightRemaining)}` : 'доступно'}
</span>
          </button>

          {/* Card 3: Инвентарь */}
          <button
            onClick={() => setScreen('inventory')}
            className="flex flex-col items-center rounded-xl px-2 py-2 transition-all duration-150 active:scale-95"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span className="text-xs font-black text-ink">🎒 ИНВЕНТАРЬ</span>
            <span className="mt-0.5 text-[10px] font-bold text-ink-faint">
              {Object.values(data?.inventory ?? {}).filter((q) => q > 0).length} шт
            </span>
          </button>

         {/* Card 4: Магазиньш */}
<button
  onClick={() => setScreen('shop')}
  className="flex flex-col items-center rounded-xl px-2 py-2 transition-all duration-150 active:scale-90"
  style={{
    background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(90,40,150,0.06))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(168,85,247,0.45)',
    boxShadow: '0 0 14px rgba(168,85,247,0.12)',
  }}
>
  <span
    className="text-xs font-black"
    style={{ color: '#c084fc', textShadow: '0 0 7px rgba(168,85,247,0.55)' }}
  >
    🏪 МАГАЗИНЬШ
  </span>
  <span className="mt-0.5 text-[10px] font-bold text-ink-faint">
    {SHOP_ITEMS.length} товаров
  </span>
</button>

          {/* Card 5: Статистика */}
<button
  onClick={() => setShowStats(true)}
  className="flex flex-col items-center rounded-xl px-2 py-2 transition-all duration-150 active:scale-90"
  style={{
    background: 'linear-gradient(135deg, rgba(57,255,136,0.12), rgba(20,120,70,0.05))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(57,255,136,0.4)',
    boxShadow: '0 0 14px rgba(57,255,136,0.11)',
  }}
>
  <span
    className="text-xs font-black"
    style={{ color: '#39ff88', textShadow: '0 0 7px rgba(57,255,136,0.5)' }}
  >
    🏆 СТАТИСТИКА
  </span>
  <span className="mt-0.5 text-[10px] font-bold text-ink-faint">
    рейтинги
  </span>
</button>

          {/* Card 6: Reset — subtle */}
          <button
            onClick={() => setShowReset(true)}
            className="flex flex-col items-center justify-center rounded-xl px-2 py-2 transition-all duration-150 active:scale-95"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-[11px] font-bold text-ink-faint/60">Сбросить</span>
            <span className="mt-0.5 text-[10px] font-bold text-ink-faint/40">прогресс</span>
          </button>
        </div>
      </div>

      {/* === CENTRAL FREE SPACE === */}
      <div className="flex-1" />

      {/* === BOTTOM CTA === */}
      <div className="flex flex-col items-center gap-2">
        <button
  onClick={startJourney}
  className="relative w-full max-w-xs overflow-hidden rounded-xl py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition-transform active:scale-95"
  style={{
    background: 'linear-gradient(90deg, rgba(15,8,28,0.96), rgba(12,25,34,0.96), rgba(15,8,28,0.96))',
    border: '1px solid rgba(0,229,255,0.55)',
    boxShadow: '0 0 14px rgba(0,229,255,0.18), inset 0 0 14px rgba(255,43,214,0.06)',
    animation: 'journeyBreath 3s ease-in-out infinite',
  }}
>
  <span
    className="relative z-10"
    style={{
      textShadow: '0 0 8px rgba(0,229,255,0.6)',
    }}
  >
    ✦ НАЧАТЬ ПУТЕШЕСТВИЕ
  </span>
</button>
        <button
          onClick={handleHeartClick}
          className="mt-1 transition-transform active:scale-90"
          style={{
            color: godMode ? '#ff2bd6' : 'rgba(255,255,255,0.25)',
            textShadow: godMode ? '0 0 10px rgba(255,43,214,0.7)' : 'none',
          }}
          aria-label="Секрет"
        >
          <Heart size={16} fill={godMode ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Daily reward banner */}
      {showDaily && data && !dailyDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 animate-scaleIn" style={panelStyle}>
            <h2 className="text-center text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
              Ежедневная награда
            </h2>
            <div className="mt-4 flex justify-between gap-1.5">
              {DAILY_REWARDS.map((reward, i) => {
                const isCurrent = i === data.dailyDay - 1
                const isPast = i < data.dailyDay - 1
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center rounded-lg border py-2"
                    style={{
                      borderColor: isCurrent ? 'rgba(0,229,255,0.6)' : isPast ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)',
                      background: isCurrent ? 'rgba(0,229,255,0.1)' : isPast ? 'rgba(57,255,20,0.05)' : 'rgba(0,0,0,0.4)',
                      boxShadow: isCurrent ? '0 0 12px rgba(0,229,255,0.2)' : 'none',
                    }}
                  >
                    <span className="text-[9px] font-black text-ink-faint">Д{i + 1}</span>
                    <span className="text-xs font-black" style={{ color: isPast ? '#39ff14' : isCurrent ? '#00e5ff' : '#8b92a3' }}>{reward}🪙</span>
                  </div>
                )
              })}
            </div>
            <button onClick={claimDaily} className="mt-4 w-full rounded-lg bg-neon py-2.5 text-sm font-black text-bg transition-transform active:scale-95">
              Забрать
            </button>
          </div>
        </div>
      )}

      {/* Lucky boxes modal */}
      {showLucky && luckyBoxes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 animate-scaleIn" style={panelStyle}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
                🎁 Испытай удачу
              </h2>
              <button onClick={() => setShowLucky(false)} className="text-ink-muted"><X size={18} /></button>
            </div>
            <p className="mb-4 text-center text-xs font-bold text-ink-faint">{luckyPicked === null ? 'Выбери одну коробку' : 'Твой выбор'}</p>
            <div className="grid grid-cols-5 gap-2">
              {luckyBoxes.map((box) => {
                const isPicked = luckyPicked === box.id
                const isRevealed = luckyPicked !== null && (isPicked || luckyRevealed !== null)
                return (
                  <button
                    key={box.id}
                    onClick={() => pickBox(box.id)}
                    disabled={luckyPicked !== null}
                    className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 transition-all duration-300"
                    style={{
                      borderColor: isPicked ? (box.coins > 0 ? '#39ff14' : '#ff4444') : isRevealed ? 'rgba(255,255,255,0.15)' : 'rgba(0,229,255,0.4)',
                      background: isPicked ? (box.coins > 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,68,68,0.1)') : isRevealed ? 'rgba(0,0,0,0.5)' : 'rgba(0,229,255,0.05)',
                      boxShadow: isPicked ? `0 0 12px ${box.coins > 0 ? 'rgba(57,255,20,0.3)' : 'rgba(255,68,68,0.3)'}` : 'none',
                      transform: isPicked ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {isRevealed ? (
                      <span className="text-sm font-black" style={{ color: box.coins > 0 ? '#39ff14' : '#6b7280' }}>
                        {box.coins > 0 ? `${box.coins}🪙` : '—'}
                      </span>
                    ) : (
                      <Gift size={20} className="text-neon" />
                    )}
                  </button>
                )
              })}
            </div>
            {luckyPicked !== null && (
              <button onClick={() => setShowLucky(false)} className="mt-4 w-full rounded-lg bg-neon py-2.5 text-sm font-black text-bg transition-transform active:scale-95">
                Закрыть
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reset confirmation */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-xs rounded-2xl p-5 animate-scaleIn" style={panelStyle}>
            <p className="text-center text-sm font-black text-ink">Точно сбросить весь игровой прогресс?</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 rounded-lg border border-white/15 bg-black/50 py-2.5 text-sm font-bold text-ink transition-transform active:scale-95">
                Отмена
              </button>
              <button onClick={handleReset} className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-black text-white transition-transform active:scale-95">
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowRules(false)}>
          <div
            className="relative w-full max-w-sm rounded-2xl p-5 animate-scaleIn"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,229,255,0.35)',
              boxShadow: '0 0 24px rgba(0,229,255,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowRules(false)} className="absolute right-3 top-3 text-ink-muted hover:text-neon transition-colors"><X size={18} /></button>
            <h2 className="text-center text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.5)' }}>
              ПРАВИЛА ОБИТЕЛИ
            </h2>
            <p className="mt-4 text-sm font-bold leading-relaxed text-ink">
              Перед тобой четыре дороги. Некоторые ведут вперёд, некоторые назад, некоторые к встрече с путником, а некоторые — к гибели. Выбирай свой путь и продвигайся вперёд. Пройди все 20 уровней, покинь Обитель теней и доберись до Райского уголка.
            </p>
            <div className="mt-3 rounded-lg border border-neon/25 bg-neon/5 px-3 py-2 text-center">
              <p className="text-sm font-black text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.4)' }}>
                Твоя цель — пройти 20 уровней.
              </p>
            </div>
            <button onClick={() => setShowRules(false)} className="mt-4 w-full rounded-xl bg-neon py-2.5 text-sm font-black text-bg transition-transform active:scale-95">
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Statistics modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowStats(false)}>
          <div
            className="relative w-full max-w-sm rounded-2xl p-5 animate-scaleIn"
            style={{
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(0,229,255,0.35)',
              boxShadow: '0 0 28px rgba(0,229,255,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowStats(false)} className="absolute right-3 top-3 text-ink-muted hover:text-neon transition-colors"><X size={18} /></button>
            <h2 className="text-center text-lg font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 12px rgba(0,229,255,0.5)' }}>
              🏆 СТАТИСТИКА ОБИТЕЛИ ТЕНЕЙ
            </h2>

            <div className="mt-5 space-y-4">
              {/* Забеги */}
              <div className="rounded-xl border border-neon/20 bg-black/40 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neon/70">Забеги</p>
                <p className="mt-1 text-sm font-black text-ink">
                  {stats?.mostRuns.name ?? '—'} — {stats?.mostRuns.count ?? 0}
                </p>
              </div>

              {/* Рекордный уровень / Завершённые путешествия */}
              {stats?.hasCompletedAll ? (
                <div className="rounded-xl border border-neon/20 bg-black/40 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neon/70">Завершённые путешествия</p>
                  <p className="mt-1 text-sm font-black text-ink">
                    {stats.completedRuns.name} — {stats.completedRuns.count}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-neon/20 bg-black/40 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neon/70">Рекордный уровень</p>
                  <p className="mt-1 text-sm font-black text-ink">
                    {stats?.levelRecord.name ?? '—'} — {stats?.levelRecord.level ?? 0} уровень
                  </p>
                </div>
              )}

              {/* Разделитель */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-neon/15" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-ink-faint">Скоро</span>
                <div className="h-px flex-1 bg-neon/15" />
              </div>

              {/* Самый везучий */}
              <div className="rounded-xl border border-emerald-400/25 bg-black/40 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">🍀 Самый везучий</p>
                <p className="mt-1 text-sm font-black text-ink">
                  {stats?.luckiest.name ?? '—'}
                </p>
                {(stats?.luckiest.attempts ?? 0) > 0 ? (
                  <p className="text-[11px] font-bold text-emerald-300">
                    {Math.round(stats!.luckiest.rate)}% удач · {stats!.luckiest.successes}/{stats!.luckiest.attempts}
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-ink-faint">Пока нет данных</p>
                )}
              </div>

              {/* Самый невезучий */}
              <div className="rounded-xl border border-red-400/25 bg-black/40 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400/80">☠️ Самый невезучий</p>
                <p className="mt-1 text-sm font-black text-ink">
                  {stats?.unluckiest.name ?? '—'}
                </p>
                {(stats?.unluckiest.attempts ?? 0) > 0 ? (
                  <p className="text-[11px] font-bold text-red-300">
                    {Math.round(stats!.unluckiest.rate)}% неудач · {stats!.unluckiest.failures}/{stats!.unluckiest.attempts}
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-ink-faint">Пока нет данных</p>
                )}
              </div>
            </div>

            <button onClick={() => setShowStats(false)} className="mt-5 w-full rounded-xl bg-neon py-2.5 text-sm font-black text-bg transition-transform active:scale-95">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-bold backdrop-blur-md"
          style={{
            borderColor: toastError ? 'rgba(255,68,68,0.5)' : 'rgba(0,229,255,0.5)',
            background: 'rgba(0,0,0,0.9)',
            color: toastError ? '#ff4444' : '#00e5ff',
            boxShadow: toastError ? '0 0 20px rgba(255,68,68,0.3)' : '0 0 20px rgba(0,229,255,0.3)',
          }}
        >
          {toast}
        </div>
      )}

      {/* God Mode modal */}
      {showGodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fadeIn" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowGodModal(false)}>
          <div
            className="relative w-full max-w-xs rounded-2xl p-5 animate-scaleIn"
            style={{
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,43,214,0.35)',
              boxShadow: '0 0 24px rgba(255,43,214,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowGodModal(false)} className="absolute right-3 top-3 text-ink-muted hover:text-neon transition-colors"><X size={18} /></button>
            {godMode ? (
              <>
                <h2 className="text-center text-base font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(255,43,214,0.5)' }}>
                  Режим Бога активен
                </h2>
                <button onClick={handleGodToggleOff} className="mt-5 w-full rounded-lg bg-red-500/80 py-2.5 text-sm font-black text-white transition-transform active:scale-95">
                  ВЫКЛЮЧИТЬ
                </button>
              </>
            ) : (
              <>
                <h2 className="text-center text-base font-black uppercase tracking-wider text-neon" style={{ textShadow: '0 0 10px rgba(255,43,214,0.5)' }}>
                  Введите пароль
                </h2>
                <input
                  type="password"
                  value={godPasswordInput}
                  onChange={(e) => { setGodPasswordInput(e.target.value); setGodPasswordError(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGodSubmit() }}
                  autoFocus
                  className="mt-4 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-center text-sm font-bold text-white outline-none focus:border-neon/50"
                  placeholder="•••••"
                />
                {godPasswordError && (
                  <p className="mt-2 text-center text-xs font-bold text-red-400">Неверный пароль</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setShowGodModal(false)} className="flex-1 rounded-lg border border-white/15 bg-black/50 py-2.5 text-sm font-bold text-ink transition-transform active:scale-95">
                    Отмена
                  </button>
                  <button onClick={handleGodSubmit} className="flex-1 rounded-lg bg-neon py-2.5 text-sm font-black text-bg transition-transform active:scale-95">
                    Войти
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* God Mode toast */}
      {godToast && (
        <div
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-black backdrop-blur-md animate-fadeIn"
          style={{
            borderColor: 'rgba(255,43,214,0.5)',
            background: 'rgba(0,0,0,0.9)',
            color: '#ff2bd6',
            boxShadow: '0 0 20px rgba(255,43,214,0.3)',
          }}
        >
          {godToast}
        </div>
      )}
    </div>
  )
}
