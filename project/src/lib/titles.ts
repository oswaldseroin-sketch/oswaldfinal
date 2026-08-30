// ═══════════════════════════════════════════════════════════
// Title (звание) progression system
// ═══════════════════════════════════════════════════════════
// Independent from ordinary XP/level.
// Title XP requirements are tiered:
//   Levels 1-5:  20 XP each
//   Levels 6-10: 30 XP each
//   Levels 11-20: 40 XP each
//   Levels 21-30: 50 XP each
//   Levels 31-40: 65 XP each
//   Levels 41-45: 80 XP each
//   Levels 46-49: 100 XP each
//   Level 50: MAX

export const TITLES: string[] = [
  'Силиконовый ослик', 'Нюхач куртки Семяшкина', 'Кривошляпа из Забугоровки',
  'Экзорцист туалетных кабин', 'Министр бумажной духоты', 'Дилер семечек',
  'Спонсор депрессии', 'Экстремальный потребитель тормозков', 'Кибер-пельмень в тумане',
  'Жертва медального танца', 'Облизыватель журнала сдачи', 'Бреющий во сне',
  'Диванный самурай Амальгамы', 'Коллекционер использованных ручек', 'Мастер интриг на КПП',
  'Повелитель сыворотки правды', 'Святой отец кнопочных телефонов', 'Энергетический вампир на чилле',
  'Душитель подушек', 'Архангел КПП', 'Король-Призрак', 'Бессмертный Всадник',
  'Несущий Истину', 'Великий Инквизитор', 'Магистр Ордена',
  'Хранитель Тайного Знания', 'Архивариус Забытых Лет', 'Страж Порога',
  'Глашатай Рассвета', 'Зверолов Сновидений', 'Кузнец Судеб',
  'Проводник Восьмого Пути', 'Чтец Пустых Строк', 'Великий Молчальник',
  'Ткач Несказанного', 'Око Бесконечности', 'Хранитель Равновесия',
  'Архитектор Тишины', 'Наследник Пепла', 'Властелин Осколков',
  'Строитель Мостов', 'Хранитель Времени', 'Мастер Отражений',
  'Капитан Забвения', 'Странник Края', 'Хранитель Источника',
  'Грандмейстер Амальгамы', 'Абсолютный Магистр', 'Вечный Страж',
  'Легенда Амальгамы',
]

export const MAX_TITLE_LEVEL = 50

// Legacy constant used by TeamLifePanel (VPS-based team stats title system)
// The mini-game title system uses titleXpForLevel() instead.
export const TITLE_XP_PER_LEVEL = 10

export function titleXpForLevel(level: number): number {
  if (level >= 1 && level <= 5) return 20
  if (level >= 6 && level <= 10) return 30
  if (level >= 11 && level <= 20) return 40
  if (level >= 21 && level <= 30) return 50
  if (level >= 31 && level <= 40) return 65
  if (level >= 41 && level <= 45) return 80
  if (level >= 46 && level <= 49) return 100
  return 0
}

export function getTitle(level: number): string {
  const idx = Math.min(Math.max(level - 1, 0), TITLES.length - 1)
  return TITLES[idx]
}

export function isMaxTitle(level: number): boolean {
  return level >= MAX_TITLE_LEVEL
}

export type TitleInfo = {
  level: number
  currentXp: number
  neededXp: number
  title: string
  progressPercent: number
}

export function getTitleInfo(titleXp: number): TitleInfo {
  let level = 1
  let remaining = titleXp
  while (level < MAX_TITLE_LEVEL) {
    const needed = titleXpForLevel(level)
    if (needed > 0 && remaining >= needed) {
      remaining -= needed
      level++
    } else {
      break
    }
  }

  const needed = titleXpForLevel(level)
  const title = level >= MAX_TITLE_LEVEL
    ? TITLES[MAX_TITLE_LEVEL - 1]
    : (TITLES[level - 1] || TITLES[0])

  const currentXp = level >= MAX_TITLE_LEVEL ? 0 : remaining
  const neededXp = level >= MAX_TITLE_LEVEL ? 0 : needed
  const progressPercent = neededXp > 0 ? Math.min(100, (currentXp / neededXp) * 100) : 100

  return { level, currentXp, neededXp, title, progressPercent }
}
