import { useState } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function AdminLock({ inline = false, onClose }: { inline?: boolean; onClose?: () => void }) {
  const { isAdmin, unlock, lock } = useApp()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setOpen(false)
    onClose?.()
  }

  const submit = () => {
    if (unlock(password)) {
      setPassword('')
      setError('')
      close()
    } else {
      setError('Неверный пароль')
    }
  }

  return (
    <>
      {!inline && (
        <button
          onClick={() => (isAdmin ? lock() : setOpen(true))}
          className="fixed bottom-5 left-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/70 shadow-lg backdrop-blur-md transition-transform active:scale-90"
          title={isAdmin ? 'Выйти из админа' : 'Доступ администратора'}
        >
          <LockKeyhole size={17} color={isAdmin ? '#22ff88' : '#8b92a3'} strokeWidth={2.2} />
        </button>
      )}

      {inline && !open && (
        <div className="fixed bottom-20 left-5 z-40 rounded-xl border border-line bg-card/70 px-3 py-2 text-xs text-ink-muted backdrop-blur-md shadow-xl">
          {isAdmin ? 'Режим администратора активен' : 'Нажмите замок ещё раз'}
          <button onClick={() => (isAdmin ? lock() : setOpen(true))} className="ml-2 font-bold text-neon">
            {isAdmin ? 'Выйти' : 'Войти'}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 animate-fadeIn" onClick={close}>
          <div className="relative w-full max-w-sm rounded-2xl border border-neon/25 bg-card/80 p-6 backdrop-blur-md animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} className="absolute right-4 top-4 text-ink-muted"><X size={19} /></button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neon/10"><LockKeyhole size={22} color="#00e5ff" /></div>
            <h2 className="text-xl font-extrabold text-ink">Доступ администратора</h2>
            <p className="mt-1 text-sm text-ink-muted">Введите пароль, чтобы открыть управление</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Пароль"
              inputMode="numeric"
              className="mt-4 h-13 w-full rounded-xl border border-line bg-input px-4 py-3 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
            />
            {error && <p className="mt-2 text-xs text-error">{error}</p>}
            <button onClick={submit} className="mt-4 h-12 w-full rounded-xl bg-neon text-sm font-extrabold text-bg transition-transform active:scale-95">Открыть доступ</button>
          </div>
        </div>
      )}
    </>
  )
}
