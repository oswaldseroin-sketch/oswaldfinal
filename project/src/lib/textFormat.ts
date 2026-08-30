export type BorderColor = 'red' | 'green' | 'yellow'
export type TextColor = 'orange' | 'purple' | 'green'

export type Mark = {
  start: number
  end: number
  b: BorderColor | null
  c: TextColor | null
}

export type FormattedContent = {
  v: number
  text: string
  marks: Mark[]
}

export function parseContent(raw: string): FormattedContent | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.text === 'string' &&
      Array.isArray(parsed.marks)
    ) {
      return {
        v: 1,
        text: parsed.text,
        marks: parsed.marks.filter(
          (m: any) =>
            typeof m.start === 'number' &&
            typeof m.end === 'number' &&
            m.start < m.end
        ),
      }
    }
  } catch {
    // not JSON — treat as plain text
  }
  return null
}

export function buildContentString(text: string, marks: Mark[]): string {
  const clean = marks.filter((m) => m.start < m.end && (m.b !== null || m.c !== null))
  if (clean.length === 0) return text
  return JSON.stringify({ v: 1, text, marks: clean })
}

export type Segment = {
  text: string
  b: BorderColor | null
  c: TextColor | null
}

export type Line = Segment[]

function getFormatAt(pos: number, marks: Mark[]): { b: BorderColor | null; c: TextColor | null } {
  let b: BorderColor | null = null
  let c: TextColor | null = null
  for (const m of marks) {
    if (pos >= m.start && pos < m.end) {
      if (m.b) b = m.b
      if (m.c) c = m.c
    }
  }
  return { b, c }
}

export function getLines(raw: string): Line[] {
  const parsed = parseContent(raw)
  if (!parsed) {
    return raw.split('\n').map((line) =>
      line.length > 0 ? [{ text: line, b: null, c: null }] : []
    )
  }

  const { text, marks } = parsed
  const lines: Line[] = []
  let currentLine: Segment[] = []
  let currentSeg: Segment | null = null

  const pushSeg = () => {
    if (currentSeg && currentSeg.text.length > 0) {
      currentLine.push(currentSeg)
    }
    currentSeg = null
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\n') {
      pushSeg()
      lines.push(currentLine)
      currentLine = []
      continue
    }
    const fmt = getFormatAt(i, marks)
    if (currentSeg && currentSeg.b === fmt.b && currentSeg.c === fmt.c) {
      currentSeg.text += ch
    } else {
      pushSeg()
      currentSeg = { text: ch, b: fmt.b, c: fmt.c }
    }
  }
  pushSeg()
  lines.push(currentLine)

  return lines
}

export function applyBorder(marks: Mark[], s: number, e: number, color: BorderColor): Mark[] {
  if (s >= e) return marks
  const withoutBorder = removeBorderAt(marks, s, e)
  return [...withoutBorder, { start: s, end: e, b: color, c: null }]
}

export function applyTextColor(marks: Mark[], s: number, e: number, color: TextColor): Mark[] {
  if (s >= e) return marks
  const withoutColor = removeTextColorAt(marks, s, e)
  return [...withoutColor, { start: s, end: e, b: null, c: color }]
}

export function removeBorderAt(marks: Mark[], s: number, e: number): Mark[] {
  if (s >= e) return marks
  const result: Mark[] = []
  for (const m of marks) {
    if (m.b === null || m.start >= e || m.end <= s) {
      result.push(m)
      continue
    }
    if (m.start < s) {
      result.push({ start: m.start, end: s, b: m.b, c: m.c })
    }
    if (m.c !== null) {
      result.push({ start: Math.max(m.start, s), end: Math.min(m.end, e), b: null, c: m.c })
    }
    if (m.end > e) {
      result.push({ start: e, end: m.end, b: m.b, c: m.c })
    }
  }
  return result
}

export function removeTextColorAt(marks: Mark[], s: number, e: number): Mark[] {
  if (s >= e) return marks
  const result: Mark[] = []
  for (const m of marks) {
    if (m.c === null || m.start >= e || m.end <= s) {
      result.push(m)
      continue
    }
    if (m.start < s) {
      result.push({ start: m.start, end: s, b: m.b, c: m.c })
    }
    if (m.b !== null) {
      result.push({ start: Math.max(m.start, s), end: Math.min(m.end, e), b: m.b, c: null })
    }
    if (m.end > e) {
      result.push({ start: e, end: m.end, b: m.b, c: m.c })
    }
  }
  return result
}

export const BORDER_STYLES: Record<BorderColor, { border: string; glow: string; bg: string }> = {
  red: { border: 'rgba(255,68,68,0.7)', glow: 'rgba(255,68,68,0.25)', bg: 'rgba(255,68,68,0.06)' },
  green: { border: 'rgba(57,255,20,0.7)', glow: 'rgba(57,255,20,0.25)', bg: 'rgba(57,255,20,0.06)' },
  yellow: { border: 'rgba(250,204,21,0.7)', glow: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.06)' },
}

export const TEXT_STYLES: Record<TextColor, { color: string; glow: string }> = {
  orange: { color: '#ff9933', glow: 'rgba(255,153,51,0.6)' },
  purple: { color: '#c084fc', glow: 'rgba(192,132,252,0.6)' },
  green: { color: '#39ff14', glow: 'rgba(57,255,20,0.6)' },
}
