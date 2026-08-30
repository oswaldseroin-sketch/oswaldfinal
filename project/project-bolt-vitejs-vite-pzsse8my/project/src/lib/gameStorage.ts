import { getItem, setItem, removeItem } from './storage'

export type EffectType =
  | 'reveal_path'
  | 'protect_death'
  | 'protect_death_chance'
  | 'skip_levels_chance'
  | 'highlight_path'

export type ShopItem = {
  id: string
  name: string
  price: number
  description: string
  type: EffectType
  subtype?: string
  icon: string
}

export type PlayerData = {
  name: string
  coins: number
  reward3hAt: number
  dailyDay: number
  dailyClaimedDate: string
  luckyDate: string
  inventory: Record<string, number>
  runs: number
  maxLevel: number
  completedRuns: number
  playerLevel: number
  playerXP: number
  luckAttempts: number
  luckSuccesses: number
  luckFailures: number
}

const PLAYERS_KEY = 'game-players'
const CURRENT_KEY = 'game-current-player'

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'key_doubleka',
    name: 'Ключи от Двойки',
    price: 2,
    description: 'Позволяет узнать, что находится на тропе №2.',
    type: 'reveal_path',
    subtype: '2',
    icon: '🔑',
  },
  {
    id: 'dubinka',
    name: 'Дубинка',
    price: 4,
    description: 'Припугни незнакомца — с шансом 50% он проведёт тебя вперёд на 3 уровня.',
    type: 'skip_levels_chance',
    subtype: '50%:3',
    icon: '🪓',
  },
  {
    id: 'bronozhilet',
    name: 'Бронежилет',
    price: 5,
    description: 'Защищает от смерти.',
    type: 'protect_death',
    icon: '🦺',
  },
  {
    id: 'kaska',
    name: 'Каска',
    price: 3,
    description: 'С шансом 50% защищает от смерти.',
    type: 'protect_death_chance',
    subtype: '50%',
    icon: '⛑️',
  },
  {
    id: 'otrazhaying_zhilet',
    name: 'Отражающий жилет',
    price: 2,
    description: 'С шансом 25% спасает от смерти.',
    type: 'protect_death_chance',
    subtype: '25%',
    icon: '🧥',
  },
  {
    id: 'bushido_pink',
    name: 'Бушидо розовое',
    price: 3,
    description: 'Позволяет посмотреть, что находится на тропах №1 и №4.',
    type: 'reveal_path',
    subtype: '1,4',
    icon: '☕',
  },
  {
    id: 'binokl',
    name: 'Бинокль',
    price: 5,
    description: 'На протяжении следующих 3 уровней подсвечивает тропу №3.',
    type: 'highlight_path',
    subtype: '3:3',
    icon: '🔭',
  },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}

function defaultPlayerData(name: string): PlayerData {
  return {
    name,
    coins: 0,
    reward3hAt: Date.now() + THREE_HOURS_MS,
    dailyDay: 1,
    dailyClaimedDate: '',
    luckyDate: '',
    inventory: {},
    runs: 0,
    maxLevel: 0,
    completedRuns: 0,
    playerLevel: 1,
    playerXP: 0,
    luckAttempts: 0,
    luckSuccesses: 0,
    luckFailures: 0,
  }
}

export function getAllPlayers(): Record<string, PlayerData> {
  return getItem<Record<string, PlayerData>>(PLAYERS_KEY, {})
}

export function getCurrentPlayerName(): string | null {
  return getItem<string | null>(CURRENT_KEY, null)
}

export function setCurrentPlayerName(name: string | null): void {
  if (name === null) {
    removeItem(CURRENT_KEY)
  } else {
    setItem(CURRENT_KEY, name)
  }
}

export function getPlayerData(name: string): PlayerData {
  const players = getAllPlayers()
  return players[name] ?? defaultPlayerData(name)
}

export function savePlayerData(name: string, data: PlayerData): void {
  const players = getAllPlayers()
  players[name] = data
  setItem(PLAYERS_KEY, players)
}

export function resetPlayerData(name: string): void {
  const players = getAllPlayers()
  players[name] = defaultPlayerData(name)
  setItem(PLAYERS_KEY, players)
}

export const REWARD_INTERVAL_MS = THREE_HOURS_MS

export const DAILY_REWARDS = [1, 2, 3, 4, 5, 6, 10]

export const LUCKY_BOXES = [
  { id: 0, coins: 2 },
  { id: 1, coins: 3 },
  { id: 2, coins: 4 },
  { id: 3, coins: 5 },
  { id: 4, coins: 0 },
]

export const MAX_LEVELS = 20

export type GameStats = {
  mostRuns: { count: number; name: string }
  levelRecord: { level: number; name: string }
  hasCompletedAll: boolean
  completedRuns: { count: number; name: string }
  luckiest: { name: string; rate: number; successes: number; attempts: number }
  unluckiest: { name: string; rate: number; failures: number; attempts: number }
}

export function getGameStats(): GameStats {
  const players = getAllPlayers()
  const entries = Object.values(players)

  let mostRuns = { count: 0, name: '—' }
  let levelRecord = { level: 0, name: '—' }
  let completedRuns = { count: 0, name: '—' }
  let hasCompletedAll = false
  let luckiest = { name: '—', rate: -1, successes: 0, attempts: 0 }
  let unluckiest = { name: '—', rate: -1, failures: 0, attempts: 0 }

  for (const p of entries) {
    if (p.runs > mostRuns.count) {
      mostRuns = { count: p.runs, name: p.name }
    }
    if (p.maxLevel > levelRecord.level) {
      levelRecord = { level: p.maxLevel, name: p.name }
    }
    if (p.completedRuns > 0) {
      hasCompletedAll = true
      if (p.completedRuns > completedRuns.count) {
        completedRuns = { count: p.completedRuns, name: p.name }
      }
    }
    const attempts = p.luckAttempts ?? 0
    if (attempts > 0) {
      const successes = p.luckSuccesses ?? 0
      const failures = p.luckFailures ?? 0
      const rate = (successes / attempts) * 100
      const badRate = (failures / attempts) * 100
      if (rate > luckiest.rate || (rate === luckiest.rate && attempts > luckiest.attempts)) {
        luckiest = { name: p.name, rate, successes, attempts }
      }
      if (badRate > unluckiest.rate || (badRate === unluckiest.rate && attempts > unluckiest.attempts)) {
        unluckiest = { name: p.name, rate: badRate, failures, attempts }
      }
    }
  }

  return {
    mostRuns,
    levelRecord,
    hasCompletedAll,
    completedRuns,
    luckiest,
    unluckiest,
  }
}

export function buyItem(playerName: string, itemId: string): { success: boolean; message: string } {
  const item = getShopItem(itemId)
  if (!item) return { success: false, message: 'Товар не найден' }

  const data = getPlayerData(playerName)
  if (data.coins < item.price) return { success: false, message: 'Недостаточно монет' }

  data.coins -= item.price
  data.inventory[itemId] = (data.inventory[itemId] ?? 0) + 1
  savePlayerData(playerName, data)
  return { success: true, message: `Куплено: ${item.name}` }
}
