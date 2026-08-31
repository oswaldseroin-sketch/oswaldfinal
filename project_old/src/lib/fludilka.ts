import { api, type ChatMessage } from './api'
import { getItem, setItem, todayKey } from './storage'

export const NICKNAMES: string[] = [
  'Котлетозавр',
  'Пельменебог',
  'Подсобный-Демон',
  'Семяшкоглаз',
  'Бронеборщ',
  'Шизакрыл',
  'Мясодрево',
  'Солнцеед',
  'Шептуноид',
  'Слизебрюх',
  'Кошмароход',
  'Слюнопад',
  'Мракобес',
  'Пузоверт',
  'Мыслежор',
  'Слюнохлеб',
  'Мозгоправ',
]

export const NICK_COLORS: string[] = [
  '#ff6b9d', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8a5c',
  '#c792ea', '#82aaff', '#f78c6c', '#89ddff', '#c3e88d',
  '#ffcb6b', '#7fdb8a', '#e1bee7', '#80cbc4', '#f48fb1',
  '#b39ddb', '#ffcc80',
]

export function nickColor(nick: string): string {
  let hash = 0
  for (let i = 0; i < nick.length; i++) {
    hash = ((hash << 5) - hash) + nick.charCodeAt(i)
    hash |= 0
  }
  return NICK_COLORS[Math.abs(hash) % NICK_COLORS.length]
}

const DEVICE_ID_KEY = 'fludilka-device-id'

export function getDeviceId(): string {
  let id = getItem<string | null>(DEVICE_ID_KEY, null)
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export type AssignResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: 'no_nicks_left' }

export async function getMyNick(): Promise<string | null> {
  const deviceId = getDeviceId()
  const day = todayKey()
  try {
    const res = await api.getMyNick(deviceId, day)
    return res.nickname ?? null
  } catch {
    return null
  }
}

export async function assignNick(): Promise<AssignResult> {
  const deviceId = getDeviceId()
  const day = todayKey()

  const existing = await getMyNick()
  if (existing) return { ok: true, nickname: existing }

  try {
    const taken = await api.getTakenNicks(day)
    const takenSet = new Set(taken ?? [])
    const available = NICKNAMES.filter((n) => !takenSet.has(n))
    if (available.length === 0) return { ok: false, reason: 'no_nicks_left' }

    const pick = available[Math.floor(Math.random() * available.length)]
    await api.assignNick(deviceId, pick, day)
    return { ok: true, nickname: pick }
  } catch {
    const retry = await getMyNick()
    if (retry) return { ok: true, nickname: retry }
    return { ok: false, reason: 'no_nicks_left' }
  }
}

export async function fetchMessages(day: string): Promise<ChatMessage[]> {
  try {
    return await api.getMessages(day)
  } catch {
    return []
  }
}

export async function sendMessage(nickname: string, text: string): Promise<{ ok: boolean; message: ChatMessage | null; error: string | null }> {
  const deviceId = getDeviceId()
  const day = todayKey()
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 300) return { ok: false, message: null, error: 'Пустое сообщение' }
  try {
    const message = await api.sendMessage(deviceId, nickname, trimmed, day)
    return { ok: true, message, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Не удалось отправить'
    return { ok: false, message: null, error: msg }
  }
}

export async function countTodayMessages(): Promise<number> {
  const day = todayKey()
  try {
    const res = await api.getMessageCount(day)
    return res.count ?? 0
  } catch {
    return 0
  }
}
