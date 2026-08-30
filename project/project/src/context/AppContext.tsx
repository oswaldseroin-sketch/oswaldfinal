import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Employee, Meme } from '../types'
import { workersList as fallbackWorkers, type Worker } from '../lib/data'
import { supabase } from '../lib/supabase'

type Stats = { weight: number; happiness: number; balance: number; titleLevel: number; titleXP: number }
export type TeamStats = Record<string, Stats>

type AppContextValue = {
  employees: Employee[]
  workers: Worker[]
  teamStats: TeamStats
  memes: Meme[]
  isAdmin: boolean
  loading: boolean
  error: string | null
  unlock: (password: string) => boolean
  lock: () => void
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) => Promise<boolean>
  deleteEmployee: (id: string) => Promise<boolean>
  addWorker: (name: string, gender: Worker['gender']) => Promise<boolean>
  removeWorker: (name: string) => Promise<boolean>
  adjustTeamStats: (workerName: string, delta: { weight: number; happiness: number; balance: number }) => Promise<boolean>
  adjustTitleXP: (workerName: string) => Promise<{ newLevel: number; newXp: number; leveledUp: boolean } | null>
  addMeme: (description: string, imageUrl: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function mapStats(rows: Array<{ worker_name: string; weight: number; happiness: number; balance: number; title_level: number; title_xp: number }>): TeamStats {
  return Object.fromEntries(rows.map((row) => [row.worker_name, {
    weight: row.weight,
    happiness: row.happiness,
    balance: row.balance,
    titleLevel: row.title_level ?? 1,
    titleXP: row.title_xp ?? 0,
  }]))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workers, setWorkers] = useState<Worker[]>(fallbackWorkers)
  const [teamStats, setTeamStats] = useState<TeamStats>({})
  const [memes, setMemes] = useState<Meme[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [employeeResult, workerResult, statsResult, memeResult] = await Promise.all([
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('game_workers').select('name, gender').order('name'),
      supabase.from('team_stats').select('worker_name, weight, happiness, balance, title_level, title_xp'),
      supabase.from('memes').select('*').order('created_at', { ascending: false }),
    ])

    const onlineEmployees = employeeResult.data as Employee[] | null
    if (employeeResult.error && !onlineEmployees?.length) setError('Не удалось загрузить общую базу заявок')
    setEmployees(onlineEmployees ?? [])
    setWorkers(workerResult.data?.length ? workerResult.data as Worker[] : fallbackWorkers)
    setTeamStats(statsResult.data ? mapStats(statsResult.data) : {})
    setMemes(memeResult.data as Meme[] ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    localStorage.removeItem('employees-v1')
    localStorage.removeItem('memes-v1')
    localStorage.removeItem('team-life-stats-v3')
    void refresh()
    const channel = supabase
      .channel('shared-app-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_workers' }, () => { void refresh() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_stats' }, (payload) => {
        const row = payload.new as { worker_name?: string; weight?: number; happiness?: number; balance?: number; title_level?: number; title_xp?: number }
        if (row.worker_name && typeof row.weight === 'number' && typeof row.happiness === 'number' && typeof row.balance === 'number') {
          setTeamStats((current) => ({ ...current, [row.worker_name as string]: {
            weight: row.weight as number,
            happiness: row.happiness as number,
            balance: row.balance as number,
            titleLevel: row.title_level ?? 1,
            titleXP: row.title_xp ?? 0,
          } }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, () => { void refresh() })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [refresh])

  const unlock = (password: string): boolean => {
    if (password !== '3010') return false
    setIsAdmin(true)
    return true
  }

  const lock = (): void => setIsAdmin(false)

  const addEmployee = async (data: Omit<Employee, 'id' | 'created_at'>): Promise<boolean> => {
    const { error: insertError } = await supabase.from('employees').insert({
      full_name: data.full_name,
      organization: data.organization,
      access_date: data.access_date,
      record_type: data.record_type,
      vehicle_type: data.vehicle_type,
    })
    if (insertError) return false
    await refresh()
    return true
  }

  const deleteEmployee = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('employees').delete().eq('id', id)
    if (deleteError) return false
    await refresh()
    return true
  }

  const addWorker = async (name: string, gender: Worker['gender']): Promise<boolean> => {
    const { error: workerError } = await supabase.from('game_workers').insert({ name, gender })
    if (workerError) return false
    await supabase.from('team_stats').insert({ worker_name: name, weight: 0, happiness: 0, balance: 0 })
    await refresh()
    return true
  }

  const removeWorker = async (name: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('game_workers').delete().eq('name', name)
    if (deleteError) return false
    await refresh()
    return true
  }

  const adjustTeamStats = async (workerName: string, delta: { weight: number; happiness: number; balance: number }): Promise<boolean> => {
    const { data, error: adjustError } = await supabase.rpc('adjust_team_stats', {
      p_worker_name: workerName,
      p_weight: delta.weight,
      p_happiness: delta.happiness,
      p_balance: delta.balance,
    })
    if (adjustError || !data) return false
    const row = data as { worker_name: string; weight: number; happiness: number; balance: number; title_level: number; title_xp: number }
    setTeamStats((current) => ({ ...current, [row.worker_name]: {
      weight: row.weight,
      happiness: row.happiness,
      balance: row.balance,
      titleLevel: row.title_level ?? 1,
      titleXP: row.title_xp ?? 0,
    } }))
    return true
  }

  const adjustTitleXP = async (workerName: string): Promise<{ newLevel: number; newXp: number; leveledUp: boolean } | null> => {
    const { data: current } = await supabase
      .from('team_stats')
      .select('title_level, title_xp')
      .eq('worker_name', workerName)
      .maybeSingle()
    const curLevel = (current as { title_level?: number } | null)?.title_level ?? 1
    const curXP = (current as { title_xp?: number } | null)?.title_xp ?? 0
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
    const { error: updateError } = await supabase
      .from('team_stats')
      .update({ title_level: newLevel, title_xp: newXP })
      .eq('worker_name', workerName)
    if (updateError) return null
    setTeamStats((c) => ({ ...c, [workerName]: { ...c[workerName], titleLevel: newLevel, titleXP: newXP } }))
    return { newLevel, newXp: newXP, leveledUp }
  }

  const addMeme = async (description: string, imageUrl: string): Promise<boolean> => {
    const { error: insertError } = await supabase.from('memes').insert({ description, image_url: imageUrl || null })
    if (insertError) return false
    await refresh()
    return true
  }

  const value = useMemo(
    () => ({ employees, workers, teamStats, memes, isAdmin, loading, error, unlock, lock, addEmployee, deleteEmployee, addWorker, removeWorker, adjustTeamStats, adjustTitleXP, addMeme, refresh }),
    [employees, workers, teamStats, memes, isAdmin, loading, error, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider is missing')
  return ctx
}
