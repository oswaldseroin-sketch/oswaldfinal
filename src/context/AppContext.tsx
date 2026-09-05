import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Employee, Meme } from '../types'
import { workersList as fallbackWorkers, type Worker } from '../lib/data'
import { api, type TeamStatsRow } from '../lib/api'
import { getItem, setItem, removeItem } from '../lib/storage'
import { setCurrentPlayerName as setGamePlayerName } from '../lib/gameStorage'

type Stats = { weight: number; happiness: number; balance: number; titleLevel: number; titleXP: number }
export type TeamStats = Record<string, Stats>

export type CurrentUser = { id: number; name: string }

const CURRENT_USER_KEY = 'current-user'

type AppContextValue = {
  employees: Employee[]
  workers: Worker[]
  teamStats: TeamStats
  memes: Meme[]
  isAdmin: boolean
  loading: boolean
  error: string | null
  currentUser: CurrentUser | null
  login: (name: string) => boolean
  switchUser: () => void
  logout: () => void
  unlock: (password: string) => boolean
  lock: () => void
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) => Promise<boolean>
  updateEmployeeDate: (id: string, access_date: string) => Promise<boolean>
  deleteEmployee: (id: string) => Promise<boolean>
  addWorker: (name: string, gender: Worker['gender']) => Promise<boolean>
  removeWorker: (name: string) => Promise<boolean>
  adjustTeamStats: (workerName: string, delta: { weight: number; happiness: number; balance: number }) => Promise<boolean>
  adjustTitleXP: (workerName: string) => Promise<{ newLevel: number; newXp: number; leveledUp: boolean } | null>
  addMeme: (description: string, imageUrl: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function mapRowToStats(row: TeamStatsRow): Stats {
  return {
    weight: row.weight,
    happiness: row.happiness,
    balance: row.balance,
    titleLevel: row.title_level ?? 1,
    titleXP: row.title_xp ?? 0,
  }
}

function mapStats(rows: TeamStatsRow[]): TeamStats {
  return Object.fromEntries(rows.map((row) => [row.worker_name, mapRowToStats(row)]))
}

const POLL_INTERVAL = 15000

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workers, setWorkers] = useState<Worker[]>(fallbackWorkers)
  const [teamStats, setTeamStats] = useState<TeamStats>({})
  const [memes, setMemes] = useState<Meme[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    return getItem<CurrentUser | null>(CURRENT_USER_KEY, null)
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [employeeData, workerData, statsData, memeData] = await Promise.all([
        api.getEmployees(),
        api.getWorkers(),
        api.getTeamStats(),
        api.getMemes(),
      ])

      setEmployees(employeeData ?? [])
      setWorkers(workerData?.length ? workerData : fallbackWorkers)
      setTeamStats(statsData ? mapStats(statsData) : {})
      setMemes(memeData ?? [])
    } catch {
      setError('Не удалось загрузить данные с сервера')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    localStorage.removeItem('employees-v1')
    localStorage.removeItem('memes-v1')
    localStorage.removeItem('team-life-stats-v3')
    void refresh()

    const timer = window.setInterval(() => { void refresh() }, POLL_INTERVAL)
    return () => { window.clearInterval(timer) }
  }, [refresh])

  const unlock = (password: string): boolean => {
    if (password !== '3010') return false
    setIsAdmin(true)
    return true
  }

  const lock = (): void => setIsAdmin(false)

  const login = useCallback((name: string): boolean => {
  const worker = workers.find(
    (w) => w.name === name
  )

  if (!worker) return false

  const user: CurrentUser = {
    id: Number(worker.id),
    name: worker.name,
  }

  setCurrentUser(user)
  setItem(CURRENT_USER_KEY, user)
  setGamePlayerName(worker.name)

  return true
}, [workers])

  const switchUser = useCallback((): void => {
    setCurrentUser(null)
    removeItem(CURRENT_USER_KEY)
  }, [])

  const logout = useCallback((): void => {
    setCurrentUser(null)
    removeItem(CURRENT_USER_KEY)
    setGamePlayerName(null)
  }, [])

  const addEmployee = async (data: Omit<Employee, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      await api.addEmployee(data)
      await refresh()
      return true
    } catch {
      return false
    }
  }
const updateEmployeeDate = async (id: string, access_date: string): Promise<boolean> => {
  try {
    const updated = await api.updateEmployeeDate(id, access_date)

    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === id ? updated : employee
      )
    )

    return true
  } catch (err) {
    console.error('Update employee date error:', err)
    return false
  }
}
  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      await api.deleteEmployee(id)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const addWorker = async (name: string, gender: Worker['gender']): Promise<boolean> => {
    try {
      await api.addWorker(name, gender)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const removeWorker = async (name: string): Promise<boolean> => {
    try {
      await api.removeWorker(name)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const adjustTeamStats = async (workerName: string, delta: { weight: number; happiness: number; balance: number }): Promise<boolean> => {
    try {
      const row = await api.adjustTeamStats(workerName, delta.weight, delta.happiness, delta.balance)
      setTeamStats((current) => ({ ...current, [row.worker_name]: mapRowToStats(row) }))
      return true
    } catch {
      return false
    }
  }

  const adjustTitleXP = async (workerName: string): Promise<{ newLevel: number; newXp: number; leveledUp: boolean } | null> => {
    try {
      const allStats = await api.getTeamStats()
      const row = allStats.find((r) => r.worker_name === workerName)
      const curLevel = row?.title_level ?? 1
      const curXP = row?.title_xp ?? 0
      if (curLevel >= 25) {
        setTeamStats((c) => ({ ...c, [workerName]: { ...c[workerName], titleLevel: 25, titleXP: 10 } }))
        return { newLevel: 25, newXp: 10, leveledUp: false }
      }
      let newXP = curXP + 1
      let newLevel = curLevel
      let leveledUp = false
      if (newXP >= 10) {
        newXP = 0
        newLevel = Math.min(curLevel + 1, 25)
        leveledUp = true
      }
      await api.updateTitle(workerName, newLevel, newXP)
      setTeamStats((c) => ({ ...c, [workerName]: { ...c[workerName], titleLevel: newLevel, titleXP: newXP } }))
      return { newLevel, newXp: newXP, leveledUp }
    } catch {
      return null
    }
  }

  const addMeme = async (description: string, imageUrl: string): Promise<boolean> => {
    try {
      await api.addMeme(description, imageUrl || null)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const value = useMemo(
    () => ({ employees, workers, teamStats, memes, isAdmin, loading, error, currentUser, login, switchUser, logout, unlock, lock, addEmployee,updateEmployeeDate, deleteEmployee, addWorker, removeWorker, adjustTeamStats, adjustTitleXP, addMeme, refresh }),
    [employees, workers, teamStats, memes, isAdmin, loading, error, currentUser, login, switchUser, logout, refresh, updateEmployeeDate],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider is missing')
  return ctx
}
