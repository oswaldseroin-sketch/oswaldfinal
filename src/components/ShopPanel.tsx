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
    <div className="min-h-screen bg-transparent p-4 text-white">

      <button
        onClick={onBack}
        className="mb-5 rounded-xl border border-white/20 px-4 py-2 text-sm"
      >
        ← Назад
      </button>


      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-black">
          🛒 ТАИНСТВЕННАЯ ЛАВКА
        </h1>

        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 font-black text-yellow-300">
          🪙 {profileCoins}
        </div>
      </div>


      {loading ? (
        <div className="text-center text-zinc-400">
          Загрузка лавки...
        </div>
      ) : (

        <div className="grid gap-4">

          {items.map((item) => (

            <div
              key={item.id}
              className={`
                relative overflow-hidden rounded-2xl
                border p-4
                ${
                  item.item_type === 'legendary'
                    ? 'border-purple-400/50 bg-purple-950/30'
                    : 'border-yellow-400/30 bg-black/50'
                }
              `}
              style={{
                boxShadow:
                  item.item_type === 'legendary'
                    ? '0 0 25px rgba(168,85,247,0.35)'
                    : '0 0 20px rgba(251,191,36,0.15)',
              }}
            >

              <div className="flex items-center gap-4">


                <div
                  className="
                  flex h-16 w-16 items-center justify-center
                  rounded-2xl border border-yellow-400/30
                  bg-black/50 text-4xl
                  "
                >
                  {item.icon}
                </div>


                <div className="flex-1">

                  <div className="text-lg font-black text-yellow-200">
                    {item.name}
                  </div>


                  <div className="mt-1 text-sm text-zinc-400">
                    {item.description}
                  </div>


                  <div className="mt-3 flex items-center justify-between">

                    <div
                      className="
                      rounded-lg border border-yellow-400/30
                      bg-yellow-400/10 px-3 py-1
                      font-black text-yellow-300
                      "
                    >
                      🪙 {item.price}
                    </div>


                    <button
                      className="
                      rounded-xl border border-emerald-400/40
                      bg-emerald-500/20
                      px-4 py-2
                      text-xs font-black
                      text-emerald-200
                      transition
                      active:scale-95
                      "
                    >
                      КУПИТЬ
                    </button>

                  </div>

                </div>

              </div>


              {item.item_type === 'legendary' && (
                <div className="mt-3 text-xs font-black text-purple-300">
                  ✨ ЛЕГЕНДАРНЫЙ ПРЕДМЕТ
                </div>
              )}

            </div>

          ))}

        </div>

      )}

    </div>
  )
}