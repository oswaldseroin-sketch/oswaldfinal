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

function resolveGenderTokens(
  text: string,
  person1: Worker,
  person2: Worker,
): string {
  return text.replace(
    /\{(\d)\|([^|]+)\|([^}]+)\}/g,
    (_, personNum, maleForm, femaleForm) => {
      const isFemale =
        personNum === '1'
          ? person1.gender === 'ж'
          : person2.gender === 'ж'

      return isFemale ? femaleForm : maleForm
    },
  )
}

export async function getWorkerOfWeek(
  date = new Date(),
  roster?: Worker[],
): Promise<string> {
  const workers = roster?.length ? roster : await loadWorkers()

  if (!workers.length) return ''

  const week = getWeekNumber(date)
  const year = date.getFullYear()
  const seed = week * 10000 + year

  return workers[Math.floor(seededRandom(seed) * workers.length)].name
}

export async function getDailyNews(
  date = new Date(),
  roster?: Worker[],
): Promise<string> {
  const workers = roster?.length ? roster : await loadWorkers()

  if (!workers.length) return ''

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const seed = year * 10000 + month * 100 + day

  const firstIndex = Math.floor(
    seededRandom(seed) * workers.length,
  )

  let secondIndex = Math.floor(
    seededRandom(seed + 1) * workers.length,
  )

  if (secondIndex === firstIndex) {
    secondIndex = (secondIndex + 1) % workers.length
  }

  const person1 = workers[firstIndex]
  const person2 = workers[secondIndex]

  const situation =
    situationsList[
      Math.floor(
        seededRandom(seed + 2) * situationsList.length,
      )
    ]

  const text = resolveGenderTokens(
    situation,
    person1,
    person2,
  )

  return text
    .replaceAll('[Человек 1]', person1.name)
    .replaceAll('[Человек 2]', person2.name)
}

export async function getDailyPrediction(
  date = new Date(),
  roster?: Worker[],
): Promise<string> {
  const workers = roster?.length ? roster : await loadWorkers()

  if (!workers.length) return ''

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const seed =
    year * 10000 +
    month * 100 +
    day +
    77777

  const person =
    workers[Math.floor(seededRandom(seed) * workers.length)]

  return getPredictionForWorker(
    person,
    date,
    seed,
    workers,
  )
}

export function getPredictionForWorker(
  person: Worker,
  date = new Date(),
  seedOffset = 0,
  roster: Worker[] = [],
): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const workerIndex = roster.length
    ? roster.indexOf(person)
    : 0

  const seed =
    year * 10000 +
    month * 100 +
    day +
    77777 +
    workerIndex * 31 +
    seedOffset

  const template =
    predictionsList[
      Math.floor(
        seededRandom(seed) * predictionsList.length,
      )
    ]

  const text = resolveGenderTokens(
    template,
    person,
    person,
  )

  return text
    .replaceAll('[Человек 1]', person.name)
    .replaceAll('[Имя]', person.name)
}