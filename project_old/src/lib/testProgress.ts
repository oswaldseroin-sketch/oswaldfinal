import type { TestQuestionRow } from './api'

export type AnswerRecord = {
  questionId: string
  selected: number
  correctAnswer: number
  isCorrect: boolean
}

export type SavedProgress = {
  blockId: string
  blockLabel: string
  mode: 'block' | 'mega'
  queue: TestQuestionRow[]
  index: number
  answers: AnswerRecord[]
  phase: 'playing' | 'review'
  // review-specific
  reviewQueue: TestQuestionRow[]
  reviewIndex: number
  reviewAnswers: AnswerRecord[]
  reviewFixed: number
  reviewStillWrong: string[]
  savedAt: number
}

const STORAGE_KEY = 'seroin_test_progress'

export function saveProgress(progress: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedProgress
    if (!parsed || !parsed.queue || parsed.queue.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Extracts the numeric sequence number from a question_id like "1.1", "1.10", "2.15".
 * Returns the second part as a number for sorting within blocks.
 */
export function questionNumber(questionId: string): number {
  const parts = questionId.split('.')
  if (parts.length >= 2) {
    const n = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(n)) return n
  }
  const fallback = parseInt(questionId.replace(/[^0-9]/g, ''), 10)
  return isNaN(fallback) ? 0 : fallback
}

/**
 * Extracts the block prefix (e.g. "1" from "1.1") for grouping.
 */
export function questionBlock(questionId: string): number {
  const parts = questionId.split('.')
  if (parts.length >= 1) {
    const n = parseInt(parts[0], 10)
    if (!isNaN(n)) return n
  }
  return 0
}

/**
 * Sorts questions by numeric order: "1.2" before "1.10", not alphabetically.
 */
export function sortQuestions(questions: TestQuestionRow[]): TestQuestionRow[] {
  return [...questions].sort((a, b) => {
    const blockA = questionBlock(a.question_id)
    const blockB = questionBlock(b.question_id)
    if (blockA !== blockB) return blockA - blockB
    return questionNumber(a.question_id) - questionNumber(b.question_id)
  })
}

export const BLOCK_SIZE = 110

export type BlockDef = {
  id: string
  label: string
  blockNumber: number | null
  isMega?: boolean
}

export const BLOCKS: BlockDef[] = [
  { id: 'block1', label: 'Блок 1', blockNumber: 1 },
  { id: 'block2', label: 'Блок 2', blockNumber: 2 },
  { id: 'block3', label: 'Блок 3', blockNumber: 3 },
  { id: 'block4', label: 'Блок 4', blockNumber: 4 },
  { id: 'mega', label: 'Мега марафон', blockNumber: null, isMega: true },
]

export function questionsForBlock(
  allSorted: TestQuestionRow[],
  block: BlockDef,
): TestQuestionRow[] {
  if (block.isMega) {
    return allSorted.filter(q => q.block_number !== null && q.block_number !== undefined)
  }
  return allSorted.filter(q => q.block_number === block.blockNumber)
}

export function countAvailable(
  allSorted: TestQuestionRow[],
  block: BlockDef,
): { available: number; total: number } {
  const inBlock = questionsForBlock(allSorted, block)
  const available = inBlock.filter(q => q.correct_answer !== null).length
  return { available, total: inBlock.length }
}
