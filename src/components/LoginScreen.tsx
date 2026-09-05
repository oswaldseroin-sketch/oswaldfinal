import { useMemo, useState } from 'react'
import { Search, X, LogIn, HelpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL

export default function LoginScreen() {
  const { workers, login, addWorker, removeWorker, unlock, isAdmin } = useApp()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
const [adminOpen, setAdminOpen] = useState(false)
const [newWorkerName, setNewWorkerName] = useState('')
const [newWorkerGender, setNewWorkerGender] = useState<'м' | 'ж'>('м')
const [adminPassword, setAdminPassword] = useState('')
const [adminError, setAdminError] = useState('')
  const [secretOpen, setSecretOpen] = useState(false)
  const [secretAnswer, setSecretAnswer] = useState('')
  const [secretError, setSecretError] = useState('')
  const [revealedPassword, setRevealedPassword] = useState('')
  const [nextChangeAt, setNextChangeAt] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers
    return workers.filter((w) => w.name.toLowerCase().includes(q))
  }, [workers, search])

  const submit = async (): Promise<void> => {
    if (!selected) {
      setError('Выберите ФИО')
      return
    }

    if (!password.trim()) {
      setError('Введите пароль')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Неверный пароль')
        return
      }

      login(selected)
    } catch {
      setError('Сервер недоступен')
    } finally {
      setLoading(false)
    }
  }

  const revealPassword = async (): Promise<void> => {
    if (!secretAnswer.trim()) {
      setSecretError('Введите ответ')
      return
    }

    setSecretError('')
    setRevealedPassword('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/reveal-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: secretAnswer.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setSecretError(data.error || 'Неверный ответ')
        return
      }

      setRevealedPassword(data.password)
      setNextChangeAt(data.nextChangeAt)
    } catch {
      setSecretError('Сервер недоступен')
    }
  }
const createWorker = async (): Promise<void> => {
  const name = newWorkerName.trim()

  if (!name) return

  const ok = await addWorker(name, newWorkerGender)

  if (ok) {
    setNewWorkerName('')
  }
}
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-12">
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold tracking-[0.25em] text-neon">
          АМАЛЬГАМА
        </p>

        <h1 className="mt-2 text-3xl font-extrabold text-ink">
          Добро пожаловать!
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Выберите ФИО и введите пароль для входа
        </p>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-[10px] font-bold tracking-widest text-ink-muted">
          ВАШЕ ФИО
        </label>

        <div className="mb-2 flex h-10 items-center rounded-lg border border-line bg-input px-3">
          <Search size={16} color="#8b92a3" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск ФИО..."
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-ink-muted"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line bg-black/40 p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Ничего не найдено
            </p>
          ) : (
            filtered.map((w) => (
              <button
                key={w.name}
                onClick={() => setSelected(w.name)}
                className={`block w-full rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition-colors active:scale-[0.98] ${
                  selected === w.name
                    ? 'border-neon/50 bg-neon/10 text-neon'
                    : 'border-line bg-input/50 text-ink hover:bg-neon/5'
                }`}
              >
                {w.name}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-[10px] font-bold tracking-widest text-ink-muted">
          ПАРОЛЬ
        </label>

        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            placeholder="Пароль"
            inputMode="numeric"
            className="h-13 min-w-0 flex-1 rounded-xl border border-line bg-input px-4 py-3 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
          />

          <button
            type="button"
            onClick={() => {
              setSecretOpen((v) => !v)
              setSecretError('')
            }}
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl border border-neon/30 bg-neon/10 text-neon transition active:scale-95"
            title="Узнать текущий пароль"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-error">
            {error}
          </p>
        )}

        {secretOpen && (
          <div className="mt-3 rounded-xl border border-neon/25 bg-black/40 p-4">
            <p className="text-[10px] font-bold tracking-widest text-neon">
              СЕКРЕТНЫЙ ВОПРОС
            </p>

            <p className="mt-2 text-sm font-bold text-ink">
              Имя которое нравится Пруткевич Е Р?
            </p>

            <input
              value={secretAnswer}
              onChange={(e) => {
                setSecretAnswer(e.target.value)
                setSecretError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && void revealPassword()}
              placeholder="Ответ..."
              className="mt-3 h-11 w-full rounded-xl border border-line bg-input px-3 text-sm text-ink outline-none focus:border-neon/50"
            />

            <button
              type="button"
              onClick={() => void revealPassword()}
              className="mt-3 h-11 w-full rounded-xl border border-neon/40 bg-neon/15 text-sm font-extrabold text-neon transition active:scale-95"
            >
              УЗНАТЬ ПАРОЛЬ
            </button>

            {secretError && (
              <p className="mt-2 text-xs text-error">
                {secretError}
              </p>
            )}

            {revealedPassword && (
              <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                <p className="text-[10px] font-bold tracking-widest text-success">
                  ТЕКУЩИЙ ПАРОЛЬ
                </p>

                <p className="mt-1 text-3xl font-black tracking-[0.2em] text-ink">
                  {revealedPassword}
                </p>

                {nextChangeAt && (
                  <p className="mt-1 text-[10px] text-ink-muted">
                    Пароль автоматически сменится через 3-часовой период
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
<button
  type="button"
  onClick={() => setAdminOpen(true)}
  className="mt-4 text-xs font-bold text-ink-muted hover:text-neon"
>
  🔒 Управление сотрудниками
</button>
      <button
        onClick={() => void submit()}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95 disabled:opacity-50"
        style={{
          boxShadow: '0 4px 16px rgba(0,229,255,0.35)',
        }}
      >
        <LogIn size={18} />

        {loading ? 'ПРОВЕРКА...' : 'ВОЙТИ'}
      </button>
      {adminOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
    <div className="w-full max-w-md rounded-2xl border border-neon/30 bg-card p-5">

      <h2 className="text-xl font-black text-neon">
        Сотрудники
      </h2>

      {!isAdmin ? (
        <>
          <input
            value={adminPassword}
            onChange={(e)=>setAdminPassword(e.target.value)}
            placeholder="Пароль админа"
            className="mt-4 h-12 w-full rounded-xl bg-input px-4"
          />

          <button
            onClick={()=>{
              if(!unlock(adminPassword)){
                setAdminError('Неверный пароль')
              }
            }}
            className="mt-3 w-full rounded-xl bg-neon py-3 font-black text-black"
          >
            ВОЙТИ
          </button>

          {adminError && (
            <p className="mt-2 text-error text-xs">
              {adminError}
            </p>
          )}
        </>
      ) : (
        <>
          <input
            value={newWorkerName}
            onChange={(e)=>setNewWorkerName(e.target.value)}
            placeholder="ФИО"
            className="mt-4 h-12 w-full rounded-xl bg-input px-4"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={()=>setNewWorkerGender('м')}
              className="rounded-xl border p-3"
            >
              👨 Муж
            </button>

            <button
              onClick={()=>setNewWorkerGender('ж')}
              className="rounded-xl border p-3"
            >
              👩 Жен
            </button>
          </div>

          <button
            onClick={()=>void createWorker()}
            className="mt-3 w-full rounded-xl bg-neon py-3 font-black text-black"
          >
            ДОБАВИТЬ
          </button>

          <div className="mt-5 space-y-2">
            {workers.map((w)=>(
              <div
                key={w.name}
                className="flex justify-between rounded-xl border p-3"
              >
                <span>{w.name}</span>

                <button
                  onClick={()=>void removeWorker(w.name)}
                  className="text-red-400"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  </div>
)}
    </div>
  )
}