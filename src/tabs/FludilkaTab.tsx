import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, DoorOpen, Smile } from 'lucide-react'
import {
  assignNick, fetchMessages, getMyNick, nickColor, sendMessage,
  type ChatMessage,
} from '../lib/fludilka'
import { todayKey } from '../lib/storage'
import { api } from '../lib/api'

const SERVER_URL = import.meta.env.VITE_API_URL

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function renderMessage(
  message: string,
  emojis: SpecialEmoji[]
) {
  const parts = message.split(/(\[emoji:\d+\])/g)

  return parts.map((part, index) => {
    const match = part.match(/\[emoji:(\d+)\]/)

    if (match) {
      const emoji = emojis.find(
        (e) => e.id === Number(match[1])
      )

      if (emoji) {
        return (
          <img
            key={index}
            src={`${SERVER_URL}${emoji.image_url}`}
            className={`inline-block rounded-2xl object-cover align-middle ${
  message.trim() === `[emoji:${emoji.id}]`
    ? 'h-20 w-20'
    : 'h-10 w-10'
}`}
          />
        )
      }
    }

    return <span key={index}>{part}</span>
  })
}
export default function FludilkaTab({ onBack }: { onBack: () => void }) {
  const [myNick, setMyNick] = useState<string | null>(null)
  const [nickIntro, setNickIntro] = useState<string | null>(null)
  const [noNicks, setNoNicks] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [selectedEmojis, setSelectedEmojis] = useState<SpecialEmoji[]>([])
  const [sending, setSending] = useState(false)
  const [dayKey, setDayKey] = useState(todayKey())
  const [sendError, setSendError] = useState<string | null>(null)
 const [emojiOpen, setEmojiOpen] = useState(false)

type SpecialEmoji = {
  id: number
  name: string
  image_url: string
  locked: boolean
}

const [emojis, setEmojis] = useState<SpecialEmoji[]>([])

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
      try {
  const emojiData = await api.getChatEmojis()

  if (emojiData.ok) {
    setEmojis(emojiData.emojis)
  }
} catch {
  console.log('Emoji loading error')
}
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

if (!trimmed && selectedEmojis.length === 0) return
    setSending(true)
    setSendError(null)
    const result = await sendMessage(myNick, trimmed)
    if (result.ok && result.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.message!.id)) return prev
        return [...prev, result.message!]
      })
      setInput('')
      setSelectedEmojis([])
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
 className="h-[calc(100dvh-260px)] space-y-1.5 overflow-y-auto rounded-2xl bg-black/20 px-1 py-2"
 
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
      const onlyEmoji = /^\[emoji:\d+\]$/.test(msg.message.trim())

      return (
       <div
 key={msg.id}
 className={`${onlyEmoji ? 'bg-transparent border-0 p-0' : 'max-w-[78%] rounded-2xl px-3 py-2'} animate-scaleIn transition-all duration-300 ${
  isMine
    ? 'ml-auto bg-neon/15 rounded-br-md shadow-[0_0_15px_rgba(0,229,255,0.12)]'
    : 'mr-auto bg-white/[0.04] rounded-bl-md'
}`}
        >
         {!onlyEmoji && (
<div className="flex items-center justify-between gap-2 mb-1">
            <span
              className="text-xs font-black"
              style={{ color }}
            >
              👤 {msg.nickname}
            </span>

            <span className="text-[9px] opacity-50">
              {formatTime(msg.created_at)}
            </span>
         </div>
)}

<p className="break-words text-sm text-ink">
  {renderMessage(msg.message, emojis)}
</p>
        </div>
      )
    })
  )}

 
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {selectedEmojis.length > 0 && (
  <div className="mb-2 flex gap-2 rounded-xl border border-neon/20 bg-black/40 p-2">
    {selectedEmojis.map((emoji) => (
      <img
        key={emoji.id}
        src={`${SERVER_URL}${emoji.image_url}`}
        className="h-10 w-10 rounded-xl object-cover"
      />
    ))}
  </div>
)}
      {myNick && (
        <>
          {sendError && (
            <p className="mt-2 text-xs font-bold text-error">Не удалось отправить сообщение</p>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-black/30 p-2">
            <button
  onClick={() => setEmojiOpen((v) => !v)}
  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon/30 bg-black/50 text-neon transition-transform active:scale-90"
>
  <Smile size={20} />
</button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 300))}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSend() }}
            placeholder="Написать сообщение..."
            className="h-10 min-w-0 flex-1 rounded-xl bg-black/30 px-4 text-sm text-ink outline-none placeholder:text-ink-faint"
            maxLength={300}
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || (!input.trim() && selectedEmojis.length === 0)}
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
{emojiOpen && (
  <div className="fixed bottom-20 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-2xl border border-neon/40 bg-black/90 p-4 backdrop-blur-md"
    style={{
      boxShadow: '0 0 30px rgba(0,229,255,0.25)',
    }}
  >

    <p className="mb-3 text-xs font-black tracking-widest text-neon">
     🔥 ОСОБЫЕ СМАЙЛИКИ
    </p>

<div className="grid grid-cols-3 gap-4">
  {emojis.map((emoji) => (
    <button
      key={emoji.id}
      onClick={() => {
        if (!emoji.locked) {
          setInput((prev) => prev + ` [emoji:${emoji.id}] `)
          setSelectedEmojis((prev) => [...prev, emoji])
          setEmojiOpen(false)
        }
      }}
     className="
relative flex items-center justify-center
transition-all
hover:scale-110
active:scale-90
"
    >
      <img
        src={`${SERVER_URL}${emoji.image_url}`}
        className={`h-24 w-24 object-contain transition-all ${
          emoji.locked
            ? 'opacity-25 grayscale'
            : 'drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]'
        }`}
      />

      {emoji.locked && (
     <span
 className="
 absolute inset-0 flex items-center justify-center
 text-3xl
 animate-pulse
 "
>
 🔒
</span>
      )}
    </button>
  ))}
</div>

  </div>
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