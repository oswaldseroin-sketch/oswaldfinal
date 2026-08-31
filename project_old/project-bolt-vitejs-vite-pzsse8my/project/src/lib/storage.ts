const PREFIX = 'amalgama-'

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
