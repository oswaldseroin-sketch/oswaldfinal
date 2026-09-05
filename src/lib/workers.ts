import { situationsList, type Worker } from './data'
import { api } from './api'
import { predictionsList } from './predictionsData'

function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed) * 10000
  return value - Math.floor(value)
}
let cachedWorkers: Worker[] = []

export async function loadWorkers(): Promise<Worker[]> {
  if (cachedWorkers.length) return cachedWorkers

  try {
    const data = await api.getWorkers()
    cachedWorkers = data.length ? data : []
  } catch {
    cachedWorkers = []
  }

  return cachedWorkers
}
function resolveGenderTokens(text: string, person1: Worker, person2: Worker): string {
  return text.replace(/\{(\d)\|([^|]+)\|([^}]+)\}/g, (_, personNum, maleForm, femaleForm) => {
    const isFemale = personNum === '1' ? person1.gender === 'ж' : person2.gender === 'ж'
    return isFemale ? femaleForm : maleForm
  })
}

export function getWorkerOfWeek(date = new Date(), roster: Worker[] = workersList): string {
  const week = getWeekNumber(date)
  const year = date.getFullYear()
  const seed = week * 10000 + year
  return roster[Math.floor(seededRandom(seed) * roster.length)].name
}

export function getDailyNews(date = new Date(), roster: Worker[] = workersList): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const seed = year * 10000 + month * 100 + day
  const firstIndex = Math.floor(seededRandom(seed) * roster.length)
  let secondIndex = Math.floor(seededRandom(seed + 1) * roster.length)
  if (secondIndex === firstIndex) secondIndex = (secondIndex + 1) % roster.length
  const person1: Worker = roster[firstIndex]
  const person2: Worker = roster[secondIndex]
  const situation = situationsList[Math.floor(seededRandom(seed + 2) * situationsList.length)]
  const text = resolveGenderTokens(situation, person1, person2)
  return text.replaceAll('[Человек 1]', person1.name).replaceAll('[Человек 2]', person2.name)
}

export function getDailyPrediction(date = new Date(), roster: Worker[] = workersList): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const seed = year * 10000 + month * 100 + day + 77777
  const person: Worker = roster[Math.floor(seededRandom(seed) * roster.length)]
  return getPredictionForWorker(person, date, seed, roster)
}

export function getPredictionForWorker(person: Worker, date = new Date(), seedOffset = 0, roster: Worker[] = workersList): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const workerIndex = roster.indexOf(person)
  const seed = year * 10000 + month * 100 + day + 77777 + workerIndex * 31 + seedOffset
  const template = predictionsList[Math.floor(seededRandom(seed) * predictionsList.length)]
  const text = resolveGenderTokens(template, person, person)
  return text.replaceAll('[Человек 1]', person.name).replaceAll('[Имя]', person.name)
}

export { workersList }
