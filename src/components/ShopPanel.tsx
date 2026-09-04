import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Coins, Lock, Send } from 'lucide-react'
import { api, type ShopItem, type PlayerInventoryItem, type RadioMessage } from '../lib/api'
import { useApp } from '../context/AppContext'

type Props = {
  onBack: () => void
  profileCoins: number
  onPurchaseComplete: () => void
}

export default function ShopPanel({ onBack, profileCoins, onPurchaseComplete }: Props) {
  const { currentUser } = useApp()
  const playerId = String(currentUser?.id ?? '')
  const [items, setItems] = useState<ShopItem[]>([])
  const [inventory, setInventory] = useState<PlayerInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [radioMode, setRadioMode] = useState(false)

 const loadData = useCallback(async () => {
  if (!playerId) {
    setLoading(false)
    return
  }

  try {
    const [shopItems, inv] = await Promise.all([
      api.getShopItems(),
      api.getPlayerInventory(playerId),
    ])

    setItems(shopItems)
    setInventory(inv)
  } catch {
    setError('Не удалось загрузить магазин')
  } finally {
    setLoading(false)
  }
}, [playerId])

useEffect(() => {
  void loadData()
}, [loadData])

  const ownedItemIds = new Set(inventory.map((i) => i.item_id))

  const handlePurchase = async (item: ShopItem) => {
    setError(null)
    setSuccess(null)
    if (item.is_unique && ownedItemIds.has(item.id)) {
      setError('Этот предмет уже использован')
      return
    }
    if (profileCoins < item.price) {
      setError('Недостаточно монет')
      return
    }
    setPurchasing(item.id)
    try {
      const result = await api.purchaseItem(playerId, item.id)
      if (!result.ok) {
        setError(result.error || 'Ошибка покупки')
        setPurchasing(null)
        return
      }

     

      await loadData()
      onPurchaseComplete()

      if (item.item_type === 'radio') {
        setRadioMode(true)
      } else if (item.item_type === 'legendary') {
        setSuccess('Легендарный предмет активирован! Награды начислены.')
      } else {
        setSuccess('Покупка совершена! Эффект применён.')
      }
    } catch {
      setError('Ошибка при покупке')
    } finally {
      setPurchasing(null)
    }
  }

  if (radioMode) {
    return <RadioSender onBack={() => setRadioMode(false)} playerId={playerId} />
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-10">
      <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        <ArrowLeft size={18} /> Назад
      </button>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink">🛒 ТАИНСТВЕННАЯ ЛАВКА</h1>
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1">
          <Coins size={14} className="text-amber-300" />
          <span className="text-sm font-black text-amber-100">{profileCoins}</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-bold text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-ink-muted">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOwned = item.is_unique && ownedItemIds.has(item.id)
            const canAfford = profileCoins >= item.price
            return (
              <div
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border px-3.5 py-3 backdrop-blur-md transition-all ${
                  isOwned
                    ? 'border-zinc-600/30 bg-zinc-900/40'
                    : item.item_type === 'legendary'
                      ? 'border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-950/40 via-black/80 to-amber-950/30'
                      : 'border-amber-400/25 bg-gradient-to-br from-amber-950/40 via-black/80 to-zinc-950/50'
                }`}
                style={{
                  boxShadow: isOwned
                    ? 'none'
                    : item.item_type === 'legendary'
                      ? '0 0 22px rgba(255,43,214,0.12)'
                      : '0 0 16px rgba(251,191,36,0.10)',
                }}
              >
                {item.item_type === 'legendary' && !isOwned && (
                  <>
                    <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />
                  </>
                )}

                <div className="relative flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${
                      isOwned
                        ? 'border-zinc-600/30 bg-zinc-800/40'
                        : item.item_type === 'legendary'
                          ? 'border-fuchsia-300/40 bg-fuchsia-400/10'
                          : 'border-amber-300/40 bg-amber-400/10'
                    }`}
                    style={{
                      boxShadow: isOwned
                        ? 'none'
                        : item.item_type === 'legendary'
                          ? '0 0 14px rgba(255,43,214,0.18)'
                          : '0 0 12px rgba(251,191,36,0.15)',
                    }}
                  >
                    {item.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-ink">{item.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-ink-muted">{item.description}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-amber-400/20 bg-black/30 px-2 py-0.5">
                        <Coins size={11} className="text-amber-300" />
                        <span className="text-xs font-black text-amber-100">{item.price}</span>
                      </div>
                      {item.item_type === 'legendary' && !isOwned && (
                        <span className="text-[8px] font-black tracking-widest text-fuchsia-300/70">ЛЕГЕНДАРНЫЙ</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    {isOwned ? (
                      <span className="flex items-center gap-1 rounded-lg border border-zinc-600/30 bg-zinc-800/40 px-2.5 py-1.5 text-[9px] font-black tracking-wider text-zinc-400">
                        <Lock size={10} /> ИСПОЛЬЗОВАН
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasing === item.id || !canAfford}
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-black tracking-wide transition-all active:scale-95 ${
                          canAfford
                            ? item.item_type === 'legendary'
                              ? 'border-fuchsia-300/40 bg-fuchsia-500/20 text-white hover:bg-fuchsia-500/30'
                              : 'border-amber-300/40 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                            : 'border-zinc-700/40 bg-zinc-800/40 text-zinc-600'
                        }`}
                        style={canAfford && item.item_type === 'legendary' ? { boxShadow: '0 0 12px rgba(255,43,214,0.2)' } : undefined}
                      >
                        {purchasing === item.id ? '...' : canAfford ? 'КУПИТЬ' : 'НЕ ХВАТАЕТ'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Radio sender sub-component ───
function RadioSender({ onBack, playerId }: { onBack: () => void; playerId: string }) {
  const [step, setStep] = useState<'nickname' | 'receiver' | 'message' | 'sent'>('nickname')
  const [nickname, setNickname] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [message, setMessage] = useState('')
  const [players, setPlayers] = useState<{ id: number; full_name: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.getPlayers().then((p) => setPlayers(p)).catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!nickname.trim() || !receiverId || !message.trim()) return
    setSending(true)
    setError(null)
    try {
      const result = await api.sendRadioMessage(playerId, receiverId, nickname.trim(), message.trim())
      if (!result.ok) {
        setError(result.error || 'Не удалось отправить')
        setSending(false)
        return
      }
      setStep('sent')
    } catch {
      setError('Ошибка отправки')
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-10">
      <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        <ArrowLeft size={18} /> Назад
      </button>

      <h1 className="mb-4 text-xl font-extrabold text-ink">📻 РАЦИЯ</h1>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-bold text-red-400">
          {error}
        </div>
      )}

      {step === 'nickname' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-muted">Как представишься?</p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Незнакомец, Тайный поклонник, Голос из тени..."
            className="w-full rounded-xl border border-neon/30 bg-black/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-neon/40"
            maxLength={30}
          />
          <button
            onClick={() => setStep('receiver')}
            disabled={!nickname.trim()}
            className="w-full rounded-xl bg-neon py-2.5 text-sm font-black text-bg transition active:scale-95 disabled:opacity-40"
          >
            ДАЛЕЕ
          </button>
        </div>
      )}

      {step === 'receiver' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-ink-muted">Выбери получателя:</p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-neon/20 bg-black/30 p-2">
            {players
              .filter((p) => String(p.id) !== playerId)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setReceiverId(String(p.id)); setStep('message') }}
                  className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-sm font-bold text-ink transition hover:bg-white/[0.07] active:scale-95"
                >
                  {p.full_name}
                </button>
              ))}
          </div>
          <button onClick={() => setStep('nickname')} className="text-xs font-bold text-neon/60 hover:text-neon">
            ← Назад
          </button>
        </div>
      )}

      {step === 'message' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-neon/20 bg-black/30 px-3 py-2 text-xs text-ink-muted">
            От: <span className="font-bold text-neon">{nickname}</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сегодня тебе повезёт..."
            className="h-28 w-full resize-none rounded-xl border border-neon/30 bg-black/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-neon/40"
            maxLength={200}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-black text-bg transition active:scale-95 disabled:opacity-40"
          >
            <Send size={16} /> {sending ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ'}
          </button>
          <button onClick={() => setStep('receiver')} className="text-xs font-bold text-neon/60 hover:text-neon">
            ← Назад
          </button>
        </div>
      )}

      {step === 'sent' && (
        <div className="py-8 text-center">
          <p className="text-3xl">📡</p>
          <p className="mt-3 text-sm font-bold text-ink">Сообщение отправлено!</p>
          <button onClick={onBack} className="mt-4 rounded-xl bg-neon px-6 py-2 text-sm font-black text-bg transition active:scale-95">
            ГОТОВО
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Radio message inbox (shown in MiniGamesPanel) ───
export function RadioInbox({ playerId, onAllRead }: { playerId: string; onAllRead: () => void }) {
  const [messages, setMessages] = useState<RadioMessage[]>([])
  const [current, setCurrent] = useState<RadioMessage | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await api.getUnreadRadioMessages(playerId)
      setMessages(msgs)
      setCurrent(msgs[0] || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => { void loadMessages() }, [loadMessages])

  const handleRead = async () => {
    if (!current) return
    await api.markRadioMessageRead(current.id)
    const remaining = messages.filter((m) => m.id !== current.id)
    setMessages(remaining)
    setCurrent(remaining[0] || null)
    if (remaining.length === 0) onAllRead()
  }

  if (loading || !current) return null

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/40 via-black/80 to-fuchsia-950/20 px-4 py-3 backdrop-blur-md"
      style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}
    >
      <p className="text-[8px] font-black tracking-[0.28em] text-cyan-300/60">📩 СООБЩЕНИЕ ОТ НЕЗНАКОМЦА</p>
      <p className="mt-1 text-xs font-bold text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.4)' }}>
        От: {current.nickname}
      </p>
      <p className="mt-1.5 break-words text-sm leading-snug text-ink">{current.message}</p>
      <button
        onClick={handleRead}
        className="mt-2.5 rounded-lg border border-neon/30 bg-neon/10 px-3 py-1.5 text-[10px] font-black tracking-wide text-neon transition active:scale-95 hover:bg-neon/20"
      >
        {messages.length > 1 ? `ПРОЧИТАНО (${messages.length - 1} ОСТАЛОСЬ)` : 'ПРОЧИТАНО'}
      </button>
    </div>
  )
}
