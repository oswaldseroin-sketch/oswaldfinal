import { useEffect, useState } from 'react'
import { api, type ShopItem } from '../lib/api'

type Props = {
  onBack: () => void
  profileCoins: number
  onPurchaseComplete: () => void
}

export default function ShopPanel({
  onBack,
  profileCoins,
  onPurchaseComplete,
}: Props) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
  api.getShopItems()
    .then((data) => {
      console.log('SHOP ITEMS:', data)
      setItems(data.items)
    })
    .catch((error) => {
      console.error('SHOP ERROR:', error)
    })
    .finally(() => {
      setLoading(false)
    })
}, [])

  return (
    <div className="min-h-screen p-4 text-white">
      <button
        onClick={onBack}
        className="mb-4 rounded-xl border border-white/20 px-4 py-2"
      >
        ← Назад
      </button>

      <h1 className="mb-4 text-2xl font-black">
        🛒 Магазиньш
      </h1>

      <p className="mb-4">
        Монеты: {profileCoins}
      </p>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="grid gap-3">
       {items.map((item) => (
  <div
    key={item.id}
    className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-950/50 via-black/80 to-purple-950/40 p-4"
    style={{
      boxShadow: '0 0 20px rgba(251,191,36,0.15)',
    }}
  >

    <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />

    <div className="relative flex items-center gap-4">

      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-black/40 text-4xl"
        style={{
          boxShadow: '0 0 15px rgba(251,191,36,0.25)',
        }}
      >
        {item.icon}
      </div>


      <div className="flex-1">

        <h2 className="text-lg font-black text-amber-200">
          {item.name}
        </h2>

        <p className="mt-1 text-xs text-zinc-400">
          {item.description}
        </p>

        <div className="mt-3 flex items-center justify-between">

          <span className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-sm font-black text-yellow-300">
            {item.price} 🪙
          </span>


          <button
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-200 transition active:scale-95"
          >
            КУПИТЬ
          </button>

        </div>

      </div>

    </div>

  </div>
))}
           