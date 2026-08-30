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

export function getLevelInfo(xp: number): LevelInfo {
  let level = 1
  let remaining = xp
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level)
    if (remaining >= needed) {
      remaining -= needed
      level++
    } else {
      break
    }
  }

  let spent = 0
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l)
  }
  const currentXp = xp - spent
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level)
  const progressPercent = neededXp > 0 ? Math.min(100, (currentXp / neededXp) * 100) : 100

  return {
    level,
    currentXp,
    neededXp,
    title: getTitleForLevel(level),
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
  { number: 1, title: 'Вопрос дня', icon: '🔮', description: 'Ежедневный опрос с наградами' },
  { number: 2, title: 'Кто из них?', icon: '⚡', description: 'Кто выживет в экстремальной ситуации?' },
  { number: 3, title: 'Сделал бы?', icon: '🌙', description: 'Сделал бы это за 100 000?' },
  { number: 4, title: 'Прошлая жизнь', icon: '🔥', description: 'Кто кем был в прошлой жизни?' },
  { number: 5, title: 'Лучший дуэт', icon: '⭐', description: 'Какая команда лучше?' },
  { number: 6, title: 'Оцени', icon: '🎭', description: 'Оцени коллегу от 0 до 5' },
  { number: 7, title: 'Угадай мафию', icon: '🎯', description: 'Найди мафию за 2 попытки' },
  { number: 8, title: 'Да или Нет', icon: '💫', description: 'Смог бы ты выгулять собаку?' },
  { number: 9, title: 'Тайная любовь', icon: '🗝️', description: 'Кто тайно в тебя влюблён?' },
  { number: 10, title: 'Рулетка', icon: '👑', description: '50 на 50 против игрока' },
]
