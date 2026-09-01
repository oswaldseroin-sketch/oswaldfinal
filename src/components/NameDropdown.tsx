import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { type Worker } from '../lib/data'

type NeonColor = { border: string; glow: string; text: string }

type Props = {
  value: string
  onChange: (value: string) => void
  workers: Worker[]
  color: NeonColor
  disabledValues?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NameDropdown({ value, onChange, workers, color, disabledValues, open, onOpenChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
const target = e.target as Node

if (
  !containerRef.current?.contains(target) &&
  !buttonRef.current?.contains(target) &&
  !panelRef.current?.contains(target)
) {
  onOpenChange(false)
}
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const btn = buttonRef.current
        if (btn) {
          const rect = btn.getBoundingClientRect()
          const panelWidth = Math.max(rect.width, 220)
const maxLeft = window.innerWidth - panelWidth - 8

setPanelStyle({
  position: 'fixed',
  left: Math.max(8, Math.min(rect.left, maxLeft)),
  top: rect.bottom + 4,
  width: panelWidth,
})
        }
      })
    }
  }, [open])


  const disabledSet = useMemo(() => new Set(disabledValues ?? []), [disabledValues])

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between gap-1 rounded-lg border bg-black px-2.5 py-1.5 text-left transition-all"
          style={{
            minHeight: 42,
            borderColor: value ? color.border : 'rgba(255,255,255,0.12)',
            boxShadow: value ? `0 0 10px ${color.glow}` : 'none',
          }}
        >
          <span
            className={`truncate text-sm font-bold ${value ? 'text-white' : 'text-white/40'}`}
            style={value ? { textShadow: `0 0 6px ${color.glow}` } : undefined}
          >
            {value || 'Выбрать'}
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 transition-transform duration-200"
            style={{ color: value ? color.text : 'rgba(255,255,255,0.4)', transform: open ? 'rotate(180deg)' : undefined }}
          />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={panelRef}
          className="overflow-hidden rounded-xl border-2 bg-black/95 backdrop-blur-md animate-fadeIn"
          style={{
            ...panelStyle,
            zIndex: 9999,
            borderColor: color.border,
            boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 16px ${color.glow}`,
          }}
        >

          <div className="max-h-52 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
        {workers.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-white/30">Ничего не найдено</p>
            ) : (
            workers.map((worker) => {
                const isSelected = worker.name === value
                const isDisabled = disabledSet.has(worker.name)
                return (
                  <button
                    key={worker.name}
                    type="button"
                    disabled={isDisabled}
                   onMouseDown={(e) => {
  e.preventDefault()
  e.stopPropagation()

  onChange(worker.name)
  onOpenChange(false)
}}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-white/10'
                        : isDisabled
                          ? 'opacity-30'
                          : 'hover:bg-white/5'
                    }`}
                    style={isSelected ? { boxShadow: `inset 0 0 8px ${color.glow}` } : undefined}
                  >
                    <span
                      className={`truncate text-sm font-bold ${isSelected ? '' : isDisabled ? 'text-white/30 line-through' : 'text-white/80'}`}
                      style={isSelected ? { color: color.text, textShadow: `0 0 6px ${color.glow}` } : undefined}
                    >
                      {worker.name}
                    </span>
                    {isSelected && <Check size={15} style={{ color: color.text }} className="shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
