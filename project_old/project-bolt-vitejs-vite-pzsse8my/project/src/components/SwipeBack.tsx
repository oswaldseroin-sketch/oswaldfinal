import { type ReactNode } from 'react'
import { useSwipeBack } from '../hooks/useSwipeBack'

type Props = {
  onBack: () => void
  children: ReactNode
  className?: string
  innerClassName?: string
}

export default function SwipeBack({ onBack, children, className = '', innerClassName = '' }: Props) {
  const { offset, animating, handlers } = useSwipeBack(onBack)

  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      <div
        {...handlers}
        className="relative min-h-screen bg-transparent"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: animating
            ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
          boxShadow: offset > 0 ? '-18px 0 40px rgba(0, 229, 255, 0.12)' : 'none',
          touchAction: 'pan-y',
          willChange: offset > 0 ? 'transform' : 'auto',
        }}
      >
        <div className={innerClassName}>{children}</div>
      </div>
    </div>
  )
}
