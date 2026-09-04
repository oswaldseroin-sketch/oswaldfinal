import { useEffect, useState } from 'react'
import { api, type ShopItem } from '../lib/api'

type Props = {
  onBack: () => void
  profileCoins: number
  playerId: string
  onPurchaseComplete: () => void
}

export default function ShopPanel({
  onBack,
  profileCoins,
  playerId,
  onPurchaseComplete,
}: Props){
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
   api.getShopItems()
  .then((data) => {
    console.log('SHOP DATA:', data)

    if (Array.isArray(data)) {
      setItems(data)
    } else {
      setItems(data.items ?? [])
    }
  })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
const handleBuy = async (itemId: number) => {
  const result = await api.purchaseShopItem(
    playerId,
    itemId
  )

  console.log('BUY RESULT:', result)
}

  return (
    <div className="min-h-screen p-4 text-white">

      <button
        onClick={onBack}
        className="mb-4 rounded-xl border px-4 py-2"
      >
        ← Назад
      </button>

      <h1 className="mb-4 text-2xl font-black">
        🛒 Магазиньш
      </h1>

      <div className="mb-4">
        🪙 {profileCoins}
      </div>


      {loading ? (
        <div>Загрузка...</div>
      ) : (

        <div className="grid gap-3">

          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/20 bg-black/50 p-4"
            >

              <div className="text-3xl">
                {item.icon}
              </div>

              <div className="font-bold">
                {item.name}
              </div>

              <div className="text-sm text-gray-400">
                {item.description}
              </div>

              <div className="mt-2">
                Цена: {item.price} 🪙
              </div>
<button
  onClick={() => handleBuy(item.id)}
  className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-black text-emerald-200"
>
  КУПИТЬ
</button>
            </div>
          ))}

        </div>

      )}

    </div>
  )
}