import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, Search, ShieldCheck, Trash2, User, Truck, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Employee } from '../types'
import BackButton from '../components/BackButton'

function isExpired(date: string): boolean {
  return new Date(`${date}T23:59:59`).getTime() < Date.now()
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}.${month}.${year}` : date
}

function parseDate(dateStr: string): string | null {
  const parts = dateStr.trim().split('.')
  if (parts.length !== 3) return null
  let [day, month, year] = parts
  day = day.padStart(2, '0')
  month = month.padStart(2, '0')
  if (year.length === 2) year = '20' + year
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return null
  return `${year}-${month}-${day}`
}

type AddType = 'person' | 'vehicle' | null
type PanelMode = 'add' | 'delete' | null

export default function ApplicationsTab({ onBack }: { onBack: () => void }) {
  const { employees, addEmployee, updateEmployeeDate, deleteEmployee, loading, error } = useApp()
  const [search, setSearch] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [addType, setAddType] = useState<AddType>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [pName, setPName] = useState('')
  const [pOrg, setPOrg] = useState('')
  const [pDate, setPDate] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  const [vPlate, setVPlate] = useState('')
  const [vOrg, setVOrg] = useState('')
  const [vType, setVType] = useState('')
  const [vDate, setVDate] = useState('')

  const [deleteSearch, setDeleteSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [editDate, setEditDate] = useState('')
const [editingDate, setEditingDate] = useState(false)

  const activeEmployees = useMemo(() => employees.filter((e) => !isExpired(e.access_date)), [employees])
  const expiredCount = employees.length - activeEmployees.length

  const query = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!query) return []
    return activeEmployees.filter((e) => {
      const haystack = [e.full_name, e.organization, e.vehicle_type ?? ''].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeEmployees, query])

  const delQuery = deleteSearch.trim().toLowerCase()
  const deleteResults = useMemo(() => {
    if (!delQuery) return []
    return employees.filter((e) => {
      const haystack = [e.full_name, e.organization, e.vehicle_type ?? ''].join(' ').toLowerCase()
      return haystack.includes(delQuery)
    })
  }, [employees, delQuery])

  const closeDetail = (): void => {
    setSelected(null)
    setDeleteConfirm(false)
  }

  const closePanel = (): void => {
    setPanelMode(null)
    setAddType(null)
  }

  const submitPerson = async (): Promise<void> => {
    const date = parseDate(pDate)
    if (!pName.trim() || !pOrg.trim() || !date) return
    const ok = await addEmployee({
      full_name: pName.trim(),
      organization: pOrg.trim(),
      access_date: date,
      record_type: 'person',
      vehicle_type: null,
    })
   if (ok) {
  setPName('')
  setAddSuccess(true)
  setTimeout(() => setAddSuccess(false), 2000)
}
  }

  const submitVehicle = async (): Promise<void> => {
    const date = parseDate(vDate)
    if (!vPlate.trim() || !date) return
    const ok = await addEmployee({
      full_name: vPlate.trim().toUpperCase(),
      organization: vOrg.trim() || '—',
      access_date: date,
      record_type: 'vehicle',
      vehicle_type: vType.trim() || null,
    })
if (ok) {
  setVPlate('')
  setVOrg('')
  setVType('')
  setVDate('')
  setAddSuccess(true)
  setTimeout(() => setAddSuccess(false), 2000)
}
  }
const handleUpdateDate = async (): Promise<void> => {
  if (!selected) return

  const date = parseDate(editDate)
  if (!date) return

  const ok = await updateEmployeeDate(selected.id, date)

  if (ok) {
    setSelected({
      ...selected,
      access_date: date,
    })
    setEditingDate(false)
    setEditDate('')
  }
}
  const handleDelete = async (): Promise<void> => {
    if (!selected) return
    await deleteEmployee(selected.id)
    closeDetail()
  }

  const handleDeleteFromSearch = async (): Promise<void> => {
    if (!deleteTarget) return
    await deleteEmployee(deleteTarget.id)
    setDeleteTarget(null)
  }

  const showResults = query && filtered.length > 0
  const showEmpty = query && filtered.length === 0

  return (
    <div className="mx-auto max-w-md px-6 pb-10 pt-10">

      <BackButton onBack={onBack} />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">АМАЛЬГАМА / 01</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">Заявки</h1>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-success" style={{ boxShadow: '0 0 6px rgba(34,255,136,0.6)' }} />
          <span className="text-[9px] tracking-wide text-ink-muted">СИСТЕМА ОНЛАЙН</span>
        </div>
      </div>

      {/* Main search */}
      <div className="flex h-16 items-center rounded-2xl border border-neon/30 bg-input/70 px-5 backdrop-blur-md transition-colors focus-within:border-neon/70 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.18)]">
        <Search size={22} color="#8b92a3" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск: ФИО, фамилия, организация, госномер..."
          className="ml-3 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
          aria-label="Поиск сотрудников и машин"
        />
        {search && (
          <button onClick={() => setSearch('')} className="ml-2 shrink-0 text-ink-muted" aria-label="Очистить поиск">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className={`${search.trim() ? 'hidden' : 'flex'} mb-5 mt-4 items-stretch rounded-2xl border border-line bg-card/70 py-4 backdrop-blur-md`}>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-2xl font-extrabold text-neon">{activeEmployees.length}</span>
          <span className="mt-1 text-center text-[9px] tracking-widest text-ink-muted">ВСЕГО В БАЗЕ</span>
        </div>
        <div className="h-10 w-px bg-line" />
        <div className="flex flex-1 flex-col items-center">
          <span className={`text-2xl font-extrabold ${expiredCount > 0 ? 'text-error' : 'text-success'}`}>{expiredCount}</span>
          <span className="mt-1 text-center text-[9px] tracking-widest text-ink-muted">ПРОСРОЧЕНО ДОПУСКОВ</span>
        </div>
      </div>

      {error && <p className="mb-3 text-xs text-error">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted">Загрузка базы сотрудников и машин...</p>
      ) : showEmpty ? (
        <div className="flex flex-col items-center px-6 py-16">
          <ShieldCheck size={34} color="#5a6172" />
          <p className="mt-4 text-base font-bold text-ink">Ничего не найдено</p>
          <p className="mt-2 text-center text-xs text-ink-muted">Попробуйте фамилию, организацию или госномер</p>
        </div>
      ) : showResults ? (
        <div className="space-y-3 pb-4">
          {filtered.map((employee) => {
            const expired = isExpired(employee.access_date)
            const isVehicle = employee.record_type === 'vehicle'
            return (
              <button
                key={employee.id}
                onClick={() => { setSelected(employee); setDeleteConfirm(false) }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  expired
                    ? 'border-error/60 bg-error/5 shadow-[0_0_18px_rgba(255,61,90,0.14)]'
                    : 'border-success/40 bg-success/5 shadow-[0_0_18px_rgba(34,255,136,0.1)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-extrabold text-ink">{employee.full_name}</p>
                    <p className="mt-1 text-xs text-ink-muted">{employee.organization}</p>
                    {isVehicle && employee.vehicle_type && (
                      <p className="mt-0.5 text-xs text-ink-muted">{employee.vehicle_type}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-extrabold tracking-wide ${expired ? 'border-error/50 text-error' : 'border-success/50 text-success'}`}>
                    {expired ? 'ПРОСРОЧЕН' : 'АКТИВЕН'}
                  </span>
                </div>
                <div className="mt-4 border-t border-white/5 pt-3">
                  <p className="text-[10px] tracking-wide text-ink-muted">
                    СРОК ДОПУСКА: <span className={expired ? 'font-bold text-error' : 'font-bold text-success'}>{formatDate(employee.access_date)}</span>
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Floating + button */}
      <button
        onClick={() => { setPanelMode('add'); setAddType(null) }}
        className="fixed bottom-6 right-4 z-30 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-neon text-bg shadow-lg transition-transform active:scale-90"
        style={{ boxShadow: '0 4px 18px rgba(0,229,255,0.55)' }}
        aria-label="Добавить заявку"
      >
        <Plus size={27} strokeWidth={2.8} />
      </button>

      {/* ===== Add panel ===== */}
      {panelMode === 'add' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 animate-fadeIn" onClick={closePanel}>
          <div className="w-full max-w-[460px] rounded-t-3xl border-t border-neon/25 bg-card p-5 pb-8 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Новая заявка</h2>
              <button onClick={closePanel} className="text-ink-muted" aria-label="Закрыть"><X size={19} /></button>
            </div>

            {addType === null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => setAddType('person')} className="flex flex-col items-center gap-2 rounded-2xl border border-neon/30 bg-neon/5 p-5 transition-transform active:scale-95">
                  <User size={26} color="#00e5ff" />
                  <span className="text-sm font-bold text-ink">ЧЕЛОВЕК</span>
                </button>
                <button onClick={() => setAddType('vehicle')} className="flex flex-col items-center gap-2 rounded-2xl border border-neon/30 bg-neon/5 p-5 transition-transform active:scale-95">
                  <Truck size={26} color="#00e5ff" />
                  <span className="text-sm font-bold text-ink">ТРАНСПОРТ</span>
                </button>
              </div>
            )}

            {addType === 'person' && (
              <div className="mt-4">
                <div className="space-y-2.5">
                  <div>
                    <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="ФИО" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {pName && <button onClick={() => setPName('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                  <div>
                    <input value={pOrg} onChange={(e) => setPOrg(e.target.value)} placeholder="Организация" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {pOrg && <button onClick={() => setPOrg('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                  <div>
                    <input value={pDate} onChange={(e) => setPDate(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {pDate && <button onClick={() => setPDate('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                </div>
{addSuccess && (
  <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-center text-sm font-extrabold text-green-400">
    ✓ УСПЕШНО ДОБАВЛЕН
  </div>
)}                <button onClick={() => void submitPerson()} disabled={!pName.trim() || !pOrg.trim() || !pDate.trim()} className="mt-4 h-11 w-full rounded-lg bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95 disabled:opacity-40">ДОБАВИТЬ</button>
                <button onClick={() => setPanelMode('delete')} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-error/40 bg-error/10 text-sm font-extrabold text-error transition-transform active:scale-95">
                  <Trash2 size={15} /> УДАЛИТЬ СОТРУДНИКА ИЗ БАЗЫ
                </button>
                <button onClick={() => setAddType(null)} className="mt-2 h-10 w-full rounded-lg border border-line text-sm font-bold text-ink-muted transition-transform active:scale-95">← НАЗАД</button>
              </div>
            )}

            {addType === 'vehicle' && (
              <div className="mt-4">
                <div className="space-y-2.5">
                  <div>
                    <input value={vPlate} onChange={(e) => setVPlate(e.target.value)} placeholder="Госномер / название" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {vPlate && <button onClick={() => setVPlate('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                  <div>
                    <input value={vOrg} onChange={(e) => setVOrg(e.target.value)} placeholder="Организация" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {vOrg && <button onClick={() => setVOrg('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                  <div>
                    <input value={vType} onChange={(e) => setVType(e.target.value)} placeholder="Вид транспорта" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {vType && <button onClick={() => setVType('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                  <div>
                    <input value={vDate} onChange={(e) => setVDate(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="h-10 w-full rounded-lg border border-line bg-input px-3 py-2 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint" />
                    {vDate && <button onClick={() => setVDate('')} className="mt-0.5 text-[10px] font-bold text-ink-muted active:scale-95">× Очистить</button>}
                  </div>
                </div>
{addSuccess && (
  <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-center text-sm font-extrabold text-green-400">
    ✓ УСПЕШНО ДОБАВЛЕН
  </div>
)}                <button onClick={() => void submitVehicle()} disabled={!vPlate.trim() || !vDate.trim()} className="mt-4 h-11 w-full rounded-lg bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95 disabled:opacity-40">ДОБАВИТЬ</button>
                <button onClick={() => setPanelMode('delete')} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-error/40 bg-error/10 text-sm font-extrabold text-error transition-transform active:scale-95">
                  <Trash2 size={15} /> УДАЛИТЬ ТРАНСПОРТ ИЗ БАЗЫ
                </button>
                <button onClick={() => setAddType(null)} className="mt-2 h-10 w-full rounded-lg border border-line text-sm font-bold text-ink-muted transition-transform active:scale-95">← НАЗАД</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Delete-by-search panel ===== */}
      {panelMode === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 animate-fadeIn" onClick={closePanel}>
          <div className="flex max-h-[85vh] w-full max-w-[460px] flex-col rounded-t-3xl border-t border-neon/25 bg-card p-5 pb-8 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Удалить сотрудника</h2>
              <button onClick={closePanel} className="text-ink-muted" aria-label="Закрыть"><X size={19} /></button>
            </div>

            {/* Search */}
            <div className="mt-4 flex h-11 items-center rounded-xl border border-line bg-input px-3 transition-colors focus-within:border-neon/50">
              <Search size={18} color="#8b92a3" />
              <input
                value={deleteSearch}
                onChange={(e) => setDeleteSearch(e.target.value)}
                placeholder="Поиск: ФИО, организация, госномер..."
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                aria-label="Поиск для удаления"
              />
              {deleteSearch && (
                <button onClick={() => setDeleteSearch('')} className="ml-1 text-ink-muted" aria-label="Очистить"><X size={16} /></button>
              )}
            </div>

            {/* Results */}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
              {delQuery && deleteResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">Ничего не найдено</p>
              ) : delQuery ? (
                deleteResults.map((employee) => {
                  const isVehicle = employee.record_type === 'vehicle'
                  return (
                    <button
                      key={employee.id}
                      onClick={() => setDeleteTarget(employee)}
                      className="w-full rounded-xl border border-line bg-input/60 p-3 text-left transition-colors active:scale-[0.98]"
                    >
                      <p className="break-words text-sm font-bold text-ink">{employee.full_name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{employee.organization}</p>
                      {isVehicle && employee.vehicle_type && (
                        <p className="text-xs text-ink-muted">{employee.vehicle_type}</p>
                      )}
                      <p className="mt-1 text-[10px] text-ink-faint">{formatDate(employee.access_date)}</p>
                    </button>
                  )
                })
              ) : (
                <p className="py-8 text-center text-sm text-ink-muted">Введите имя, организацию или госномер</p>
              )}
            </div>

            <button onClick={() => { setPanelMode('add'); setDeleteSearch('') }} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-bold text-ink-muted transition-transform active:scale-95">
              <ArrowLeft size={16} /> НАЗАД
            </button>
          </div>
        </div>
      )}

      {/* ===== Delete confirmation modal ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-fadeIn" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-error/30 bg-card p-6 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-error/10">
              <Trash2 size={20} color="#ff3b5c" />
            </div>
            <h2 className="text-lg font-extrabold text-ink">Удалить эту запись из базы?</h2>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-ink-muted"><span className="text-ink-faint">ФИО: </span>{deleteTarget.full_name}</p>
              <p className="text-sm text-ink-muted"><span className="text-ink-faint">Организация: </span>{deleteTarget.organization}</p>
              {deleteTarget.record_type === 'vehicle' && deleteTarget.vehicle_type && (
                <p className="text-sm text-ink-muted"><span className="text-ink-faint">Вид транспорта: </span>{deleteTarget.vehicle_type}</p>
              )}
              <p className="text-sm text-ink-muted"><span className="text-ink-faint">Дата окончания: </span>{formatDate(deleteTarget.access_date)}</p>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-xl border border-line text-sm font-bold text-ink-muted transition-transform active:scale-95">ОТМЕНА</button>
              <button onClick={() => void handleDeleteFromSearch()} className="h-11 flex-1 rounded-xl bg-error text-sm font-extrabold text-white transition-transform active:scale-95">УДАЛИТЬ</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Detail modal (from main list) ===== */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 animate-fadeIn" onClick={closeDetail}>
          <div className="w-full max-w-sm rounded-2xl border border-neon/25 bg-card p-6 animate-scaleIn" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon/10">
                {selected.record_type === 'vehicle' ? <Truck size={20} color="#00e5ff" /> : <User size={20} color="#00e5ff" />}
              </div>
              <button onClick={closeDetail} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink" aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>

            <h2 className="break-words text-xl font-extrabold text-ink">{selected.full_name}</h2>

            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink-muted"><span className="text-ink-faint">Организация: </span>{selected.organization}</p>
              {selected.record_type === 'vehicle' && selected.vehicle_type && (
                <p className="text-sm text-ink-muted"><span className="text-ink-faint">Вид транспорта: </span>{selected.vehicle_type}</p>
              )}
              <p className="text-sm text-ink-muted">
                <span className="text-ink-faint">Срок допуска: </span>
                <span className={isExpired(selected.access_date) ? 'font-bold text-error' : 'font-bold text-success'}>{formatDate(selected.access_date)}</span>
              </p>
              <p className="text-sm text-ink-muted">
                <span className="text-ink-faint">Статус: </span>
                <span className={isExpired(selected.access_date) ? 'font-bold text-error' : 'font-bold text-success'}>
                  {isExpired(selected.access_date) ? 'Просрочен' : 'Активен'}
                </span>
              </p>
            </div>

            {deleteConfirm ? (
              <div className="mt-5">
                <p className="mb-3 text-sm font-bold text-ink">Удалить эту запись?</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(false)} className="h-11 flex-1 rounded-xl border border-line text-sm font-bold text-ink-muted transition-transform active:scale-95">Отмена</button>
                  <button onClick={() => void handleDelete()} className="h-11 flex-1 rounded-xl bg-error text-sm font-extrabold text-white transition-transform active:scale-95">Удалить</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                <button onClick={closeDetail} className="h-11 w-full rounded-xl border border-line text-sm font-bold text-ink transition-transform active:scale-95">ЗАКРЫТЬ</button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-error/40 bg-error/10 text-sm font-extrabold text-error transition-transform active:scale-95"
                >
                  <Trash2 size={16} /> УДАЛИТЬ ИЗ БАЗЫ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
