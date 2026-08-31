import { ArrowLeft } from 'lucide-react'

export default function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-neon"
    >
      <ArrowLeft size={17} />
      Назад на Главную
    </button>
  )
}
