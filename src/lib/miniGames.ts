export const LEVEL_TITLES: Record<number, string> = {
  1: 'Генеральный директор паники',
  2: 'Магистр ордена лени',
  3: 'Заслуженный соня галактики',
  4: 'Эксперт по ничегонеделанию',
  5: 'Профессиональный душнила',
  6: 'Король косяков',
  7: 'Главный по тарелочкам',
  8: 'Министр чаепития',
  9: 'Хранитель офисного холодильника',
  10: 'Повелитель дедлайнов',
  11: 'Чемпион по прокрастинации',
  12: 'Граф Дратути',
  13: 'Барон Авось',
  14: 'Ведущий специалист по мемам',
  15: 'Адвокат котиков',
  16: 'Легендарный пожиратель пиццы',
  17: 'Верховный главнокомандующий диванными войсками',
  18: 'Маршал ленивых выходных',
  19: 'Заслуженный грабленаступатель',
  20: 'Доктор диванных наук',
  21: 'Мастер спорта по поеданию вкусняшек',
  22: 'Профессиональный искатель приключений на свою голову',
  23: 'Главный консультант по глупым вопросам',
  24: 'Шериф кофейного автомата',
  25: 'Президент клуба любителей поспать',
  26: 'Босс финального уровня лени',
  27: 'Хранитель священного пульта',
  28: 'Султан подушек',
  29: 'Рыцарь круглого торта',
  30: 'Навигатор по холодильнику',
  31: 'Эксперт по созданию неловких ситуаций',
  32: 'Почетный донор нервных клеток',
  33: 'Генератор случайных мыслей',
  34: 'Директор по свежести воздуха',
  35: 'Инженер человеческих косяков',
  36: 'Командир отряда полуночников',
  37: 'Великий комбинатор отговорок',
  38: 'Магистр белой и черной магии лени',
  39: 'Главный архитектор воздушных замков',
  40: 'Заслуженный артист разговорного жанра у кулера',
  41: 'Профессор околовсяческих наук',
  42: 'Капитан очевидность второго ранга',
  43: 'Повелитель чайных пакетиков',
  44: 'Гуру спонтанных покупок',
  45: 'Секретный агент одеялка',
  46: 'Менеджер по связям с космосом',
  47: 'Укротитель будильников',
  48: 'Магистр кошачьей психологии',
  49: 'Абсолютный чемпион по залипанию в телефон',
}

export const MAX_LEVEL = 49

export function xpForLevel(level: number): number {
  return level * 100
}

export function getTitleForLevel(level: number): string {
  if (level >= MAX_LEVEL) return LEVEL_TITLES[MAX_LEVEL]
  return LEVEL_TITLES[level] || LEVEL_TITLES[1]
}

export type LevelInfo = {
  level: number
  currentXp: number
  neededXp: number
  title: string
  progressPercent: number
}

export function getLevelInfo(xp: number, level: number = 1): LevelInfo {
  const safeLevel = Math.min(Math.max(Number(level) || 1, 1), MAX_LEVEL)

  const currentXp = Math.max(0, Number(xp) || 0)
  const neededXp = safeLevel >= MAX_LEVEL ? currentXp : 20
  const progressPercent =
    neededXp > 0
      ? Math.min(100, (currentXp / neededXp) * 100)
      : 100

  return {
    level: safeLevel,
    currentXp,
    neededXp,
    title: getTitleForLevel(safeLevel),
    progressPercent,
  }
}

export type GameInfo = {
  number: number
  title: string
  icon: string
  description: string
}

export const MINI_GAMES: GameInfo[] = [
  { number: 1, title: 'Оракул дня', icon: '🔮', description: 'Выбор команды на сегодня' },
  { number: 2, title: 'Дуэль судеб', icon: '⚡', description: 'Кто из двоих окажется сильнее?' },
  { number: 3, title: 'Цена безумия', icon: '🌙', description: 'На что он согласится ради денег?' },
  { number: 4, title: 'Архив прошлых жизней', icon: '🔥', description: 'Раскрой тайну чужого прошлого' },
  { number: 5, title: 'Арена дуэтов', icon: '⭐', description: 'Две команды. Один выбор.' },
  { number: 6, title: 'Вердикт', icon: '🎭', description: 'Вынеси свою оценку' },
  { number: 7, title: 'Охота на мафию', icon: '🎯', description: 'Вычисли того, кто скрывается' },
  { number: 8, title: 'Точка выбора', icon: '💫', description: 'Только Да или Нет' },
  { number: 9, title: 'Чужие мысли', icon: '🗝️', description: 'Что они думают именно о тебе?' },
  { number: 10, title: 'Последняя дуэль', icon: '👑', description: 'Один шанс. Один противник.' },
]
