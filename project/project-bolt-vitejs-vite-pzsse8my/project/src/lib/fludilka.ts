import { supabase } from './supabase'
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

export type ChatMessage = {
  id: string
  user_id: string
  nickname: string
  message: string
  chat_day: string
  created_at: string
}

export type AssignResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: 'no_nicks_left' }

export async function getMyNick(): Promise<string | null> {
  const deviceId = getDeviceId()
  const day = todayKey()
  const { data } = await supabase
    .from('chat_nicks')
    .select('nickname')
    .eq('user_id', deviceId)
    .eq('chat_day', day)
    .maybeSingle()
  return (data as { nickname?: string } | null)?.nickname ?? null
}

export async function assignNick(): Promise<AssignResult> {
  const deviceId = getDeviceId()
  const day = todayKey()

  const existing = await getMyNick()
  if (existing) return { ok: true, nickname: existing }

  const { data: taken } = await supabase
    .from('chat_nicks')
    .select('nickname')
    .eq('chat_day', day)

  const takenSet = new Set((taken as { nickname: string }[] | null ?? []).map((r) => r.nickname))
  const available = NICKNAMES.filter((n) => !takenSet.has(n))
  if (available.length === 0) return { ok: false, reason: 'no_nicks_left' }

  const pick = available[Math.floor(Math.random() * available.length)]
  const { error } = await supabase
    .from('chat_nicks')
    .insert({ user_id: deviceId, nickname: pick, chat_day: day })

  if (error) {
    const retry = await getMyNick()
    if (retry) return { ok: true, nickname: retry }
    return { ok: false, reason: 'no_nicks_left' }
  }
  return { ok: true, nickname: pick }
}

export async function fetchMessages(day: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_day', day)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error || !data) return []
  return data as ChatMessage[]
}

export async function sendMessage(nickname: string, text: string): Promise<{ ok: boolean; message: ChatMessage | null; error: string | null }> {
  const deviceId = getDeviceId()
  const day = todayKey()
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 300) return { ok: false, message: null, error: 'Пустое сообщение' }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: deviceId, nickname, message: trimmed, chat_day: day })
    .select('*')
    .single()
  if (error) {
    console.error('[fludilka] insert error:', error.message, error.code, error.details)
    return { ok: false, message: null, error: error.message }
  }
  return { ok: true, message: data as ChatMessage, error: null }
}

export async function countTodayMessages(): Promise<number> {
  const day = todayKey()
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_day', day)
  if (error || count === null) return 0
  return count
}
