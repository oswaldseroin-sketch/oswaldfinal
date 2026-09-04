import { useMemo, useState } from 'react'
import { Search, X, LogIn, HelpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL

export default function LoginScreen() {
  const { workers, login } = useApp()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


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

    if (!answer.trim()) {
  setError('Введите ответ')
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
  answer: answer.trim(),
  name: selected,
}),

      const data = await res.json()

      if (!res.ok || !data.ok) {
    setError(data.error || 'Неверный ответ')
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
            type="text"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            placeholder="Ваш ответ..."
            
            className="h-13 min-w-0 flex-1 rounded-xl border border-line bg-input px-4 py-3 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
          />

         
        </div>

        {error && (
          <p className="mt-2 text-xs text-error">
            {error}
          </p>
        )}

       

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
    </div>
  )
}