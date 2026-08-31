import { ShieldCheck, Sparkles, FileText, Flame } from 'lucide-react'

type Tab = 'applications' | 'predictions' | 'articles' | 'secret'

const tabs: { id: Tab; label: string; Icon: typeof ShieldCheck }[] = [
  { id: 'applications', label: 'Заявки', Icon: ShieldCheck },
  { id: 'predictions', label: 'Предсказания', Icon: Sparkles },
  { id: 'articles', label: 'Статьи', Icon: FileText },
  { id: 'secret', label: 'Секретная', Icon: Flame },
]

export default function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-neon' : 'text-ink-faint'
              }`}
              style={active ? { textShadow: '0 0 10px rgba(0,229,255,0.4)' } : undefined}
            >
              <Icon size={22} strokeWidth={2} />
              <span className="text-[10px] font-semibold">{label}</span>
              {active && (
                <div
                  className="absolute bottom-0 h-0.5 w-8 rounded-full bg-neon"
                  style={{ boxShadow: '0 0 8px rgba(0,229,255,0.6)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
