import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, DoorOpen, Smile } from 'lucide-react'
import {
  assignNick, fetchMessages, getMyNick, nickColor, sendMessage,
  type ChatMessage,
} from '../lib/fludilka'
import { todayKey } from '../lib/storage'
import { api } from '../lib/api'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FludilkaTab({ onBack }: { onBack: () => void }) {
  const [myNick, setMyNick] = useState<string | null>(null)
  const [nickIntro, setNickIntro] = useState<string | null>(null)
  const [noNicks, setNoNicks] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [dayKey, setDayKey] = useState(todayKey())
  const [sendError, setSendError] = useState<string | null>(null)
  const [newDayToast, setNewDayToast] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  // Initial load: get nick + messages
  useEffect(() => {
    void (async () => {
      const day = todayKey()
      const existing = await getMyNick()
      if (existing) {
        setMyNick(existing)
      } else {
        const result = await assignNick()
        if (result.ok) {
          setMyNick(result.nickname)
          setNickIntro(result.nickname)
          setTimeout(() => setNickIntro(null), 3000)
        } else {
          setNoNicks(true)
        }
      }
      const msgs = await fetchMessages(day)
      setMessages(msgs)
      scrollToBottom()
    })()
  }, [scrollToBottom])

  // Polling for new messages
  useEffect(() => {
    const poll = () => {
      void (async () => {
        const day = todayKey()
        if (day !== dayKey) {
          setDayKey(day)
          return
        }
        try {
          const msgs = await api.getMessages(day)
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const fresh = msgs.filter((m) => !existingIds.has(m.id))
            return fresh.length ? [...prev, ...fresh] : prev
          })
        } catch { /* ignore */ }
      })()
    }
    const timer = window.setInterval(poll, 5000)
    return () => { window.clearInterval(timer) }
  }, [dayKey])

  // Midnight rollover check
  useEffect(() => {
    const check = () => {
      const newDay = todayKey()
      if (newDay !== dayKey) {
        setDayKey(newDay)
        setNewDayToast(true)
        setMessages([])
        void (async () => {
          const result = await assignNick()
          if (result.ok) {
            setMyNick(result.nickname)
            setNickIntro(result.nickname)
            setTimeout(() => setNickIntro(null), 3000)
          } else {
            setNoNicks(true)
            setMyNick(null)
          }
          const msgs = await fetchMessages(newDay)
          setMessages(msgs)
          scrollToBottom()
        })()
        setTimeout(() => setNewDayToast(false), 3500)
      }
    }
    const timer = window.setInterval(check, 15000)
    return () => window.clearInterval(timer)
  }, [dayKey, scrollToBottom])

  const handleSend = async () => {
    if (!myNick || sending) return
    const trimmed = input.trim()
    if (!trimmed) return
    setSending(true)
    setSendError(null)
    const result = await sendMessage(myNick, trimmed)
    if (result.ok && result.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message!.id)) return prev
        return [...prev, result.message!]
      })
      setInput('')
      scrollToBottom()
    } else {
      setSendError(result.error || 'Не удалось отправить сообщение')
    }
    setSending(false)
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 pb-4 pt-10" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        <ArrowLeft size={18} /> Назад
      </button>

      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink">💬 ФЛУДИЛКА</h1>
        {myNick && (
          <div className="rounded-full border border-neon/30 bg-black/50 px-3 py-1 text-xs font-bold" style={{ color: nickColor(myNick) }}>
            👤 {myNick}
          </div>
        )}
      </div>

     {/* Messages area */}
<div
  ref={scrollRef}
  className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-line bg-black/40 p-3"
  style={{ minHeight: '300px' }}
>
  {noNicks ? (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <p className="text-sm font-bold text-ink">
        Сегодня во Флудилке слишком людно 👀
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Свободные личности закончились.
      </p>
    </div>
  ) : messages.length === 0 ? (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-ink-muted">
        Чат пуст. Напиши первым!
      </p>
    </div>
  ) : (
    messages.map((msg) => {
      const color = nickColor(msg.nickname)
      const isMine = msg.nickname === myNick

      return (
        <div
          key={msg.id}
         className={`max-w-[88%] rounded-2xl border p-3 animate-scaleIn transition-all duration-300 ${
  isMine
    ? 'ml-auto border-neon/50 bg-neon/10'
    : 'mr-auto border-line bg-black/40'
}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-xs font-black"
              style={{ color }}
            >
              👤 {msg.nickname}
            </span>

            <span className="text-[10px] text-ink-faint">
              {formatTime(msg.created_at)}
            </span>
          </div>

          <p className="mt-2 break-words text-sm text-ink">
            {msg.message}
          </p>
        </div>
      )
    })
  )}

 
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {myNick && (
        <>
          {sendError && (
            <p className="mt-2 text-xs font-bold text-error">Не удалось отправить сообщение</p>
          )}
          <div className="mt-1 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 300))}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSend() }}
            placeholder="Написать сообщение..."
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-input px-4 text-sm text-ink outline-none focus:border-neon/50 placeholder:text-ink-faint"
            maxLength={300}
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon text-bg transition-transform active:scale-90 disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send size={18} />
          </button>
          <button
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon/30 bg-black/50 text-neon transition-transform active:scale-90"
            aria-label="Выйти"
          >
            <DoorOpen size={18} />
          </button>
          </div>
        </>
      )}

      {/* Nick intro toast */}
      {nickIntro && (
        <div className="fixed left-1/2 top-1/3 z-[55] -translate-x-1/2 rounded-2xl border border-neon/40 bg-black/90 px-6 py-4 text-center backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}>
          <p className="text-xs font-black text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.5)' }}>СЕГОДНЯ ТЫ —</p>
          <p className="mt-1 text-base font-extrabold" style={{ color: nickColor(nickIntro) }}>{nickIntro}</p>
        </div>
      )}

      {/* New day toast */}
      {newDayToast && (
        <div className="fixed left-1/2 top-1/3 z-[55] -translate-x-1/2 rounded-2xl border border-neon/40 bg-black/90 px-6 py-4 text-center backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}>
          <p className="text-sm font-extrabold text-ink">🌑 НАСТУПИЛ НОВЫЙ ДЕНЬ</p>
        </div>
      )}
    </div>
  )
}