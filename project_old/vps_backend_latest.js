// ============================================================================
// AMALGAMA — Game routes for VPS backend (Express + pg Pool)
// ----------------------------------------------------------------------------
// This module exports setupGameRoutes(app, pool) which registers ALL game
// routes (mini-games #1-10, knowledge-numbers, test-blocks, profile/progress)
// on the Express app.
//
// USAGE in index.js:
//   const { setupGameRoutes } = require('./vps_backend_latest.js')
//   setupGameRoutes(app, pool)
//
// The `pool` variable (pg Pool) must already be defined.
// Do NOT add app.listen, express, dotenv, or CORS — already in index.js.
// ============================================================================

'use strict'

// ─── CORS helper ───────────────────────────────────────────────────────────
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey')
}

// ─── Russia timezone (UTC+3) — game day boundary at 08:00 MSK ───
function getRussiaDate(date) {
  date = date || new Date()
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000))
  // Subtract 8 hours so the day flips at 08:00 MSK instead of 00:00 MSK
  const adjusted = new Date(russiaTime.getTime() - (8 * 60 * 60 * 1000))
  return adjusted.toISOString().slice(0, 10)
}

function getYesterdayRussiaDate() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getRussiaDate(d)
}

// ─── Daily poll uses midnight MSK (no 08:00 offset) ───
function getRussiaDateMidnight(date) {
  date = date || new Date()
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000))
  return russiaTime.toISOString().slice(0, 10)
}

function getYesterdayRussiaDateMidnight() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getRussiaDateMidnight(d)
}

// ─── Seeded random for deterministic daily question/player selection ───
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pickIndex(seed, count) {
  if (count <= 0) return 0
  return seededRandom(seed) % count
}

function pickNPlayers(seed, workers, n) {
  const pool = [...workers]
  const result = []
  let s = seed
  for (let i = 0; i < n && pool.length > 0; i++) {
    s = `${seed}:pick${i}`
    const idx = seededRandom(s) % pool.length
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

// ─── Ordinary XP system (20 XP per level) ───
function recalcOrdinaryLevel(xp) {
  let level = 1
  let remaining = xp
  while (remaining >= 20) {
    remaining -= 20
    level++
  }
  return { level, remainder: remaining }
}

// ─── Title XP system (tiered requirements, max 50) ───
const TITLE_TITLES = [
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
const MAX_TITLE_LEVEL = 50

function titleXpForLevel(level) {
  if (level >= 1 && level <= 5) return 20
  if (level >= 6 && level <= 10) return 30
  if (level >= 11 && level <= 20) return 40
  if (level >= 21 && level <= 30) return 50
  if (level >= 31 && level <= 40) return 65
  if (level >= 41 && level <= 45) return 80
  if (level >= 46 && level <= 49) return 100
  return 0
}

function recalcTitleLevel(titleXp) {
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
    ? TITLE_TITLES[MAX_TITLE_LEVEL - 1]
    : (TITLE_TITLES[level - 1] || TITLE_TITLES[0])
  return {
    level,
    currentXp: level >= MAX_TITLE_LEVEL ? 0 : remaining,
    neededXp: level >= MAX_TITLE_LEVEL ? 0 : needed,
    title,
  }
}

// ─── Level titles for mini-games profile (daily-poll style) ───
const LEVEL_TITLES = {
  1: 'Генеральный директор паники', 2: 'Магистр ордена лени', 3: 'Заслуженный соня галактики',
  4: 'Эксперт по ничегонеделанию', 5: 'Профессиональный душнила', 6: 'Король косяков',
  7: 'Главный по тарелочкам', 8: 'Министр чаепития', 9: 'Хранитель офисного холодильника',
  10: 'Повелитель дедлайнов', 11: 'Чемпион по прокрастинации', 12: 'Граф Дратути',
  13: 'Барон Авось', 14: 'Ведущий специалист по мемам', 15: 'Адвокат котиков',
  16: 'Легендарный пожиратель пиццы', 17: 'Верховный главнокомандующий диванными войсками',
  18: 'Маршал ленивых выходных', 19: 'Заслуженный грабленаступатель', 20: 'Доктор диванных наук',
  21: 'Мастер спорта по поеданию вкусняшек', 22: 'Профессиональный искатель приключений на свою голову',
  23: 'Главный консультант по глупым вопросам', 24: 'Шериф кофейного автомата',
  25: 'Президент клуба любителей поспать', 26: 'Босс финального уровня лени',
  27: 'Хранитель священного пульта', 28: 'Султан подушек', 29: 'Рыцарь круглого торта',
  30: 'Навигатор по холодильнику', 31: 'Эксперт по созданию неловких ситуаций',
  32: 'Почетный донор нервных клеток', 33: 'Генератор случайных мыслей',
  34: 'Директор по свежести воздуха', 35: 'Инженер человеческих косяков',
  36: 'Командир отряда полуночников', 37: 'Великий комбинатор отговорок',
  38: 'Магистр белой и черной магии лени', 39: 'Главный архитектор воздушных замков',
  40: 'Заслуженный артист разговорного жанра у кулера', 41: 'Профессор околовсяческих наук',
  42: 'Капитан очевидность второго ранга', 43: 'Повелитель чайных пакетиков',
  44: 'Гуру спонтанных покупок', 45: 'Секретный агент одеялка',
  46: 'Менеджер по связям с космосом', 47: 'Укротитель будильников',
  48: 'Магистр кошачьей психологии', 49: 'Абсолютный чемпион по залипанию в телефон',
}
const MAX_LEVEL = 49

function xpForLevel(level) {
  return level * 100
}

function recalcLevel(xp) {
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
  return {
    level,
    title: level >= MAX_LEVEL ? LEVEL_TITLES[MAX_LEVEL] : (LEVEL_TITLES[level] || LEVEL_TITLES[1]),
  }
}

function currentLevelXP(xp) {
  const { level, title } = recalcLevel(xp)
  let spent = 0
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l)
  }
  const currentXp = xp - spent
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level)
  return { level, currentXp, neededXp, title }
}

// ─── Game keys ───
const GAME_KEYS = {
  2: 'who_of_them',
  3: 'would_he_do_it',
  4: 'past_life',
  5: 'best_duo',
  6: 'rate_player',
  7: 'mafia',
  8: 'yes_no',
  9: 'secret_love',
  10: 'roulette',
}

// ─── Test questions ───
const QUESTIONS = {
  who_of_them: ['Кто выживет 10 дней в лесу без еды?'],
  would_he_do_it: ['Сделал бы это за 100 000 рублей?'],
  past_life: ['Кто в прошлой жизни был рваным сапогом?'],
  best_duo: ['Кто из них лучше отработает смену вместе?'],
  rate_player: ['Оцени дружелюбие этого человека'],
  yes_no: ['Смог бы ты выгулять его собаку просто так?'],
}

// ─── Base reward: +2 ordinary XP, +1 coin ───
const BASE_XP = 2
const BASE_COINS = 1

// ─── Result rewards ───
const RESULT_REWARDS = {
  bronze: { titleXp: 1, coins: 1 },
  silver: { titleXp: 2, coins: 2 },
  gold: { titleXp: 3, coins: 3 },
}

// ─── 10/10 bonus ───
const ALL_GAMES_BONUS_TITLE_XP = 5
const ALL_GAME_KEYS = [
  'daily_poll',
  'who_of_them',
  'would_he_do_it',
  'past_life',
  'best_duo',
  'rate_player',
  'mafia',
  'yes_no',
  'secret_love',
  'roulette',
]

// ─── Daily poll placement rewards ───
const PLACEMENT_REWARDS = {
  1: { xp: 30, titleXp: 5 },
  2: { xp: 20, titleXp: 3 },
  3: { xp: 10, titleXp: 1 },
}

const ADMIN_PASSWORD = '3010'

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (async, using pg Pool)
// ═══════════════════════════════════════════════════════════════════════════

async function getOrCreateProfile(pool, userId) {
  const { rows } = await pool.query(
    'SELECT user_id, level, xp, coins, title, title_xp, title_level, updated_at FROM mini_game_profile WHERE user_id = $1',
    [userId]
  )
  if (rows.length > 0) return rows[0]

  // Insert with ON CONFLICT DO NOTHING — handles race condition
  await pool.query(
    `INSERT INTO mini_game_profile (user_id, level, xp, coins, title, title_xp, title_level)
     VALUES ($1, 1, 0, 0, $2, 0, 1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, TITLE_TITLES[0]]
  )

  const { rows: retry } = await pool.query(
    'SELECT user_id, level, xp, coins, title, title_xp, title_level, updated_at FROM mini_game_profile WHERE user_id = $1',
    [userId]
  )
  return retry[0]
}

async function recordCompletion(pool, userId, gameKey, gameDay) {
  await pool.query(
    `INSERT INTO daily_game_completions (user_id, game_key, game_day)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, game_key, game_day) DO NOTHING`,
    [userId, gameKey, gameDay]
  )
}

async function checkAndGrantAllGamesBonus(pool, userId, gameDay) {
  // Check if already rewarded
  const { rows: existingRows } = await pool.query(
    'SELECT id, bonus_rewarded, title_xp_awarded FROM daily_game_set_rewards WHERE user_id = $1 AND game_day = $2',
    [userId, gameDay]
  )
  const existingReward = existingRows[0]

  if (existingReward && existingReward.bonus_rewarded) {
    return { granted: false, titleXpAwarded: 0 }
  }

  // Count completed games today
  const { rows: completions } = await pool.query(
    'SELECT game_key FROM daily_game_completions WHERE user_id = $1 AND game_day = $2',
    [userId, gameDay]
  )

  const completedKeys = new Set(completions.map((c) => c.game_key))
  const allDone = ALL_GAME_KEYS.every((k) => completedKeys.has(k))

  if (!allDone) {
    return { granted: false, titleXpAwarded: 0 }
  }

  // Grant bonus
  if (existingReward) {
    await pool.query(
      'UPDATE daily_game_set_rewards SET bonus_rewarded = true, title_xp_awarded = $2 WHERE id = $1',
      [existingReward.id, ALL_GAMES_BONUS_TITLE_XP]
    )
  } else {
    await pool.query(
      `INSERT INTO daily_game_set_rewards (user_id, game_day, bonus_rewarded, title_xp_awarded)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (user_id, game_day) DO UPDATE SET bonus_rewarded = true, title_xp_awarded = $3`,
      [userId, gameDay, ALL_GAMES_BONUS_TITLE_XP]
    )
  }

  // Add title XP
  await addTitleXp(pool, userId, ALL_GAMES_BONUS_TITLE_XP, 'all_games_bonus', null, gameDay)

  return { granted: true, titleXpAwarded: ALL_GAMES_BONUS_TITLE_XP }
}

async function addOrdinaryXp(pool, userId, amount, reason, gameKey, gameDay) {
  const profile = await getOrCreateProfile(pool, userId)
  if (!profile) return
  const newXp = profile.xp + amount
  const { level } = recalcOrdinaryLevel(newXp)
  await pool.query(
    'UPDATE mini_game_profile SET xp = $2, level = $3, updated_at = now() WHERE user_id = $1',
    [userId, newXp, level]
  )
  await pool.query(
    'INSERT INTO xp_transactions (user_id, amount, reason, game_key, game_day) VALUES ($1, $2, $3, $4, $5)',
    [userId, amount, reason, gameKey, gameDay]
  )
}

async function addCoins(pool, userId, amount, reason, gameKey, gameDay) {
  const profile = await getOrCreateProfile(pool, userId)
  if (!profile) return
  const newCoins = profile.coins + amount
  await pool.query(
    'UPDATE mini_game_profile SET coins = $2, updated_at = now() WHERE user_id = $1',
    [userId, newCoins]
  )
  await pool.query(
    'INSERT INTO coin_transactions (user_id, amount, reason, game_key, game_day) VALUES ($1, $2, $3, $4, $5)',
    [userId, amount, reason, gameKey, gameDay]
  )
}

async function addTitleXp(pool, userId, amount, reason, gameKey, gameDay) {
  const profile = await getOrCreateProfile(pool, userId)
  if (!profile) return { newLevel: 1, leveledUp: false }

  const currentTitleXp = profile.title_xp || 0
  const currentTitleLevel = profile.title_level || 1
  const newTitleXp = currentTitleXp + amount
  const titleResult = recalcTitleLevel(newTitleXp)
  const newTitleLevel = titleResult.level
  const newTitle = titleResult.title

  await pool.query(
    'UPDATE mini_game_profile SET title_xp = $2, title_level = $3, title = $4, updated_at = now() WHERE user_id = $1',
    [userId, newTitleXp, newTitleLevel, newTitle]
  )

  await pool.query(
    'INSERT INTO xp_transactions (user_id, amount, reason, game_key, game_day) VALUES ($1, $2, $3, $4, $5)',
    [userId, amount, `title_${reason}`, gameKey, gameDay]
  )

  return { newLevel: newTitleLevel, leveledUp: newTitleLevel > currentTitleLevel }
}

async function getOrCreateRewardRow(pool, table, gameDay, userId) {
  const { rows } = await pool.query(
    `SELECT id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
     FROM ${table} WHERE game_day = $1 AND user_id = $2`,
    [gameDay, userId]
  )
  if (rows.length > 0) return rows[0]

  // Insert with ON CONFLICT DO NOTHING
  await pool.query(
    `INSERT INTO ${table} (game_day, user_id) VALUES ($1, $2) ON CONFLICT (game_day, user_id) DO NOTHING`,
    [gameDay, userId]
  )

  const { rows: retry } = await pool.query(
    `SELECT id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
     FROM ${table} WHERE game_day = $1 AND user_id = $2`,
    [gameDay, userId]
  )
  return retry[0]
}

async function grantBaseReward(pool, userId, gameKey, gameNumber, gameDay, rewardTable) {
  const reward = await getOrCreateRewardRow(pool, rewardTable, gameDay, userId)

  if (reward.participation_rewarded) {
    const profile = await getOrCreateProfile(pool, userId)
    return { alreadyAwarded: true, profile, titleLeveledUp: false, newTitleLevel: profile?.title_level || 1 }
  }

  // Mark participation rewarded
  await pool.query(
    `UPDATE ${rewardTable} SET participation_rewarded = true, xp_awarded = $2, coins_awarded = $3 WHERE id = $1`,
    [reward.id, (reward.xp_awarded || 0) + BASE_XP, (reward.coins_awarded || 0) + BASE_COINS]
  )

  // Award XP + coins
  await addOrdinaryXp(pool, userId, BASE_XP, `${gameKey}_vote`, gameKey, gameDay)
  await addCoins(pool, userId, BASE_COINS, `${gameKey}_vote`, gameKey, gameDay)

  // Record completion
  await recordCompletion(pool, userId, gameKey, gameDay)

  // Check 10/10 bonus
  const bonusResult = await checkAndGrantAllGamesBonus(pool, userId, gameDay)
  let titleLeveledUp = false
  let newTitleLevel = 0
  if (bonusResult.granted) {
    const titleResult = await addTitleXp(pool, userId, 0, 'bonus_check', gameKey, gameDay)
    titleLeveledUp = titleResult.leveledUp
    newTitleLevel = titleResult.newLevel
  }

  const profile = await getOrCreateProfile(pool, userId)
  return { alreadyAwarded: false, profile, titleLeveledUp, newTitleLevel: profile?.title_level || 1 }
}

async function grantResultReward(pool, userId, gameKey, gameDay, rewardTable, tier) {
  const reward = await getOrCreateRewardRow(pool, rewardTable, gameDay, userId)

  if (reward.result_rewarded) {
    return { alreadyAwarded: true, titleXp: 0, coins: 0, titleLeveledUp: false, newTitleLevel: 0 }
  }

  const { titleXp, coins } = RESULT_REWARDS[tier]

  await pool.query(
    `UPDATE ${rewardTable} SET result_rewarded = true, title_xp_awarded = $2, coins_awarded = $3 WHERE id = $1`,
    [reward.id, (reward.title_xp_awarded || 0) + titleXp, (reward.coins_awarded || 0) + coins]
  )

  await addTitleXp(pool, userId, titleXp, `${gameKey}_result`, gameKey, gameDay)
  await addCoins(pool, userId, coins, `${gameKey}_result`, gameKey, gameDay)

  const profile = await getOrCreateProfile(pool, userId)
  return {
    alreadyAwarded: false,
    titleXp,
    coins,
    titleLeveledUp: false,
    newTitleLevel: profile?.title_level || 1,
  }
}

function buildProfileResponse(profile) {
  const { level: ordLevel, remainder: ordRemainder } = recalcOrdinaryLevel(profile.xp)
  const titleInfo = recalcTitleLevel(profile.title_xp || 0)
  return {
    user_id: profile.user_id,
    level: ordLevel,
    xp: profile.xp,
    currentXp: ordRemainder,
    neededXp: 20,
    coins: profile.coins,
    title: titleInfo.title,
    titleLevel: titleInfo.level,
    titleXp: profile.title_xp || 0,
    titleCurrentXp: titleInfo.currentXp,
    titleNeededXp: titleInfo.neededXp,
  }
}

async function getWorkers(pool) {
  const { rows } = await pool.query('SELECT name FROM game_workers ORDER BY name ASC')
  return rows.map((w) => w.name)
}

// ─── Daily poll: compute results ───
function computeResults(votes) {
  const voteCounts = {}
  for (const v of votes) {
    const candidates = Array.isArray(v.selected_candidates) ? v.selected_candidates : []
    for (const c of candidates) {
      if (voteCounts[c] !== undefined) voteCounts[c]++
      else voteCounts[c] = 1
    }
  }
  const ranked = Object.entries(voteCounts)
    .map(([candidate, votes]) => ({ candidate, votes }))
    .sort((a, b) => b.votes - a.votes || a.candidate.localeCompare(b.candidate))
  return ranked.map((r, i) => ({ ...r, placement: i + 1 }))
}

async function addXpToProfileDailyPoll(pool, userId, xpToAdd) {
  let { rows } = await pool.query(
    'SELECT user_id, xp, coins, title FROM mini_game_profile WHERE user_id = $1',
    [userId]
  )
  let profile = rows[0]

  if (!profile) {
    await pool.query(
      `INSERT INTO mini_game_profile (user_id, level, xp, coins, title)
       VALUES ($1, 1, 0, 0, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, LEVEL_TITLES[1]]
    )
    const { rows: retry } = await pool.query(
      'SELECT user_id, xp, coins, title FROM mini_game_profile WHERE user_id = $1',
      [userId]
    )
    profile = retry[0]
  }

  if (!profile) return

  const newXp = profile.xp + xpToAdd
  const { level, title } = recalcLevel(newXp)

  await pool.query(
    'UPDATE mini_game_profile SET xp = $2, level = $3, title = $4, updated_at = now() WHERE user_id = $1',
    [userId, newXp, level, title]
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — setupGameRoutes(app, pool)
// ═══════════════════════════════════════════════════════════════════════════

function setupGameRoutes(app, pool) {

  // ─── Health check ───
  app.get('/api/health', (req, res) => {
    setCorsHeaders(res)
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // MINI-GAMES PROFILE & PROGRESS — /api/mini-games
  // ═════════════════════════════════════════════════════════════════════════

  app.get('/api/mini-games', async (req, res) => {
    setCorsHeaders(res)
    try {
      const userId = req.query.userId
      if (!userId) return res.status(400).json({ error: 'userId required' })

      // Get or create profile
      let { rows: profileRows } = await pool.query(
        'SELECT user_id, level, xp, coins, title, title_xp, title_level, updated_at FROM mini_game_profile WHERE user_id = $1',
        [userId]
      )
      let profile = profileRows[0]

      if (!profile) {
        await pool.query(
          `INSERT INTO mini_game_profile (user_id, level, xp, coins, title, title_xp, title_level)
           VALUES ($1, 1, 0, 0, $2, 0, 1)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, LEVEL_TITLES[1]]
        )
        const { rows: retry } = await pool.query(
          'SELECT user_id, level, xp, coins, title, title_xp, title_level, updated_at FROM mini_game_profile WHERE user_id = $1',
          [userId]
        )
        profile = retry[0]
      }

      // Get progress
      const { rows: progress } = await pool.query(
        'SELECT game_number, completed, best_score, played_at FROM mini_game_progress WHERE user_id = $1 ORDER BY game_number ASC',
        [userId]
      )

      const { level, currentXp, neededXp, title } = currentLevelXP(profile.xp)
      const titleInfo = recalcTitleLevel(profile.title_xp || 0)

      res.json({
        profile: {
          user_id: profile.user_id,
          level,
          xp: profile.xp,
          currentXp,
          neededXp,
          coins: profile.coins,
          title: titleInfo.title,
          titleLevel: titleInfo.level,
          titleXp: profile.title_xp || 0,
          titleCurrentXp: titleInfo.currentXp,
          titleNeededXp: titleInfo.neededXp,
        },
        progress: progress || [],
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/mini-games', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { userId, addXp, addCoins } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      let { rows: profileRows } = await pool.query(
        'SELECT user_id, level, xp, coins, title FROM mini_game_profile WHERE user_id = $1',
        [userId]
      )
      let profile = profileRows[0]

      if (!profile) {
        await pool.query(
          `INSERT INTO mini_game_profile (user_id, level, xp, coins, title)
           VALUES ($1, 1, 0, 0, $2)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, LEVEL_TITLES[1]]
        )
        const { rows: retry } = await pool.query(
          'SELECT user_id, level, xp, coins, title FROM mini_game_profile WHERE user_id = $1',
          [userId]
        )
        profile = retry[0]
      }

      const newXp = profile.xp + (addXp || 0)
      const newCoins = profile.coins + (addCoins || 0)
      const { level, title } = recalcLevel(newXp)

      const { rows: updated } = await pool.query(
        `UPDATE mini_game_profile SET xp = $2, coins = $3, level = $4, title = $5, updated_at = now()
         WHERE user_id = $1
         RETURNING user_id, level, xp, coins, title, updated_at`,
        [userId, newXp, newCoins, level, title]
      )

      const { currentXp, neededXp } = currentLevelXP(updated[0].xp)

      res.json({
        profile: {
          user_id: updated[0].user_id,
          level: updated[0].level,
          xp: updated[0].xp,
          currentXp,
          neededXp,
          coins: updated[0].coins,
          title: updated[0].title,
        },
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.patch('/api/mini-games', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { userId, gameNumber, completed, bestScore } = req.body
      if (!userId || typeof gameNumber !== 'number' || gameNumber < 1 || gameNumber > 10) {
        return res.status(400).json({ error: 'userId and gameNumber (1-10) required' })
      }

      const { rows: existing } = await pool.query(
        'SELECT id, completed, best_score FROM mini_game_progress WHERE user_id = $1 AND game_number = $2',
        [userId, gameNumber]
      )

      let result
      if (existing.length > 0) {
        const updates = { played_at: new Date().toISOString() }
        if (completed !== undefined) updates.completed = completed
        if (bestScore !== undefined) updates.best_score = Math.max(existing[0].best_score, bestScore)

        const setParts = []
        const params = [existing[0].id]
        let paramIdx = 2
        if (completed !== undefined) {
          setParts.push(`completed = $${paramIdx++}`)
          params.push(updates.completed)
        }
        if (bestScore !== undefined) {
          setParts.push(`best_score = $${paramIdx++}`)
          params.push(updates.best_score)
        }
        setParts.push(`played_at = $${paramIdx++}`)
        params.push(updates.played_at)

        const { rows } = await pool.query(
          `UPDATE mini_game_progress SET ${setParts.join(', ')} WHERE id = $1
           RETURNING game_number, completed, best_score, played_at`,
          params
        )
        result = rows[0]
      } else {
        const { rows } = await pool.query(
          `INSERT INTO mini_game_progress (user_id, game_number, completed, best_score)
           VALUES ($1, $2, $3, $4)
           RETURNING game_number, completed, best_score, played_at`,
          [userId, gameNumber, completed || false, bestScore || 0]
        )
        result = rows[0]
      }

      res.json(result)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═════════════════════════════════════════════════════════════════════════
  // DAILY POLL — /api/daily-poll
  // ═════════════════════════════════════════════════════════════════════════

  app.get('/api/daily-poll', async (req, res) => {
    setCorsHeaders(res)
    try {
      const userId = req.query.userId
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const todayStr = getRussiaDateMidnight()
      const yesterdayStr = getYesterdayRussiaDateMidnight()

      // Get or create today's poll
      let { rows: pollRows } = await pool.query(
        'SELECT id, question_id, poll_date FROM daily_polls WHERE poll_date = $1',
        [todayStr]
      )
      let todayPoll = pollRows[0]

      if (!todayPoll) {
        const { rows: questions } = await pool.query(
          'SELECT id, question FROM daily_poll_questions WHERE active = true ORDER BY id ASC'
        )

        if (questions.length === 0) {
          return res.status(400).json({ error: 'Нет активных вопросов' })
        }

        const qIdx = pickIndex(`${todayStr}:question`, questions.length)
        const question = questions[qIdx]

        // Try to insert — ON CONFLICT handles race
        // Schema requires candidate_1/2/3, use empty strings as placeholders
        await pool.query(
          `INSERT INTO daily_polls (question_id, poll_date, candidate_1, candidate_2, candidate_3)
           VALUES ($1, $2, '', '', '')
           ON CONFLICT (poll_date) DO NOTHING`,
          [question.id, todayStr]
        )

        const { rows: retry } = await pool.query(
          'SELECT id, question_id, poll_date FROM daily_polls WHERE poll_date = $1',
          [todayStr]
        )
        todayPoll = retry[0]
      }

      if (!todayPoll) {
        return res.status(500).json({ error: 'Не удалось создать опрос' })
      }

      const { rows: qRows } = await pool.query(
        'SELECT question FROM daily_poll_questions WHERE id = $1',
        [todayPoll.question_id]
      )

      const { rows: voteRows } = await pool.query(
        'SELECT selected_candidates, voted_at FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2',
        [todayPoll.id, userId]
      )

      // Yesterday's poll + results
      const { rows: yPollRows } = await pool.query(
        'SELECT id, question_id, poll_date FROM daily_polls WHERE poll_date = $1',
        [yesterdayStr]
      )

      let yesterdayData = null
      if (yPollRows.length > 0) {
        const yPoll = yPollRows[0]

        const { rows: yQRows } = await pool.query(
          'SELECT question FROM daily_poll_questions WHERE id = $1',
          [yPoll.question_id]
        )

        const { rows: yVotes } = await pool.query(
          'SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1',
          [yPoll.id]
        )

        const results = computeResults(yVotes)

        const { rows: yUserVoteRows } = await pool.query(
          'SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2',
          [yPoll.id, userId]
        )

        const { rows: yRewardRows } = await pool.query(
          'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded FROM daily_poll_rewards WHERE daily_poll_id = $1 AND user_id = $2',
          [yPoll.id, userId]
        )

        yesterdayData = {
          pollId: yPoll.id,
          question: yQRows[0]?.question || '',
          results,
          userVote: yUserVoteRows[0]?.selected_candidates || null,
          reward: yRewardRows[0] || null,
        }
      }

      res.json({
        today: {
          pollId: todayPoll.id,
          question: qRows[0]?.question || '',
          userVote: voteRows[0]?.selected_candidates || null,
          votedAt: voteRows[0]?.voted_at || null,
        },
        yesterday: yesterdayData,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/daily-poll', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { userId, action, selectedCandidates } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const todayStr = getRussiaDateMidnight()

      if (action === 'vote') {
        if (!selectedCandidates || selectedCandidates.length < 1 || selectedCandidates.length > 3) {
          return res.status(400).json({ error: 'Выберите от 1 до 3 кандидатов' })
        }

        const { rows: pollRows } = await pool.query(
          'SELECT id FROM daily_polls WHERE poll_date = $1',
          [todayStr]
        )
        if (pollRows.length === 0) {
          return res.status(400).json({ error: 'Опрос не найден' })
        }

        const pollId = pollRows[0].id

        // Check if already voted
        const { rows: existingVote } = await pool.query(
          'SELECT id FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2',
          [pollId, userId]
        )
        if (existingVote.length > 0) {
          return res.status(409).json({ error: 'Вы уже проголосовали' })
        }

        try {
          await pool.query(
            'INSERT INTO daily_poll_user_votes (daily_poll_id, user_id, selected_candidates) VALUES ($1, $2, $3)',
            [pollId, userId, selectedCandidates]
          )
        } catch (voteErr) {
          if (voteErr.code === '23505') {
            return res.status(409).json({ error: 'Вы уже проголосовали' })
          }
          throw voteErr
        }

        // Award participation XP (+10 XP, +2 title progress) — only once
        const { rows: existingReward } = await pool.query(
          'SELECT id, participation_rewarded FROM daily_poll_rewards WHERE daily_poll_id = $1 AND user_id = $2',
          [pollId, userId]
        )

        let shouldAward = false
        if (existingReward.length === 0) {
          try {
            await pool.query(
              `INSERT INTO daily_poll_rewards (daily_poll_id, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded)
               VALUES ($1, $2, true, false, 10, 2)`,
              [pollId, userId]
            )
            shouldAward = true
          } catch (e) {
            shouldAward = false
          }
        } else if (!existingReward[0].participation_rewarded) {
          await pool.query(
            'UPDATE daily_poll_rewards SET participation_rewarded = true, xp_awarded = 10, title_xp_awarded = 2 WHERE id = $1',
            [existingReward[0].id]
          )
          shouldAward = true
        }

        if (shouldAward) {
          await addXpToProfileDailyPoll(pool, userId, 10)
        }

        return res.json({
          success: true,
          message: 'Голос учтён! Результаты будут доступны завтра в 08:00',
          selectedCandidates,
        })
      }

      if (action === 'claimResults') {
        const yesterdayStr = getYesterdayRussiaDateMidnight()

        const { rows: yPollRows } = await pool.query(
          'SELECT id FROM daily_polls WHERE poll_date = $1',
          [yesterdayStr]
        )
        if (yPollRows.length === 0) {
          return res.status(400).json({ error: 'Вчерашний опрос не найден' })
        }
        const yPollId = yPollRows[0].id

        const { rows: yUserVoteRows } = await pool.query(
          'SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2',
          [yPollId, userId]
        )
        if (yUserVoteRows.length === 0) {
          return res.json({
            success: true,
            message: 'Вы не участвовали во вчерашнем опросе',
            totalXp: 0,
            totalTitleXp: 0,
          })
        }

        const { rows: yRewardRows } = await pool.query(
          'SELECT id, result_rewarded, xp_awarded, title_xp_awarded FROM daily_poll_rewards WHERE daily_poll_id = $1 AND user_id = $2',
          [yPollId, userId]
        )

        if (yRewardRows.length > 0 && yRewardRows[0].result_rewarded) {
          return res.json({
            success: true,
            message: 'Награда уже получена',
            totalXp: yRewardRows[0].xp_awarded - 10,
            totalTitleXp: yRewardRows[0].title_xp_awarded - 2,
            alreadyClaimed: true,
          })
        }

        const { rows: yVotes } = await pool.query(
          'SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1',
          [yPollId]
        )

        const results = computeResults(yVotes)

        let totalXp = 0
        let totalTitleXp = 0
        const breakdown = []

        for (const sel of yUserVoteRows[0].selected_candidates) {
          const result = results.find((r) => r.candidate === sel)
          if (result && result.placement <= 3) {
            const reward = PLACEMENT_REWARDS[result.placement]
            totalXp += reward.xp
            totalTitleXp += reward.titleXp
            breakdown.push({ candidate: sel, placement: result.placement, xp: reward.xp, titleXp: reward.titleXp })
          }
        }

        if (yRewardRows.length > 0) {
          await pool.query(
            'UPDATE daily_poll_rewards SET result_rewarded = true, xp_awarded = $2, title_xp_awarded = $3 WHERE id = $1',
            [yRewardRows[0].id, (yRewardRows[0].xp_awarded || 10) + totalXp, (yRewardRows[0].title_xp_awarded || 2) + totalTitleXp]
          )
        } else {
          await pool.query(
            `INSERT INTO daily_poll_rewards (daily_poll_id, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded)
             VALUES ($1, $2, true, true, $3, $4)`,
            [yPollId, userId, 10 + totalXp, 2 + totalTitleXp]
          )
        }

        if (totalXp > 0) {
          await addXpToProfileDailyPoll(pool, userId, totalXp)
        }

        return res.json({
          success: true,
          totalXp,
          totalTitleXp,
          breakdown,
          results,
        })
      }

      return res.status(400).json({ error: 'Unknown action' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE NUMBERS — /api/knowledge-numbers
  // ═════════════════════════════════════════════════════════════════════════

  app.get('/api/knowledge-numbers', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { rows } = await pool.query(
        'SELECT number, content, updated_at FROM knowledge_numbers ORDER BY number ASC'
      )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.patch('/api/knowledge-numbers', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { number, content, password } = req.body

      if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Неверный пароль' })
      }

      if (typeof number !== 'number' || number < 1 || number > 31) {
        return res.status(400).json({ error: 'Неверный номер' })
      }

      const { rows } = await pool.query(
        `UPDATE knowledge_numbers SET content = $2, updated_at = now()
         WHERE number = $1
         RETURNING number, content, updated_at`,
        [number, content]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' })
      }

      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═════════════════════════════════════════════════════════════════════════
  // TEST BLOCKS — /api/test-blocks
  // ═════════════════════════════════════════════════════════════════════════

  app.get('/api/test-blocks', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { rows } = await pool.query(
        'SELECT question_id, block_number, updated_at FROM test_question_blocks ORDER BY question_id ASC'
      )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.patch('/api/test-blocks', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { question_id, block_number, password } = req.body

      if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Неверный пароль' })
      }

      if (!question_id || typeof question_id !== 'string') {
        return res.status(400).json({ error: 'question_id is required' })
      }

      if (block_number === null) {
        await pool.query('DELETE FROM test_question_blocks WHERE question_id = $1', [question_id])
        return res.json({ question_id, block_number: null })
      }

      if (typeof block_number !== 'number' || block_number < 1 || block_number > 4) {
        return res.status(400).json({ error: 'block_number must be 1-4 or null' })
      }

      const { rows } = await pool.query(
      `INSERT INTO test_question_blocks (question_id, block_number, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (question_id) DO UPDATE SET block_number = EXCLUDED.block_number, updated_at = now()
       RETURNING question_id, block_number, updated_at`,
      [question_id, block_number]
      )

      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═════════════════════════════════════════════════════════════════════════
  // MINI-GAMES #2-10 — /api/mini-games-2-6
  // Unified GET (game state) and POST (vote / claimResults)
  // ═════════════════════════════════════════════════════════════════════════

  app.get('/api/mini-games-2-6', async (req, res) => {
    setCorsHeaders(res)
    try {
      const gameKey = req.query.gameKey
      const userId = req.query.userId
      if (!gameKey || !userId) {
        return res.status(400).json({ error: 'gameKey and userId required' })
      }

      const todayStr = getRussiaDate()
      const yesterdayStr = getYesterdayRussiaDate()

      if (gameKey === 'who_of_them') {
        return await handleWhoOfThemGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'would_he_do_it') {
        return await handleWouldHeDoItGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'past_life') {
        return await handlePastLifeGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'best_duo') {
        return await handleBestDuoGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'rate_player') {
        return await handleRatePlayerGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'mafia') {
        return await handleMafiaGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'yes_no') {
        return await handleYesNoGet(pool, res, userId, todayStr, yesterdayStr)
      } else if (gameKey === 'secret_love') {
        return await handleSecretLoveGet(pool, res, userId, todayStr)
      } else if (gameKey === 'roulette') {
        return await handleRouletteGet(pool, res, userId, todayStr, yesterdayStr)
      }

      return res.status(400).json({ error: 'Unknown gameKey' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/mini-games-2-6', async (req, res) => {
    setCorsHeaders(res)
    try {
      const { gameKey, userId, action, ...params } = req.body
      if (!gameKey || !userId) {
        return res.status(400).json({ error: 'gameKey and userId required' })
      }

      const todayStr = getRussiaDate()
      const yesterdayStr = getYesterdayRussiaDate()

      if (action === 'vote') {
        if (gameKey === 'who_of_them') {
          return await handleWhoOfThemVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'would_he_do_it') {
          return await handleWouldHeDoItVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'past_life') {
          return await handlePastLifeVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'best_duo') {
          return await handleBestDuoVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'rate_player') {
          return await handleRatePlayerVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'mafia') {
          return await handleMafiaVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'yes_no') {
          return await handleYesNoVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'secret_love') {
          return await handleSecretLoveVote(pool, res, userId, todayStr, params)
        } else if (gameKey === 'roulette') {
          return await handleRouletteVote(pool, res, userId, todayStr, params)
        }
      } else if (action === 'claimResults') {
        if (gameKey === 'who_of_them') {
          return await handleWhoOfThemClaim(pool, res, userId, yesterdayStr)
        } else if (gameKey === 'would_he_do_it') {
          return await handleWouldHeDoItClaim(pool, res, userId, yesterdayStr)
        } else if (gameKey === 'best_duo') {
          return await handleBestDuoClaim(pool, res, userId, yesterdayStr)
        } else if (gameKey === 'rate_player') {
          return await handleRatePlayerClaim(pool, res, userId, yesterdayStr)
        } else if (gameKey === 'yes_no') {
          return await handleYesNoClaim(pool, res, userId, yesterdayStr)
        }
        // past_life, mafia, secret_love, roulette have no claim — rewards are immediate
      }

      return res.status(400).json({ error: 'Unknown action or gameKey' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #2: WHO OF THEM
  // ═════════════════════════════════════════════════════════════════════════

  async function handleWhoOfThemGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 2) return res.status(400).json({ error: 'Недостаточно игроков' })

    const questions = QUESTIONS.who_of_them

    // Get or create today's daily entry
    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM who_of_them_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:wot:q`, questions.length)
      const players = pickNPlayers(`${todayStr}:wot:players`, workers, 2)
      try {
        await pool.query(
          `INSERT INTO who_of_them_daily (game_day, question_index, player_1, player_2)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, players[0], players[1]]
        )
      } catch (e) { /* race condition — ON CONFLICT handles it */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM who_of_them_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT selected_player, voted_at FROM who_of_them_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    // Yesterday's results
    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM who_of_them_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT selected_player FROM who_of_them_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const voteCounts = {}
      for (const v of yVotes) {
        voteCounts[v.selected_player] = (voteCounts[v.selected_player] || 0) + 1
      }

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT selected_player FROM who_of_them_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const { rows: yRewardRows } = await pool.query(
        'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded FROM who_of_them_rewards WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const p1Votes = voteCounts[yDaily.player_1] || 0
      const p2Votes = voteCounts[yDaily.player_2] || 0
      let winner = null
      if (p1Votes > p2Votes) winner = yDaily.player_1
      else if (p2Votes > p1Votes) winner = yDaily.player_2

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        player_1: yDaily.player_1,
        player_2: yDaily.player_2,
        votes: { [yDaily.player_1]: p1Votes, [yDaily.player_2]: p2Votes },
        winner,
        userVote: yUserVoteRows[0]?.selected_player || null,
        reward: yRewardRows[0] || null,
      }
    }

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        player_1: daily.player_1,
        player_2: daily.player_2,
        userVote: voteRows[0]?.selected_player || null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleWhoOfThemVote(pool, res, userId, todayStr, params) {
    const { selectedPlayer } = params
    if (!selectedPlayer) return res.status(400).json({ error: 'selectedPlayer required' })

    const { rows: existing } = await pool.query(
      'SELECT id FROM who_of_them_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже проголосовали' })

    try {
      await pool.query(
        'INSERT INTO who_of_them_votes (game_day, user_id, selected_player) VALUES ($1, $2, $3)',
        [todayStr, userId, selectedPlayer]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже проголосовали' })
      throw voteErr
    }

    const result = await grantBaseReward(pool, userId, 'who_of_them', 2, todayStr, 'who_of_them_rewards')

    res.json({
      success: true,
      message: 'Голос учтён! Результаты будут доступны завтра в 08:00',
      profile: buildProfileResponse(result.profile),
    })
  }

  async function handleWhoOfThemClaim(pool, res, userId, yesterdayStr) {
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM who_of_them_daily WHERE game_day = $1',
      [yesterdayStr]
    )
    if (yDailyRows.length === 0) return res.status(400).json({ error: 'Вчерашняя игра не найдена' })
    const yDaily = yDailyRows[0]

    const { rows: yUserVoteRows } = await pool.query(
      'SELECT selected_player FROM who_of_them_votes WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yUserVoteRows.length === 0) {
      return res.json({ success: true, message: 'Вы не участвовали вчера', totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yRewardRows } = await pool.query(
      'SELECT id, result_rewarded FROM who_of_them_rewards WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yRewardRows.length > 0 && yRewardRows[0].result_rewarded) {
      return res.json({ success: true, message: 'Награда уже получена', alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yVotes } = await pool.query(
      'SELECT selected_player FROM who_of_them_votes WHERE game_day = $1',
      [yesterdayStr]
    )

    const p1Votes = yVotes.filter((v) => v.selected_player === yDaily.player_1).length
    const p2Votes = yVotes.filter((v) => v.selected_player === yDaily.player_2).length

    let winner = null
    if (p1Votes > p2Votes) winner = yDaily.player_1
    else if (p2Votes > p1Votes) winner = yDaily.player_2

    // No reward on draw
    if (!winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE who_of_them_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO who_of_them_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ничья — награда не выдаётся', totalTitleXp: 0, totalCoins: 0, winner: null })
    }

    // Check if user's pick won
    if (yUserVoteRows[0].selected_player !== winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE who_of_them_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO who_of_them_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ваш выбор не победил', totalTitleXp: 0, totalCoins: 0, winner })
    }

    // User won — silver reward
    const claimResult = await grantResultReward(pool, userId, 'who_of_them', yesterdayStr, 'who_of_them_rewards', 'silver')
    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      message: 'Ваш выбор победил!',
      totalTitleXp: claimResult.titleXp,
      totalCoins: claimResult.coins,
      winner,
      profile: buildProfileResponse(profile),
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #3: WOULD HE DO IT
  // ═════════════════════════════════════════════════════════════════════════

  async function handleWouldHeDoItGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 1) return res.status(400).json({ error: 'Недостаточно игроков' })

    const questions = QUESTIONS.would_he_do_it

    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM would_he_do_it_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:whdi:q`, questions.length)
      const pIdx = pickIndex(`${todayStr}:whdi:player`, workers.length)
      try {
        await pool.query(
          `INSERT INTO would_he_do_it_daily (game_day, question_index, player_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, workers[pIdx]]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM would_he_do_it_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT vote, voted_at FROM would_he_do_it_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM would_he_do_it_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT vote FROM would_he_do_it_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const yesVotes = yVotes.filter((v) => v.vote === 'yes').length
      const noVotes = yVotes.filter((v) => v.vote === 'no').length

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT vote FROM would_he_do_it_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const { rows: yRewardRows } = await pool.query(
        'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded FROM would_he_do_it_rewards WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      let winner = null
      if (yesVotes > noVotes) winner = 'yes'
      else if (noVotes > yesVotes) winner = 'no'

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        player_name: yDaily.player_name,
        yesVotes,
        noVotes,
        winner,
        userVote: yUserVoteRows[0]?.vote || null,
        reward: yRewardRows[0] || null,
      }
    }

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        player_name: daily.player_name,
        userVote: voteRows[0]?.vote || null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleWouldHeDoItVote(pool, res, userId, todayStr, params) {
    const { vote } = params
    if (vote !== 'yes' && vote !== 'no') return res.status(400).json({ error: "vote must be 'yes' or 'no'" })

    const { rows: existing } = await pool.query(
      'SELECT id FROM would_he_do_it_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже проголосовали' })

    try {
      await pool.query(
        'INSERT INTO would_he_do_it_votes (game_day, user_id, vote) VALUES ($1, $2, $3)',
        [todayStr, userId, vote]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже проголосовали' })
      throw voteErr
    }

    const result = await grantBaseReward(pool, userId, 'would_he_do_it', 3, todayStr, 'would_he_do_it_rewards')

    res.json({
      success: true,
      message: 'Ответ учтён! Результаты будут доступны завтра в 08:00',
      profile: buildProfileResponse(result.profile),
    })
  }

  async function handleWouldHeDoItClaim(pool, res, userId, yesterdayStr) {
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM would_he_do_it_daily WHERE game_day = $1',
      [yesterdayStr]
    )
    if (yDailyRows.length === 0) return res.status(400).json({ error: 'Вчерашняя игра не найдена' })
    const yDaily = yDailyRows[0]

    const { rows: yUserVoteRows } = await pool.query(
      'SELECT vote FROM would_he_do_it_votes WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yUserVoteRows.length === 0) {
      return res.json({ success: true, message: 'Вы не участвовали вчера', totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yRewardRows } = await pool.query(
      'SELECT id, result_rewarded FROM would_he_do_it_rewards WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yRewardRows.length > 0 && yRewardRows[0].result_rewarded) {
      return res.json({ success: true, message: 'Награда уже получена', alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yVotes } = await pool.query(
      'SELECT vote FROM would_he_do_it_votes WHERE game_day = $1',
      [yesterdayStr]
    )

    const yesVotes = yVotes.filter((v) => v.vote === 'yes').length
    const noVotes = yVotes.filter((v) => v.vote === 'no').length

    let winner = null
    if (yesVotes > noVotes) winner = 'yes'
    else if (noVotes > yesVotes) winner = 'no'

    if (!winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE would_he_do_it_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO would_he_do_it_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ничья — награда не выдаётся', totalTitleXp: 0, totalCoins: 0, winner: null })
    }

    if (yUserVoteRows[0].vote !== winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE would_he_do_it_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO would_he_do_it_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ваш выбор не победил', totalTitleXp: 0, totalCoins: 0, winner })
    }

    // Bronze reward
    const claimResult = await grantResultReward(pool, userId, 'would_he_do_it', yesterdayStr, 'would_he_do_it_rewards', 'bronze')
    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      message: 'Ваш выбор победил!',
      totalTitleXp: claimResult.titleXp,
      totalCoins: claimResult.coins,
      winner,
      profile: buildProfileResponse(profile),
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #4: PAST LIFE
  // ═════════════════════════════════════════════════════════════════════════

  async function handlePastLifeGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 3) return res.status(400).json({ error: 'Недостаточно игроков (нужно минимум 3)' })

    const questions = QUESTIONS.past_life

    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM past_life_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:pl:q`, questions.length)
      const players = pickNPlayers(`${todayStr}:pl:players`, workers, 3)
      const correctIdx = pickIndex(`${todayStr}:pl:correct`, 3)
      try {
        await pool.query(
          `INSERT INTO past_life_daily (game_day, question_index, player_1, player_2, player_3, correct_index)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, players[0], players[1], players[2], correctIdx]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM past_life_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT selected_index, is_correct, voted_at FROM past_life_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    // Yesterday's results
    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM past_life_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT selected_index, is_correct FROM past_life_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const correctCount = yVotes.filter((v) => v.is_correct).length
      const totalCount = yVotes.length

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT selected_index, is_correct FROM past_life_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        player_1: yDaily.player_1,
        player_2: yDaily.player_2,
        player_3: yDaily.player_3,
        correct_index: yDaily.correct_index,
        correctCount,
        totalCount,
        userVote: yUserVoteRows[0] ? { selected_index: yUserVoteRows[0].selected_index, is_correct: yUserVoteRows[0].is_correct } : null,
      }
    }

    const players = [daily.player_1, daily.player_2, daily.player_3]

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        players,
        userVote: voteRows[0] ? { selected_index: voteRows[0].selected_index, is_correct: voteRows[0].is_correct } : null,
        correctIndex: voteRows.length > 0 ? daily.correct_index : null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handlePastLifeVote(pool, res, userId, todayStr, params) {
    const { selectedIndex } = params
    if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex > 2) {
      return res.status(400).json({ error: 'selectedIndex must be 0, 1, or 2' })
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM past_life_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже ответили' })

    // Get the daily entry to check correctness
    const { rows: dailyRows } = await pool.query(
      'SELECT correct_index FROM past_life_daily WHERE game_day = $1',
      [todayStr]
    )
    if (dailyRows.length === 0) return res.status(400).json({ error: 'Игра не найдена' })

    const isCorrect = selectedIndex === dailyRows[0].correct_index

    try {
      await pool.query(
        'INSERT INTO past_life_votes (game_day, user_id, selected_index, is_correct) VALUES ($1, $2, $3, $4)',
        [todayStr, userId, selectedIndex, isCorrect]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже ответили' })
      throw voteErr
    }

    // Base reward
    const result = await grantBaseReward(pool, userId, 'past_life', 4, todayStr, 'past_life_rewards')

    // If correct — immediate gold reward
    let goldResult = null
    if (isCorrect) {
      goldResult = await grantResultReward(pool, userId, 'past_life', todayStr, 'past_life_rewards', 'gold')
    }

    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      isCorrect,
      correctIndex: dailyRows[0].correct_index,
      message: isCorrect ? 'Правильно!' : 'Неправильно',
      profile: buildProfileResponse(profile),
      goldReward: goldResult ? { titleXp: goldResult.titleXp, coins: goldResult.coins } : null,
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #5: BEST DUO
  // ═════════════════════════════════════════════════════════════════════════

  async function handleBestDuoGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 4) return res.status(400).json({ error: 'Недостаточно игроков (нужно минимум 4)' })

    const questions = QUESTIONS.best_duo

    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM best_duo_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:bd:q`, questions.length)
      const players = pickNPlayers(`${todayStr}:bd:players`, workers, 4)
      try {
        await pool.query(
          `INSERT INTO best_duo_daily (game_day, question_index, player_1, player_2, player_3, player_4)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, players[0], players[1], players[2], players[3]]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM best_duo_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT selected_team, voted_at FROM best_duo_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM best_duo_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT selected_team FROM best_duo_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const team1Votes = yVotes.filter((v) => v.selected_team === 1).length
      const team2Votes = yVotes.filter((v) => v.selected_team === 2).length

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT selected_team FROM best_duo_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const { rows: yRewardRows } = await pool.query(
        'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded FROM best_duo_rewards WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      let winner = null
      if (team1Votes > team2Votes) winner = 1
      else if (team2Votes > team1Votes) winner = 2

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        team1: [yDaily.player_1, yDaily.player_2],
        team2: [yDaily.player_3, yDaily.player_4],
        team1Votes,
        team2Votes,
        winner,
        userVote: yUserVoteRows[0]?.selected_team || null,
        reward: yRewardRows[0] || null,
      }
    }

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        team1: [daily.player_1, daily.player_2],
        team2: [daily.player_3, daily.player_4],
        userVote: voteRows[0]?.selected_team || null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleBestDuoVote(pool, res, userId, todayStr, params) {
    const { selectedTeam } = params
    if (selectedTeam !== 1 && selectedTeam !== 2) return res.status(400).json({ error: 'selectedTeam must be 1 or 2' })

    const { rows: existing } = await pool.query(
      'SELECT id FROM best_duo_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже проголосовали' })

    try {
      await pool.query(
        'INSERT INTO best_duo_votes (game_day, user_id, selected_team) VALUES ($1, $2, $3)',
        [todayStr, userId, selectedTeam]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже проголосовали' })
      throw voteErr
    }

    const result = await grantBaseReward(pool, userId, 'best_duo', 5, todayStr, 'best_duo_rewards')

    res.json({
      success: true,
      message: 'Голос учтён! Результаты будут доступны завтра в 08:00',
      profile: buildProfileResponse(result.profile),
    })
  }

  async function handleBestDuoClaim(pool, res, userId, yesterdayStr) {
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM best_duo_daily WHERE game_day = $1',
      [yesterdayStr]
    )
    if (yDailyRows.length === 0) return res.status(400).json({ error: 'Вчерашняя игра не найдена' })
    const yDaily = yDailyRows[0]

    const { rows: yUserVoteRows } = await pool.query(
      'SELECT selected_team FROM best_duo_votes WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yUserVoteRows.length === 0) {
      return res.json({ success: true, message: 'Вы не участвовали вчера', totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yRewardRows } = await pool.query(
      'SELECT id, result_rewarded FROM best_duo_rewards WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yRewardRows.length > 0 && yRewardRows[0].result_rewarded) {
      return res.json({ success: true, message: 'Награда уже получена', alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yVotes } = await pool.query(
      'SELECT selected_team FROM best_duo_votes WHERE game_day = $1',
      [yesterdayStr]
    )

    const team1Votes = yVotes.filter((v) => v.selected_team === 1).length
    const team2Votes = yVotes.filter((v) => v.selected_team === 2).length

    let winner = null
    if (team1Votes > team2Votes) winner = 1
    else if (team2Votes > team1Votes) winner = 2

    if (!winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE best_duo_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO best_duo_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ничья — награда не выдаётся', totalTitleXp: 0, totalCoins: 0, winner: null })
    }

    if (yUserVoteRows[0].selected_team !== winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE best_duo_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO best_duo_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ваш выбор не победил', totalTitleXp: 0, totalCoins: 0, winner })
    }

    const claimResult = await grantResultReward(pool, userId, 'best_duo', yesterdayStr, 'best_duo_rewards', 'silver')
    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      message: 'Ваш дуэт победил!',
      totalTitleXp: claimResult.titleXp,
      totalCoins: claimResult.coins,
      winner,
      profile: buildProfileResponse(profile),
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #6: RATE PLAYER
  // ═════════════════════════════════════════════════════════════════════════

  async function handleRatePlayerGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 1) return res.status(400).json({ error: 'Недостаточно игроков' })

    const questions = QUESTIONS.rate_player

    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM rate_player_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:rp:q`, questions.length)
      const pIdx = pickIndex(`${todayStr}:rp:player`, workers.length)
      try {
        await pool.query(
          `INSERT INTO rate_player_daily (game_day, question_index, player_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, workers[pIdx]]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM rate_player_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT rating, voted_at FROM rate_player_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM rate_player_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT rating FROM rate_player_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const ratings = yVotes.map((v) => v.rating)
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT rating FROM rate_player_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const { rows: yRewardRows } = await pool.query(
        'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded FROM rate_player_rewards WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        player_name: yDaily.player_name,
        avgRating: Math.round(avgRating * 10) / 10,
        totalVotes: ratings.length,
        userVote: yUserVoteRows[0]?.rating ?? null,
        reward: yRewardRows[0] || null,
      }
    }

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        player_name: daily.player_name,
        userVote: voteRows[0]?.rating ?? null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleRatePlayerVote(pool, res, userId, todayStr, params) {
    const { rating } = params
    if (typeof rating !== 'number' || rating < 0 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'rating must be an integer 0-5' })
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM rate_player_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже оценили' })

    try {
      await pool.query(
        'INSERT INTO rate_player_votes (game_day, user_id, rating) VALUES ($1, $2, $3)',
        [todayStr, userId, rating]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже оценили' })
      throw voteErr
    }

    // Base reward
    const result = await grantBaseReward(pool, userId, 'rate_player', 6, todayStr, 'rate_player_rewards')

    // Immediate silver reward for completing the rating
    const silverResult = await grantResultReward(pool, userId, 'rate_player', todayStr, 'rate_player_rewards', 'silver')
    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      message: 'Оценка принята! Результаты будут доступны завтра в 08:00',
      profile: buildProfileResponse(profile),
      silverReward: { titleXp: silverResult.titleXp, coins: silverResult.coins },
    })
  }

  async function handleRatePlayerClaim(pool, res, userId, yesterdayStr) {
    // Rate player has no claim — rewards are immediate. But we return yesterday's stats.
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM rate_player_daily WHERE game_day = $1',
      [yesterdayStr]
    )
    if (yDailyRows.length === 0) return res.json({ success: true, message: 'Нет вчерашних данных' })
    const yDaily = yDailyRows[0]

    const { rows: yVotes } = await pool.query(
      'SELECT rating FROM rate_player_votes WHERE game_day = $1',
      [yesterdayStr]
    )

    const ratings = yVotes.map((v) => v.rating)
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0

    res.json({
      success: true,
      question: QUESTIONS.rate_player[yDaily.question_index] || QUESTIONS.rate_player[0],
      player_name: yDaily.player_name,
      avgRating: Math.round(avgRating * 10) / 10,
      totalVotes: ratings.length,
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #7: MAFIA
  // ═════════════════════════════════════════════════════════════════════════

  async function handleMafiaGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 5) return res.status(400).json({ error: 'Недостаточно игроков (нужно минимум 5)' })

    // Get or create today's mafia_daily (shared for all users)
    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM mafia_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const players = pickNPlayers(`${todayStr}:mafia:players`, workers, 5)
      const mafiaIdx = pickIndex(`${todayStr}:mafia:correct`, 5)
      try {
        await pool.query(
          `INSERT INTO mafia_daily (game_day, question_index, player_1, player_2, player_3, player_4, player_5, mafia_index)
           VALUES ($1, 0, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, players[0], players[1], players[2], players[3], players[4], mafiaIdx]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM mafia_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    // Get or create user state
    let { rows: userStateRows } = await pool.query(
      'SELECT * FROM mafia_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    let userState = userStateRows[0]

    if (!userState) {
      await pool.query(
        `INSERT INTO mafia_user_state (game_day, user_id) VALUES ($1, $2) ON CONFLICT (game_day, user_id) DO NOTHING`,
        [todayStr, userId]
      )
      const { rows: retry } = await pool.query(
        'SELECT * FROM mafia_user_state WHERE game_day = $1 AND user_id = $2',
        [todayStr, userId]
      )
      userState = retry[0]
    }

    // Yesterday's stats
    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM mafia_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const yPlayers = [yDaily.player_1, yDaily.player_2, yDaily.player_3, yDaily.player_4, yDaily.player_5]
      const mafiaName = yPlayers[yDaily.mafia_index]

      const { rows: yStates } = await pool.query(
        'SELECT found_mafia, attempt_count, game_ended FROM mafia_user_state WHERE game_day = $1 AND game_ended = true',
        [yesterdayStr]
      )

      const totalPlayed = yStates.length
      const guessed = yStates.filter((s) => s.found_mafia).length
      const notGuessed = totalPlayed - guessed
      const firstTry = yStates.filter((s) => s.found_mafia && s.attempt_count === 1).length
      const secondTry = yStates.filter((s) => s.found_mafia && s.attempt_count === 2).length

      yesterdayData = {
        mafia: mafiaName,
        guessed,
        notGuessed,
        firstTry,
        secondTry,
        totalPlayed,
      }
    }

    const players = [daily.player_1, daily.player_2, daily.player_3, daily.player_4, daily.player_5]
    const eliminated = []
    if (userState.eliminated_1 !== null && userState.eliminated_1 !== undefined) eliminated.push(userState.eliminated_1)
    if (userState.eliminated_2 !== null && userState.eliminated_2 !== undefined) eliminated.push(userState.eliminated_2)

    res.json({
      today: {
        players,
        attemptCount: userState.attempt_count,
        eliminated,
        foundMafia: userState.found_mafia,
        gameEnded: userState.game_ended,
        mafiaIndex: userState.game_ended ? daily.mafia_index : null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleMafiaVote(pool, res, userId, todayStr, params) {
   const { selectedPlayerId, selectedIndex: incomingSelectedIndex } = params

// Get daily entry
const { rows: dailyRows } = await pool.query(
  'SELECT * FROM mafia_daily WHERE game_day = $1',
  [todayStr]
)

if (dailyRows.length === 0) {
  return res.status(400).json({ error: 'Игра не найдена' })
}

const daily = dailyRows[0]
const dailyPlayers = [
  daily.player_1,
  daily.player_2,
  daily.player_3,
  daily.player_4,
  daily.player_5,
]

let selectedIndex

if (typeof selectedPlayerId === 'number') {
  const { rows: playerRows } = await pool.query(
    'SELECT full_name FROM players WHERE id = $1',
    [selectedPlayerId],
  )

  if (playerRows.length === 0) {
    return res.status(400).json({ error: 'Игрок не найден' })
  }

  selectedIndex = dailyPlayers.indexOf(playerRows[0].full_name)
} else {
  selectedIndex = incomingSelectedIndex
}

if (
  typeof selectedIndex !== 'number' ||
  selectedIndex < 0 ||
  selectedIndex > 4
) {
  return res.status(400).json({ error: 'selectedIndex must be 0-4' })
}

    // Get or create user state
    let { rows: userStateRows } = await pool.query(
      'SELECT * FROM mafia_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    let userState = userStateRows[0]

    if (!userState) {
      await pool.query(
        `INSERT INTO mafia_user_state (game_day, user_id) VALUES ($1, $2) ON CONFLICT (game_day, user_id) DO NOTHING`,
        [todayStr, userId]
      )
      const { rows: retry } = await pool.query(
        'SELECT * FROM mafia_user_state WHERE game_day = $1 AND user_id = $2',
        [todayStr, userId]
      )
      userState = retry[0]
    }

    // Already ended?
    if (userState.game_ended) {
      return res.status(409).json({ error: 'Игра уже завершена', gameEnded: true, mafiaIndex: daily.mafia_index })
    }

    // Already used 2 attempts?
    if (userState.attempt_count >= 2) {
      return res.status(400).json({ error: 'Попытки закончились' })
    }

    // Can't pick already eliminated
    const eliminated = []
    if (userState.eliminated_1 !== null && userState.eliminated_1 !== undefined) eliminated.push(userState.eliminated_1)
    if (userState.eliminated_2 !== null && userState.eliminated_2 !== undefined) eliminated.push(userState.eliminated_2)
    if (selectedIndex !== -1 && eliminated.includes(selectedIndex)) {
      return res.status(400).json({ error: 'Этот игрок уже выбран' })
    }

    const isMafia = selectedIndex === daily.mafia_index
    const attemptNum = userState.attempt_count + 1

    // Record attempt
    await pool.query(
      'INSERT INTO mafia_attempts (game_day, user_id, attempt_number, selected_index, is_mafia) VALUES ($1, $2, $3, $4, $5)',
      [todayStr, userId, attemptNum, selectedIndex, isMafia]
    )

    if (isMafia) {
      // Won!
      const multiplier = attemptNum === 1 ? 3 : 2
      const titleXpAmount = RESULT_REWARDS.gold.titleXp * multiplier
      const coinsAmount = RESULT_REWARDS.gold.coins * multiplier

      // Update user state
      const elim2 = (userState.eliminated_1 === null || userState.eliminated_1 === undefined) ? selectedIndex : userState.eliminated_1
      await pool.query(
        'UPDATE mafia_user_state SET attempt_count = $2, found_mafia = true, game_ended = true, eliminated_2 = $3, updated_at = now() WHERE id = $1',
        [userState.id, attemptNum, elim2]
      )

      // Grant base reward
      const reward = await getOrCreateRewardRow(pool, 'mafia_rewards', todayStr, userId)
      if (!reward.participation_rewarded) {
        await pool.query(
          'UPDATE mafia_rewards SET participation_rewarded = true, xp_awarded = $2, coins_awarded = $3 WHERE id = $1',
          [reward.id, (reward.xp_awarded || 0) + BASE_XP, (reward.coins_awarded || 0) + BASE_COINS]
        )
        await addOrdinaryXp(pool, userId, BASE_XP, 'mafia_play', 'mafia', todayStr)
        await addCoins(pool, userId, BASE_COINS, 'mafia_play', 'mafia', todayStr)
      }

      // Grant result reward
      await pool.query(
        'UPDATE mafia_rewards SET result_rewarded = true, title_xp_awarded = $2, coins_awarded = $3 WHERE id = $1',
        [reward.id, (reward.title_xp_awarded || 0) + titleXpAmount, (reward.coins_awarded || 0) + coinsAmount]
      )
      const reason = attemptNum === 1 ? 'mafia_first_try_win' : 'mafia_second_try_win'
      await addTitleXp(pool, userId, titleXpAmount, reason, 'mafia', todayStr)
      await addCoins(pool, userId, coinsAmount, reason, 'mafia', todayStr)

      // Record completion + check bonus
      await recordCompletion(pool, userId, 'mafia', todayStr)
      await checkAndGrantAllGamesBonus(pool, userId, todayStr)

      const profile = await getOrCreateProfile(pool, userId)
      return res.json({
        success: true,
        isMafia: true,
        attemptNumber: attemptNum,
        gameEnded: true,
        mafiaIndex: daily.mafia_index,
        titleXpAwarded: titleXpAmount,
        coinsAwarded: coinsAmount,
        profile: buildProfileResponse(profile),
      })
    }

    // Wrong guess
    if (attemptNum === 1) {
      // First wrong — allow second attempt
      await pool.query(
        'UPDATE mafia_user_state SET attempt_count = 1, eliminated_1 = $2, updated_at = now() WHERE id = $1',
        [userState.id, selectedIndex]
      )

      return res.json({
        success: true,
        isMafia: false,
        attemptNumber: 1,
        gameEnded: false,
        remainingAttempts: 1,
      })
    } else {
      // Second wrong — game over, grant base reward only
      await pool.query(
        'UPDATE mafia_user_state SET attempt_count = 2, eliminated_2 = $2, found_mafia = false, game_ended = true, updated_at = now() WHERE id = $1',
        [userState.id, selectedIndex]
      )

      // Grant base reward
      const reward = await getOrCreateRewardRow(pool, 'mafia_rewards', todayStr, userId)
      if (!reward.participation_rewarded) {
        await pool.query(
          'UPDATE mafia_rewards SET participation_rewarded = true, xp_awarded = $2, coins_awarded = $3 WHERE id = $1',
          [reward.id, (reward.xp_awarded || 0) + BASE_XP, (reward.coins_awarded || 0) + BASE_COINS]
        )
        await addOrdinaryXp(pool, userId, BASE_XP, 'mafia_play', 'mafia', todayStr)
        await addCoins(pool, userId, BASE_COINS, 'mafia_play', 'mafia', todayStr)
      }

      // Record completion + check bonus
      await recordCompletion(pool, userId, 'mafia', todayStr)
      await checkAndGrantAllGamesBonus(pool, userId, todayStr)

      const profile = await getOrCreateProfile(pool, userId)
      return res.json({
        success: true,
        isMafia: false,
        attemptNumber: 2,
        gameEnded: true,
        mafiaIndex: daily.mafia_index,
        profile: buildProfileResponse(profile),
      })
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #8: YES/NO
  // ═════════════════════════════════════════════════════════════════════════

  async function handleYesNoGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 1) return res.status(400).json({ error: 'Недостаточно игроков' })

    const questions = QUESTIONS.yes_no

    let { rows: dailyRows } = await pool.query(
      'SELECT * FROM yes_no_daily WHERE game_day = $1',
      [todayStr]
    )
    let daily = dailyRows[0]

    if (!daily) {
      const qIdx = pickIndex(`${todayStr}:yn:q`, questions.length)
      const pIdx = pickIndex(`${todayStr}:yn:player`, workers.length)
      try {
        await pool.query(
          `INSERT INTO yes_no_daily (game_day, question_index, player_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (game_day) DO NOTHING`,
          [todayStr, qIdx, workers[pIdx]]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM yes_no_daily WHERE game_day = $1',
        [todayStr]
      )
      daily = retry[0]
    }

    const { rows: voteRows } = await pool.query(
      'SELECT vote FROM yes_no_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    // Yesterday's results
    let yesterdayData = null
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM yes_no_daily WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yDailyRows.length > 0) {
      const yDaily = yDailyRows[0]
      const { rows: yVotes } = await pool.query(
        'SELECT vote FROM yes_no_votes WHERE game_day = $1',
        [yesterdayStr]
      )

      const yesVotes = yVotes.filter((v) => v.vote === 'yes').length
      const noVotes = yVotes.filter((v) => v.vote === 'no').length

      const { rows: yUserVoteRows } = await pool.query(
        'SELECT vote FROM yes_no_votes WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      const { rows: yRewardRows } = await pool.query(
        'SELECT participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded FROM yes_no_rewards WHERE game_day = $1 AND user_id = $2',
        [yesterdayStr, userId]
      )

      let winner = null
      if (yesVotes > noVotes) winner = 'yes'
      else if (noVotes > yesVotes) winner = 'no'

      yesterdayData = {
        question: questions[yDaily.question_index] || questions[0],
        player_name: yDaily.player_name,
        yesVotes,
        noVotes,
        winner,
        userVote: yUserVoteRows[0]?.vote || null,
        reward: yRewardRows[0] || null,
      }
    }

    res.json({
      today: {
        question: questions[daily.question_index] || questions[0],
        player_name: daily.player_name,
        userVote: voteRows[0]?.vote || null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleYesNoVote(pool, res, userId, todayStr, params) {
    const { vote } = params
    if (vote !== 'yes' && vote !== 'no') return res.status(400).json({ error: "vote must be 'yes' or 'no'" })

    const { rows: existing } = await pool.query(
      'SELECT id FROM yes_no_votes WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже ответили' })

    try {
      await pool.query(
        'INSERT INTO yes_no_votes (game_day, user_id, vote) VALUES ($1, $2, $3)',
        [todayStr, userId, vote]
      )
    } catch (voteErr) {
      if (voteErr.code === '23505') return res.status(409).json({ error: 'Вы уже ответили' })
      throw voteErr
    }

    const result = await grantBaseReward(pool, userId, 'yes_no', 8, todayStr, 'yes_no_rewards')

    res.json({
      success: true,
      message: 'Ответ учтён! Результаты будут доступны завтра в 08:00',
      profile: buildProfileResponse(result.profile),
    })
  }

  async function handleYesNoClaim(pool, res, userId, yesterdayStr) {
    const { rows: yDailyRows } = await pool.query(
      'SELECT * FROM yes_no_daily WHERE game_day = $1',
      [yesterdayStr]
    )
    if (yDailyRows.length === 0) return res.status(400).json({ error: 'Вчерашняя игра не найдена' })
    const yDaily = yDailyRows[0]

    const { rows: yUserVoteRows } = await pool.query(
      'SELECT vote FROM yes_no_votes WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yUserVoteRows.length === 0) {
      return res.json({ success: true, message: 'Вы не участвовали вчера', totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yRewardRows } = await pool.query(
      'SELECT id, result_rewarded FROM yes_no_rewards WHERE game_day = $1 AND user_id = $2',
      [yesterdayStr, userId]
    )
    if (yRewardRows.length > 0 && yRewardRows[0].result_rewarded) {
      return res.json({ success: true, message: 'Награда уже получена', alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const { rows: yVotes } = await pool.query(
      'SELECT vote FROM yes_no_votes WHERE game_day = $1',
      [yesterdayStr]
    )

    const yesVotes = yVotes.filter((v) => v.vote === 'yes').length
    const noVotes = yVotes.filter((v) => v.vote === 'no').length

    let winner = null
    if (yesVotes > noVotes) winner = 'yes'
    else if (noVotes > yesVotes) winner = 'no'

    if (!winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE yes_no_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO yes_no_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ничья — награда не выдаётся', totalTitleXp: 0, totalCoins: 0, winner: null })
    }

    if (yUserVoteRows[0].vote !== winner) {
      if (yRewardRows.length > 0) {
        await pool.query('UPDATE yes_no_rewards SET result_rewarded = true WHERE id = $1', [yRewardRows[0].id])
      } else {
        await pool.query(
          `INSERT INTO yes_no_rewards (game_day, user_id, participation_rewarded, result_rewarded) VALUES ($1, $2, true, true) ON CONFLICT (game_day, user_id) DO NOTHING`,
          [yesterdayStr, userId]
        )
      }
      return res.json({ success: true, message: 'Ваш выбор не победил', totalTitleXp: 0, totalCoins: 0, winner })
    }

    // User won — silver reward
    const claimResult = await grantResultReward(pool, userId, 'yes_no', yesterdayStr, 'yes_no_rewards', 'silver')
    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      message: 'Ваш выбор победил!',
      totalTitleXp: claimResult.titleXp,
      totalCoins: claimResult.coins,
      winner,
      profile: buildProfileResponse(profile),
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #9: SECRET LOVE
  // ═════════════════════════════════════════════════════════════════════════

  async function handleSecretLoveGet(pool, res, userId, todayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 3) return res.status(400).json({ error: 'Недостаточно игроков (нужно минимум 3)' })

    // Get or create per-user daily entry
    let { rows: userDailyRows } = await pool.query(
      'SELECT * FROM secret_love_user_daily WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    let userDaily = userDailyRows[0]

    if (!userDaily) {
      const players = pickNPlayers(`${todayStr}:sl:${userId}:players`, workers, 3)
      const correctIdx = pickIndex(`${todayStr}:sl:${userId}:correct`, 3)
      try {
        await pool.query(
          `INSERT INTO secret_love_user_daily (game_day, user_id, player_1, player_2, player_3, correct_index)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (game_day, user_id) DO NOTHING`,
          [todayStr, userId, players[0], players[1], players[2], correctIdx]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM secret_love_user_daily WHERE game_day = $1 AND user_id = $2',
        [todayStr, userId]
      )
      userDaily = retry[0]
    }

    const { rows: userStateRows } = await pool.query(
      'SELECT selected_index, is_correct FROM secret_love_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    const players = [userDaily.player_1, userDaily.player_2, userDaily.player_3]

    res.json({
      today: {
        question: 'Кто из них тайно в тебя влюблён?',
        players,
        userVote: userStateRows[0] ? { selected_index: userStateRows[0].selected_index, is_correct: userStateRows[0].is_correct } : null,
        correctIndex: userStateRows.length > 0 ? userDaily.correct_index : null,
      },
      yesterday: null,
    })
  }

  async function handleSecretLoveVote(pool, res, userId, todayStr, params) {
    const { selectedIndex } = params
    if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex > 2) {
      return res.status(400).json({ error: 'selectedIndex must be 0, 1, or 2' })
    }

    // Check if already answered
    const { rows: existing } = await pool.query(
      'SELECT id FROM secret_love_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (existing.length > 0) return res.status(409).json({ error: 'Вы уже ответили' })

    // Get user daily entry
    const { rows: userDailyRows } = await pool.query(
      'SELECT correct_index FROM secret_love_user_daily WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (userDailyRows.length === 0) return res.status(400).json({ error: 'Игра не найдена' })

    const isCorrect = selectedIndex === userDailyRows[0].correct_index

    try {
      await pool.query(
        'INSERT INTO secret_love_user_state (game_day, user_id, selected_index, is_correct) VALUES ($1, $2, $3, $4)',
        [todayStr, userId, selectedIndex, isCorrect]
      )
    } catch (stateErr) {
      if (stateErr.code === '23505') return res.status(409).json({ error: 'Вы уже ответили' })
      throw stateErr
    }

    // Base reward
    const result = await grantBaseReward(pool, userId, 'secret_love', 9, todayStr, 'secret_love_rewards')

    // If correct — silver reward
    let silverResult = null
    if (isCorrect) {
      silverResult = await grantResultReward(pool, userId, 'secret_love', todayStr, 'secret_love_rewards', 'silver')
    }

    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      isCorrect,
      correctIndex: userDailyRows[0].correct_index,
      message: isCorrect ? 'Правильно!' : 'Неправильно',
      profile: buildProfileResponse(profile),
      silverReward: silverResult ? { titleXp: silverResult.titleXp, coins: silverResult.coins } : null,
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GAME #10: ROULETTE
  // ═════════════════════════════════════════════════════════════════════════

  async function handleRouletteGet(pool, res, userId, todayStr, yesterdayStr) {
    const workers = await getWorkers(pool)
    if (workers.length < 2) return res.status(400).json({ error: 'Недостаточно игроков' })

    // Filter out the user themselves
    const opponents = workers.filter((w) => w !== userId)
    if (opponents.length < 1) return res.status(400).json({ error: 'Недостаточно противников' })

    // Get or create per-user daily entry
    let { rows: userDailyRows } = await pool.query(
      'SELECT * FROM roulette_user_daily WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    let userDaily = userDailyRows[0]

    if (!userDaily) {
      const oIdx = pickIndex(`${todayStr}:rl:${userId}:opponent`, opponents.length)
      try {
        await pool.query(
          `INSERT INTO roulette_user_daily (game_day, user_id, opponent_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (game_day, user_id) DO NOTHING`,
          [todayStr, userId, opponents[oIdx]]
        )
      } catch (e) { /* race condition */ }
      const { rows: retry } = await pool.query(
        'SELECT * FROM roulette_user_daily WHERE game_day = $1 AND user_id = $2',
        [todayStr, userId]
      )
      userDaily = retry[0]
    }

    // Check if already played
    const { rows: userStateRows } = await pool.query(
      'SELECT result FROM roulette_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    // Yesterday's stats
    let yesterdayData = null
    const { rows: yStates } = await pool.query(
      'SELECT result FROM roulette_user_state WHERE game_day = $1',
      [yesterdayStr]
    )

    if (yStates.length > 0) {
      const wins = yStates.filter((s) => s.result === 'win').length
      const losses = yStates.filter((s) => s.result === 'lose').length
      yesterdayData = {
        wins,
        losses,
        total: yStates.length,
      }
    }

    res.json({
      today: {
        opponent_name: userDaily.opponent_name,
        result: userStateRows[0]?.result || null,
      },
      yesterday: yesterdayData,
    })
  }

  async function handleRouletteVote(pool, res, userId, todayStr, _params) {
    // Check if already played
    const { rows: existing } = await pool.query(
      'SELECT id, result FROM roulette_user_state WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Вы уже сыграли сегодня', result: existing[0].result })
    }

    // Get opponent
    const { rows: userDailyRows } = await pool.query(
      'SELECT opponent_name FROM roulette_user_daily WHERE game_day = $1 AND user_id = $2',
      [todayStr, userId]
    )
    if (userDailyRows.length === 0) return res.status(400).json({ error: 'Игра не найдена' })

    // Backend determines result: 50/50
    const randomVal = Math.random()
    const result = randomVal < 0.5 ? 'win' : 'lose'

    // Record result
    try {
      await pool.query(
        'INSERT INTO roulette_user_state (game_day, user_id, result) VALUES ($1, $2, $3)',
        [todayStr, userId, result]
      )
    } catch (stateErr) {
      if (stateErr.code === '23505') return res.status(409).json({ error: 'Вы уже сыграли сегодня', result: 'win' })
      throw stateErr
    }

    // Base reward (always)
    const baseResult = await grantBaseReward(pool, userId, 'roulette', 10, todayStr, 'roulette_rewards')

    // If win — gold reward
    let goldResult = null
    if (result === 'win') {
      goldResult = await grantResultReward(pool, userId, 'roulette', todayStr, 'roulette_rewards', 'gold')
    }

    const profile = await getOrCreateProfile(pool, userId)

    res.json({
      success: true,
      result,
      opponent_name: userDailyRows[0].opponent_name,
      profile: buildProfileResponse(profile),
      goldReward: goldResult ? { titleXp: goldResult.titleXp, coins: goldResult.coins } : null,
    })
  }

}

module.exports = { setupGameRoutes }
