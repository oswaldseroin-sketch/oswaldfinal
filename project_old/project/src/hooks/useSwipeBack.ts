import { useRef, useState, useCallback } from 'react'

const SWIPE_THRESHOLD = 80

export function useSwipeBack(onBack: () => void) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const tracking = useRef(false)
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animating) return
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    tracking.current = false
    setAnimating(false)
  }, [animating])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current

    if (dx <= 0) return

    if (!tracking.current) {
      if (Math.abs(dy) > Math.abs(dx)) {
        startX.current = null
        startY.current = null
        return
      }
      if (dx > 8) {
        tracking.current = true
      } else {
        return
      }
    }

    if (tracking.current) {
      setOffset(dx)
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (startX.current === null) {
      return
    }
    const screenW = window.innerWidth
    const shouldClose = tracking.current && offset > Math.min(SWIPE_THRESHOLD, screenW * 0.25)

    setAnimating(true)

    if (shouldClose) {
      setOffset(screenW)
      setTimeout(() => {
        onBack()
        setOffset(0)
        setAnimating(false)
      }, 260)
    } else {
      setOffset(0)
      setTimeout(() => {
        setAnimating(false)
      }, 260)
    }

    startX.current = null
    startY.current = null
    tracking.current = false
  }, [offset, onBack])

  const onTouchCancel = useCallback(() => {
    if (animating) return
    setAnimating(true)
    setOffset(0)
    setTimeout(() => setAnimating(false), 260)
    startX.current = null
    startY.current = null
    tracking.current = false
  }, [animating])

  return {
    offset,
    animating,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  }
}
