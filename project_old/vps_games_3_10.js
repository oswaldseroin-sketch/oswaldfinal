// ============================================================================
// AMALGAMA — Mini-games #3-10 routes for VPS (api.serointeam.ru)
// ----------------------------------------------------------------------------
// This file is APPENDED to the existing /var/www/seroin-app/index.js.
// It adds routes for games #3-10 that the existing backend doesn't have.
// All routes use the same pattern as the existing who-of-them routes.
// ============================================================================

const QUESTIONS = {
  would_he_do_it: [
    'Сделал бы это за 100 000 рублей?',
    'Сделал бы бэкфлип на корпоративе за 50 000?',
    'Съел бы сырую картошку за 10 000?',
    'Прыгнул бы с парашютом за 200 000?',
    'Прожил бы неделю без телефона за 500 000?',
    'Сыграл бы в русскую рулетку за 1 000 000?',
    'Съел бы жука за 5 000?',
    'Поработал бы в выходной за тройную ставку?',
    'Прыгнул бы в ледяную воду за 25 000?',
    'Спел бы караоке на улице за 15 000?',
  ],
  past_life: [
    'Кто в прошлой жизни был рваным сапогом?',
    'Кто в прошлой жизни был котом во дворе?',
    'Кто в прошлой жизни был пиратским попугаем?',
    'Кто в прошлой жизни был забытым бутербродом?',
    'Кто в прошлой жизни был деревенским колодцем?',
    'Кто в прошлой жизни был тёмным лордом?',
    'Кто в прошлой жизни был уличным фонарём?',
    'Кто в прошлой жизни был бродячим псом?',
    'Кто в прошлой жизни был старым самоваром?',
    'Кто в прошлой жизни был дворцовым шутом?',
  ],
  best_duo: [
    'Кто из них лучше отработает смену вместе?',
    'Кто составит лучший дуэт на корпоративе?',
    'Кто лучше всех справится с авралом вдвоём?',
    'Кто составит лучшую команду для квеста?',
    'Кто лучше всех проведёт выходные вместе?',
    'Кто составит лучшую пару для дебатов?',
    'Кто лучше всех организует праздник вдвоём?',
    'Кто составит лучший дуэт для ограбления банка?',
    'Кто лучше всех выживет в лесу вдвоём?',
    'Кто составит лучшую команду для зомби-апокалипсиса?',
  ],
  rate_player: [
    'Оцени дружелюбие этого человека',
    'Оцени чувство юмора этого человека',
    'Оцени надёжность этого человека',
    'Оцени креативность этого человека',
    'Оцени работоспособность этого человека',
    'Оцени харизму этого человека',
    'Оцени ответственность этого человека',
    'Оцени стиль этого человека',
    'Оцени умение работать в команде',
    'Оцени стрессоустойчивость этого человека',
  ],
  mafia: [
    'Кто из них мафия?',
    'Кто из них прячет тёмную тайну?',
    'Кто из них шпион?',
    'Кто из них тайный злодей?',
    'Кто из них двойной агент?',
    'Кто из них крадёт чужие тормозки?',
    'Кто из них подделывает отчёты?',
    'Кто из них тайно работает на конкурентов?',
    'Кто из них прячёт дома Семяшкина?',
    'Кто из них настоящий оборотень?',
  ],
  yes_no: [
    'Смог бы этот человек выгулять собаку?',
    'Смог бы этот человек выиграть в лотерею?',
    'Смог бы этот человек выжить неделю без интернета?',
    'Смог бы этот человек приготовить ужин из 3 ингредиентов?',
    'Смог бы этот человек проспать 12 часов подряд?',
    'Смог бы этот человек пройти мимо кота и не погладить?',
    'Смог бы этот человек не опоздать ни разу за месяц?',
    'Смог бы этот человек угнать трактор?',
    'Смог бы этот человек переплыть реку?',
    'Смог бы этот человек выспаться за 4 часа?',
  ],
  secret_love: [
    'Кто из них тайно в тебя влюблён?',
    'Кто из них пишет тебе стихи ночью?',
    'Кто из них сохранил твоё фото в секретную папку?',
    'Кто из них мечтает позвать тебя на свидание?',
    'Кто из них рисует сердечки на твоём тормозке?',
    'Кто из них тайно дарит тебе подарки?',
    'Кто из них поставил твой голос на будильник?',
    'Кто из них написал о тебе в дневник?',
    'Кто из них ищет повод поговорить с тобой?',
    'Кто из них краснеет, когда ты рядом?',
  ],
}

// ─── Helper: get game day (Moscow time - 8 hours) ───
async function getGameDay(client) {
  const result = await client.query(`
    SELECT (
      (NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours'
    )::date AS game_day
  `)
  return result.rows[0].game_day
}

// ─── Helper: get N random players ───
async function getRandomPlayers(client, count) {
  const result = await client.query(`
    SELECT id, full_name FROM players ORDER BY RANDOM() LIMIT $1
  `, [count])
  return result.rows
}

// ─── Helper: get player by id ───
async function getPlayerById(client, id) {
  const result = await client.query('SELECT id, full_name FROM players WHERE id = $1', [id])
  return result.rows[0] || null
}

// ─── Helper: reward player (xp + coins) ───
async function rewardPlayer(client, playerId, xpGain, coinGain) {
  const playerResult = await client.query(`
    SELECT id, full_name, gender, coins, xp, level, title_level, title_xp
    FROM players WHERE id = $1 FOR UPDATE
  `, [playerId])

  if (playerResult.rowCount === 0) throw new Error('PLAYER_NOT_FOUND')

  const player = playerResult.rows[0]
  const previousLevel = Number(player.level)
  let newXp = Number(player.xp) + xpGain
  let newLevel = previousLevel

  while (newXp >= 20) {
    newXp -= 20
    newLevel += 1
  }

  const updateResult = await client.query(`
    UPDATE players SET xp = $1, level = $2, coins = coins + $3
    WHERE id = $4 RETURNING id, full_name, gender, coins, xp, level, title_level, title_xp
  `, [newXp, newLevel, coinGain, playerId])

  return { player: updateResult.rows[0], previousLevel, newLevel, leveledUp: newLevel > previousLevel }
}

// ─── Helper: reward title XP ───
async function rewardTitleXp(client, playerId, titleXpGain) {
  const playerResult = await client.query(`
    SELECT title_level, title_xp FROM players WHERE id = $1 FOR UPDATE
  `, [playerId])
  if (playerResult.rowCount === 0) return

  let newTitleLevel = Number(playerResult.rows[0].title_level)
  let newTitleXp = Number(playerResult.rows[0].title_xp) + titleXpGain

  while (newTitleLevel < 50) {
    const required = getTitleXpRequiredGlobal(newTitleLevel)
    if (newTitleXp < required) break
    newTitleXp -= required
    newTitleLevel += 1
  }

  await client.query('UPDATE players SET title_level = $1, title_xp = $2 WHERE id = $3',
    [newTitleLevel, newTitleXp, playerId])
}

// ─── Helper: get profile for frontend ───
async function getProfileForFrontend(client, playerId) {
  const result = await client.query(`
    SELECT id, full_name, gender, coins, xp, level, title_level, title_xp
    FROM players WHERE id = $1
  `, [playerId])
  if (result.rowCount === 0) return null
  const p = result.rows[0]
  return {
    user_id: String(p.id),
    level: Number(p.level),
    xp: Number(p.xp),
    currentXp: Number(p.xp),
    neededXp: 20,
    coins: Number(p.coins),
    title: getTitleForLevel(Number(p.title_level)),
    titleLevel: Number(p.title_level),
    titleXp: Number(p.title_xp),
    titleCurrentXp: Number(p.title_xp),
    titleNeededXp: getTitleXpRequiredGlobal(Number(p.title_level)),
  }
}

function getTitleForLevel(level) {
  const titles = {
    1: 'Новичок', 2: 'Любитель', 3: 'Знаток', 4: 'Профи', 5: 'Эксперт',
    6: 'Мастер', 7: 'Виртуоз', 8: 'Гений', 9: 'Легенда', 10: 'Миф',
  }
  return titles[level] || titles[1]
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME #3: WOULD HE DO IT (Сделал бы?)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/would-he-do-it/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query(
      'SELECT * FROM would_he_do_it_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 1)
      if (players.length < 1) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.would_he_do_it.length)
      await client.query(
        'INSERT INTO would_he_do_it_daily (game_day, question_index, player_id) VALUES ($1, $2, $3) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id])
      dailyResult = await client.query('SELECT * FROM would_he_do_it_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const player = await getPlayerById(client, daily.player_id)
    const question = QUESTIONS.would_he_do_it[daily.question_index] || QUESTIONS.would_he_do_it[0]

    // Check yesterday's results
    const yesterday = await client.query(`
      SELECT (
        (NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours'
      )::date - 1 AS game_day
    `)
    const yesterdayDay = yesterday.rows[0].game_day

    const yesterdayDaily = await client.query('SELECT * FROM would_he_do_it_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const ydPlayer = await getPlayerById(client, yd.player_id)
      const ydQuestion = QUESTIONS.would_he_do_it[yd.question_index] || QUESTIONS.would_he_do_it[0]
      const votesResult = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE vote = 'yes')::int AS yes_votes,
          COUNT(*) FILTER (WHERE vote = 'no')::int AS no_votes
        FROM would_he_do_it_votes WHERE game_day = $1
      `, [yesterdayDay])
      const yesVotes = Number(votesResult.rows[0].yes_votes)
      const noVotes = Number(votesResult.rows[0].no_votes)
      let winner = null
      if (yesVotes > noVotes) winner = 'yes'
      else if (noVotes > yesVotes) winner = 'no'

      const playerId = Number(req.query.playerId || 0)
      let userVote = null
      let reward = null
      if (playerId) {
        const userVoteResult = await client.query('SELECT vote FROM would_he_do_it_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, playerId])
        if (userVoteResult.rowCount > 0) userVote = userVoteResult.rows[0].vote
        const rewardResult = await client.query('SELECT * FROM would_he_do_it_rewards WHERE voter_id = $1 AND game_day = $2', [playerId, yesterdayDay])
        if (rewardResult.rowCount > 0) reward = rewardResult.rows[0]
      }

      yesterdayData = {
        question: ydQuestion,
        player_name: ydPlayer?.full_name || '',
        yesVotes,
        noVotes,
        winner,
        userVote,
        reward: reward ? {
          participation_rewarded: reward.participation_rewarded,
          result_rewarded: reward.result_rewarded,
          xp_awarded: reward.xp_awarded,
          title_xp_awarded: reward.title_xp_awarded,
          coins_awarded: reward.coins_awarded,
        } : null,
      }
    }

    // Check today's vote
    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT vote FROM would_he_do_it_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = voteResult.rows[0].vote
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        player_name: player?.full_name || '',
        userVote,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Would he do it today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/would-he-do-it/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const vote = req.body.vote
    if (!Number.isInteger(voterId) || (vote !== 'yes' && vote !== 'no')) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    const existing = await client.query('SELECT id FROM would_he_do_it_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    await client.query('INSERT INTO would_he_do_it_votes (game_day, voter_id, vote) VALUES ($1, $2, $3)', [gameDay, voterId, vote])
    await completeDailyGame(client, voterId, gameDay, 'would-he-do-it')
    const reward = await rewardPlayer(client, voterId, 2, 1)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, 2, $2)', [voterId, 'would_he_do_it_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, 1, $2)', [voterId, 'would_he_do_it_vote'])
    await client.query('COMMIT')

    res.json({
      ok: true,
      success: true,
      message: 'Голос учтён',
      profile: await getProfileForFrontend(client, voterId),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Would he do it vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/would-he-do-it/claim-results', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    if (!Number.isInteger(voterId)) return res.status(400).json({ ok: false, error: 'INVALID_DATA' })

    await client.query('BEGIN')
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day

    const existing = await client.query('SELECT * FROM would_he_do_it_rewards WHERE voter_id = $1 AND game_day = $2', [voterId, yesterdayDay])
    if (existing.rowCount > 0 && existing.rows[0].result_rewarded) {
      await client.query('ROLLBACK')
      return res.json({ ok: true, success: true, alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const voteResult = await client.query('SELECT vote FROM would_he_do_it_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, voterId])
    if (voteResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_VOTED' }) }

    const votesResult = await client.query(`
      SELECT COUNT(*) FILTER (WHERE vote = 'yes')::int AS yes_votes,
             COUNT(*) FILTER (WHERE vote = 'no')::int AS no_votes
      FROM would_he_do_it_votes WHERE game_day = $1
    `, [yesterdayDay])
    const yesVotes = Number(votesResult.rows[0].yes_votes)
    const noVotes = Number(votesResult.rows[0].no_votes)
    let winner = null
    if (yesVotes > noVotes) winner = 'yes'
    else if (noVotes > yesVotes) winner = 'no'

    const userVote = voteResult.rows[0].vote
    let titleXpAwarded = 0
    let coinsAwarded = 0
    if (winner && userVote === winner) {
      titleXpAwarded = 3
      coinsAwarded = 3
      await rewardTitleXp(client, voterId, titleXpAwarded)
      const reward = await rewardPlayer(client, voterId, 0, coinsAwarded)
    }

    await client.query(`
      INSERT INTO would_he_do_it_rewards (voter_id, game_day, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded)
      VALUES ($1, $2, true, $3, 2, $4, $5)
      ON CONFLICT (voter_id, game_day) DO UPDATE SET result_rewarded = true, title_xp_awarded = $4, coins_awarded = $5
    `, [voterId, yesterdayDay, !!winner, titleXpAwarded, coinsAwarded])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, totalTitleXp: titleXpAwarded, totalCoins: coinsAwarded, winner })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Would he do it claim error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #4: PAST LIFE (Прошлая жизнь)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/past-life/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM past_life_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 3)
      if (players.length < 3) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.past_life.length)
      const correctIndex = Math.floor(Math.random() * 3)
      await client.query(
        'INSERT INTO past_life_daily (game_day, question_index, player1_id, player2_id, player3_id, correct_index) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id, players[1].id, players[2].id, correctIndex])
      dailyResult = await client.query('SELECT * FROM past_life_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const question = QUESTIONS.past_life[daily.question_index] || QUESTIONS.past_life[0]
    const p1 = await getPlayerById(client, daily.player1_id)
    const p2 = await getPlayerById(client, daily.player2_id)
    const p3 = await getPlayerById(client, daily.player3_id)

    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT selected_index, is_correct FROM past_life_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = voteResult.rows[0]
    }

    // Yesterday results
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayDaily = await client.query('SELECT * FROM past_life_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const ydQuestion = QUESTIONS.past_life[yd.question_index] || QUESTIONS.past_life[0]
      const yp1 = await getPlayerById(client, yd.player1_id)
      const yp2 = await getPlayerById(client, yd.player2_id)
      const yp3 = await getPlayerById(client, yd.player3_id)
      const correctCountResult = await client.query('SELECT COUNT(*)::int AS c FROM past_life_votes WHERE game_day = $1 AND is_correct = true', [yesterdayDay])
      const totalCountResult = await client.query('SELECT COUNT(*)::int AS c FROM past_life_votes WHERE game_day = $1', [yesterdayDay])
      let ydUserVote = null
      if (playerId) {
        const yuv = await client.query('SELECT selected_index, is_correct FROM past_life_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, playerId])
        if (yuv.rowCount > 0) ydUserVote = yuv.rows[0]
      }
      yesterdayData = {
        question: ydQuestion,
        player_1: yp1?.full_name || '',
        player_2: yp2?.full_name || '',
        player_3: yp3?.full_name || '',
        correct_index: yd.correct_index,
        correctCount: Number(correctCountResult.rows[0].c),
        totalCount: Number(totalCountResult.rows[0].c),
        userVote: ydUserVote,
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        players: [p1?.full_name || '', p2?.full_name || '', p3?.full_name || ''],
        userVote: userVote ? { selected_index: userVote.selected_index, is_correct: userVote.is_correct } : null,
        correctIndex: userVote ? daily.correct_index : null,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Past life today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/past-life/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const selectedIndex = Number(req.body.selectedIndex)
    if (!Number.isInteger(voterId) || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 2) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const daily = await client.query('SELECT correct_index FROM past_life_daily WHERE game_day = $1', [gameDay])
    if (daily.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'DAILY_NOT_FOUND' }) }

    const existing = await client.query('SELECT id FROM past_life_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    const isCorrect = Number(daily.rows[0].correct_index) === selectedIndex
    await client.query('INSERT INTO past_life_votes (game_day, voter_id, selected_index, is_correct) VALUES ($1, $2, $3, $4)', [gameDay, voterId, selectedIndex, isCorrect])
    await completeDailyGame(client, voterId, gameDay, 'past-life')

    const xpGain = isCorrect ? 3 : 2
    const coinGain = isCorrect ? 3 : 1
    await rewardPlayer(client, voterId, xpGain, coinGain)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, xpGain, 'past_life_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, coinGain, 'past_life_vote'])

    if (isCorrect) await rewardTitleXp(client, voterId, 3)

    await client.query('COMMIT')
    res.json({
      ok: true,
      success: true,
      message: isCorrect ? 'Правильно!' : 'Неправильно',
      isCorrect,
      correctIndex: Number(daily.rows[0].correct_index),
      profile: await getProfileForFrontend(client, voterId),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Past life vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #5: BEST DUO (Лучший дуэт)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/best-duo/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM best_duo_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 4)
      if (players.length < 4) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.best_duo.length)
      await client.query(
        'INSERT INTO best_duo_daily (game_day, question_index, team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id, players[1].id, players[2].id, players[3].id])
      dailyResult = await client.query('SELECT * FROM best_duo_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const question = QUESTIONS.best_duo[daily.question_index] || QUESTIONS.best_duo[0]
    const t1p1 = await getPlayerById(client, daily.team1_p1_id)
    const t1p2 = await getPlayerById(client, daily.team1_p2_id)
    const t2p1 = await getPlayerById(client, daily.team2_p1_id)
    const t2p2 = await getPlayerById(client, daily.team2_p2_id)

    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT selected_team FROM best_duo_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = Number(voteResult.rows[0].selected_team)
    }

    // Yesterday results
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayDaily = await client.query('SELECT * FROM best_duo_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const ydQuestion = QUESTIONS.best_duo[yd.question_index] || QUESTIONS.best_duo[0]
      const yt1p1 = await getPlayerById(client, yd.team1_p1_id)
      const yt1p2 = await getPlayerById(client, yd.team1_p2_id)
      const yt2p1 = await getPlayerById(client, yd.team2_p1_id)
      const yt2p2 = await getPlayerById(client, yd.team2_p2_id)
      const votesResult = await client.query(`
        SELECT COUNT(*) FILTER (WHERE selected_team = 1)::int AS team1_votes,
               COUNT(*) FILTER (WHERE selected_team = 2)::int AS team2_votes
        FROM best_duo_votes WHERE game_day = $1
      `, [yesterdayDay])
      const team1Votes = Number(votesResult.rows[0].team1_votes)
      const team2Votes = Number(votesResult.rows[0].team2_votes)
      let winner = null
      if (team1Votes > team2Votes) winner = 1
      else if (team2Votes > team1Votes) winner = 2
      let ydUserVote = null
      let reward = null
      if (playerId) {
        const yuv = await client.query('SELECT selected_team FROM best_duo_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, playerId])
        if (yuv.rowCount > 0) ydUserVote = Number(yuv.rows[0].selected_team)
        const r = await client.query('SELECT * FROM best_duo_rewards WHERE voter_id = $1 AND game_day = $2', [playerId, yesterdayDay])
        if (r.rowCount > 0) reward = r.rows[0]
      }
      yesterdayData = {
        question: ydQuestion,
        team1: [yt1p1?.full_name || '', yt1p2?.full_name || ''],
        team2: [yt2p1?.full_name || '', yt2p2?.full_name || ''],
        team1Votes,
        team2Votes,
        winner,
        userVote: ydUserVote,
        reward: reward ? {
          participation_rewarded: reward.participation_rewarded,
          result_rewarded: reward.result_rewarded,
          xp_awarded: reward.xp_awarded,
          title_xp_awarded: reward.title_xp_awarded,
          coins_awarded: reward.coins_awarded,
        } : null,
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        team1: [t1p1?.full_name || '', t1p2?.full_name || ''],
        team2: [t2p1?.full_name || '', t2p2?.full_name || ''],
        userVote,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Best duo today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/best-duo/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const selectedTeam = Number(req.body.selectedTeam)
    if (!Number.isInteger(voterId) || (selectedTeam !== 1 && selectedTeam !== 2)) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const existing = await client.query('SELECT id FROM best_duo_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    await client.query('INSERT INTO best_duo_votes (game_day, voter_id, selected_team) VALUES ($1, $2, $3)', [gameDay, voterId, selectedTeam])
    await completeDailyGame(client, voterId, gameDay, 'best-duo')
    await rewardPlayer(client, voterId, 2, 1)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, 2, $2)', [voterId, 'best_duo_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, 1, $2)', [voterId, 'best_duo_vote'])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, message: 'Голос учтён', profile: await getProfileForFrontend(client, voterId) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Best duo vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/best-duo/claim-results', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    if (!Number.isInteger(voterId)) return res.status(400).json({ ok: false, error: 'INVALID_DATA' })

    await client.query('BEGIN')
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day

    const existing = await client.query('SELECT * FROM best_duo_rewards WHERE voter_id = $1 AND game_day = $2', [voterId, yesterdayDay])
    if (existing.rowCount > 0 && existing.rows[0].result_rewarded) {
      await client.query('ROLLBACK')
      return res.json({ ok: true, success: true, alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const voteResult = await client.query('SELECT selected_team FROM best_duo_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, voterId])
    if (voteResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_VOTED' }) }

    const votesResult = await client.query(`
      SELECT COUNT(*) FILTER (WHERE selected_team = 1)::int AS team1_votes,
             COUNT(*) FILTER (WHERE selected_team = 2)::int AS team2_votes
      FROM best_duo_votes WHERE game_day = $1
    `, [yesterdayDay])
    const team1Votes = Number(votesResult.rows[0].team1_votes)
    const team2Votes = Number(votesResult.rows[0].team2_votes)
    let winner = null
    if (team1Votes > team2Votes) winner = 1
    else if (team2Votes > team1Votes) winner = 2

    const userVote = Number(voteResult.rows[0].selected_team)
    let titleXpAwarded = 0
    let coinsAwarded = 0
    if (winner && userVote === winner) {
      titleXpAwarded = 3
      coinsAwarded = 3
      await rewardTitleXp(client, voterId, titleXpAwarded)
      await rewardPlayer(client, voterId, 0, coinsAwarded)
    }

    await client.query(`
      INSERT INTO best_duo_rewards (voter_id, game_day, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded)
      VALUES ($1, $2, true, $3, 2, $4, $5)
      ON CONFLICT (voter_id, game_day) DO UPDATE SET result_rewarded = true, title_xp_awarded = $4, coins_awarded = $5
    `, [voterId, yesterdayDay, !!winner, titleXpAwarded, coinsAwarded])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, totalTitleXp: titleXpAwarded, totalCoins: coinsAwarded, winner })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Best duo claim error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #6: RATE PLAYER (Оцени)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/rate-player/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM rate_player_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 1)
      if (players.length < 1) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.rate_player.length)
      await client.query(
        'INSERT INTO rate_player_daily (game_day, question_index, player_id) VALUES ($1, $2, $3) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id])
      dailyResult = await client.query('SELECT * FROM rate_player_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const player = await getPlayerById(client, daily.player_id)
    const question = QUESTIONS.rate_player[daily.question_index] || QUESTIONS.rate_player[0]

    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT rating FROM rate_player_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = Number(voteResult.rows[0].rating)
    }

    // Yesterday results
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayDaily = await client.query('SELECT * FROM rate_player_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const ydPlayer = await getPlayerById(client, yd.player_id)
      const ydQuestion = QUESTIONS.rate_player[yd.question_index] || QUESTIONS.rate_player[0]
      const statsResult = await client.query(`
        SELECT AVG(rating)::float AS avg_rating, COUNT(*)::int AS total_votes
        FROM rate_player_votes WHERE game_day = $1
      `, [yesterdayDay])
      let ydUserVote = null
      if (playerId) {
        const yuv = await client.query('SELECT rating FROM rate_player_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, playerId])
        if (yuv.rowCount > 0) ydUserVote = Number(yuv.rows[0].rating)
      }
      yesterdayData = {
        question: ydQuestion,
        player_name: ydPlayer?.full_name || '',
        avgRating: Number(statsResult.rows[0].avg_rating || 0),
        totalVotes: Number(statsResult.rows[0].total_votes),
        userVote: ydUserVote,
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        player_name: player?.full_name || '',
        userVote,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Rate player today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/rate-player/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const rating = Number(req.body.rating)
    if (!Number.isInteger(voterId) || !Number.isInteger(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const existing = await client.query('SELECT id FROM rate_player_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    await client.query('INSERT INTO rate_player_votes (game_day, voter_id, rating) VALUES ($1, $2, $3)', [gameDay, voterId, rating])
    await completeDailyGame(client, voterId, gameDay, 'rate-player')
    await rewardPlayer(client, voterId, 2, 3)
    await rewardTitleXp(client, voterId, 2)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, 2, $2)', [voterId, 'rate_player_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, 3, $2)', [voterId, 'rate_player_vote'])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, message: 'Оценка принята', profile: await getProfileForFrontend(client, voterId) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Rate player vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #7: MAFIA (Угадай мафию)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/mafia/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM mafia_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 5)
      if (players.length < 5) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.mafia.length)
      const mafiaIndex = Math.floor(Math.random() * 5)
      await client.query(
        'INSERT INTO mafia_daily (game_day, question_index, player1_id, player2_id, player3_id, player4_id, player5_id, mafia_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id, players[1].id, players[2].id, players[3].id, players[4].id, mafiaIndex])
      dailyResult = await client.query('SELECT * FROM mafia_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const players = []
    for (let i = 1; i <= 5; i++) {
      const p = await getPlayerById(client, daily[`player${i}_id`])
      players.push(p?.full_name || '')
    }

    const playerId = Number(req.query.playerId || 0)
    let userState = null
    if (playerId) {
      const stateResult = await client.query('SELECT * FROM mafia_user_state WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (stateResult.rowCount > 0) {
        const s = stateResult.rows[0]
        userState = {
          attemptCount: Number(s.attempt_count),
          eliminated: s.eliminated || [],
          foundMafia: s.found_mafia,
          gameEnded: s.game_ended,
          mafiaIndex: s.game_ended ? Number(daily.mafia_index) : null,
        }
      }
    }

    // Yesterday stats
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayDaily = await client.query('SELECT * FROM mafia_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const mafiaPlayer = await getPlayerById(client, yd[`player${yd.mafia_index + 1}_id`])
      const guessedResult = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE found_mafia = true AND attempt_count = 1)::int AS first_try,
          COUNT(*) FILTER (WHERE found_mafia = true AND attempt_count = 2)::int AS second_try,
          COUNT(*) FILTER (WHERE found_mafia = false)::int AS not_guessed,
          COUNT(*)::int AS total_played
        FROM mafia_user_state WHERE game_day = $1
      `, [yesterdayDay])
      yesterdayData = {
        mafia: mafiaPlayer?.full_name || '',
        guessed: Number(guessedResult.rows[0].first_try) + Number(guessedResult.rows[0].second_try),
        notGuessed: Number(guessedResult.rows[0].not_guessed),
        firstTry: Number(guessedResult.rows[0].first_try),
        secondTry: Number(guessedResult.rows[0].second_try),
        totalPlayed: Number(guessedResult.rows[0].total_played),
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: userState || {
        players,
        attemptCount: 0,
        eliminated: [],
        foundMafia: false,
        gameEnded: false,
        mafiaIndex: null,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Mafia today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/mafia/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const selectedIndex = Number(req.body.selectedIndex)
    if (!Number.isInteger(voterId) || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 4) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const daily = await client.query('SELECT mafia_index FROM mafia_daily WHERE game_day = $1', [gameDay])
    if (daily.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'DAILY_NOT_FOUND' }) }

    const mafiaIndex = Number(daily.rows[0].mafia_index)
    let stateResult = await client.query('SELECT * FROM mafia_user_state WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])

    if (stateResult.rowCount === 0) {
      await client.query('INSERT INTO mafia_user_state (game_day, voter_id, attempt_count, eliminated, found_mafia, game_ended) VALUES ($1, $2, 0, $3, false, false)', [gameDay, voterId, '{}'])
      stateResult = await client.query('SELECT * FROM mafia_user_state WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    }

    const state = stateResult.rows[0]
    if (state.game_ended) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'GAME_ENDED' }) }

    const eliminated = state.eliminated || []
    if (eliminated.includes(selectedIndex)) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'ALREADY_ELIMINATED' }) }

    const isMafia = selectedIndex === mafiaIndex
    const newAttemptCount = Number(state.attempt_count) + 1
    const newEliminated = [...eliminated, selectedIndex]
    let foundMafia = false
    let gameEnded = false

    if (isMafia) {
      foundMafia = true
      gameEnded = true
    } else if (newAttemptCount >= 2) {
      gameEnded = true
    }

    await client.query('UPDATE mafia_user_state SET attempt_count = $1, eliminated = $2, found_mafia = $3, game_ended = $4 WHERE game_day = $5 AND voter_id = $6',
      [newAttemptCount, newEliminated, foundMafia, gameEnded, gameDay, voterId])

    if (gameEnded) {
      await completeDailyGame(client, voterId, gameDay, 'mafia')
      const xpGain = foundMafia ? (newAttemptCount === 1 ? 9 : 6) : 2
      const coinGain = foundMafia ? (newAttemptCount === 1 ? 9 : 6) : 1
      await rewardPlayer(client, voterId, xpGain, coinGain)
      if (foundMafia) await rewardTitleXp(client, voterId, xpGain)
      await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, xpGain, 'mafia_vote'])
      await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, coinGain, 'mafia_vote'])
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      success: true,
      isMafia,
      attemptNumber: newAttemptCount,
      profile: await getProfileForFrontend(client, voterId),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Mafia vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #8: YES OR NO (Да или Нет)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/yes-no/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM yes_no_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 1)
      if (players.length < 1) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.yes_no.length)
      await client.query(
        'INSERT INTO yes_no_daily (game_day, question_index, player_id) VALUES ($1, $2, $3) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id])
      dailyResult = await client.query('SELECT * FROM yes_no_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const player = await getPlayerById(client, daily.player_id)
    const question = QUESTIONS.yes_no[daily.question_index] || QUESTIONS.yes_no[0]

    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT vote FROM yes_no_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = voteResult.rows[0].vote
    }

    // Yesterday results
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayDaily = await client.query('SELECT * FROM yes_no_daily WHERE game_day = $1', [yesterdayDay])
    let yesterdayData = null
    if (yesterdayDaily.rowCount > 0) {
      const yd = yesterdayDaily.rows[0]
      const ydPlayer = await getPlayerById(client, yd.player_id)
      const ydQuestion = QUESTIONS.yes_no[yd.question_index] || QUESTIONS.yes_no[0]
      const votesResult = await client.query(`
        SELECT COUNT(*) FILTER (WHERE vote = 'yes')::int AS yes_votes,
               COUNT(*) FILTER (WHERE vote = 'no')::int AS no_votes
        FROM yes_no_votes WHERE game_day = $1
      `, [yesterdayDay])
      const yesVotes = Number(votesResult.rows[0].yes_votes)
      const noVotes = Number(votesResult.rows[0].no_votes)
      let winner = null
      if (yesVotes > noVotes) winner = 'yes'
      else if (noVotes > yesVotes) winner = 'no'
      let ydUserVote = null
      let reward = null
      if (playerId) {
        const yuv = await client.query('SELECT vote FROM yes_no_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, playerId])
        if (yuv.rowCount > 0) ydUserVote = yuv.rows[0].vote
        const r = await client.query('SELECT * FROM yes_no_rewards WHERE voter_id = $1 AND game_day = $2', [playerId, yesterdayDay])
        if (r.rowCount > 0) reward = r.rows[0]
      }
      yesterdayData = {
        question: ydQuestion,
        player_name: ydPlayer?.full_name || '',
        yesVotes,
        noVotes,
        winner,
        userVote: ydUserVote,
        reward: reward ? {
          participation_rewarded: reward.participation_rewarded,
          result_rewarded: reward.result_rewarded,
          xp_awarded: reward.xp_awarded,
          title_xp_awarded: reward.title_xp_awarded,
          coins_awarded: reward.coins_awarded,
        } : null,
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        player_name: player?.full_name || '',
        userVote,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Yes no today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/yes-no/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const vote = req.body.vote
    if (!Number.isInteger(voterId) || (vote !== 'yes' && vote !== 'no')) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const existing = await client.query('SELECT id FROM yes_no_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    await client.query('INSERT INTO yes_no_votes (game_day, voter_id, vote) VALUES ($1, $2, $3)', [gameDay, voterId, vote])
    await completeDailyGame(client, voterId, gameDay, 'yes-no')
    await rewardPlayer(client, voterId, 2, 1)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, 2, $2)', [voterId, 'yes_no_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, 1, $2)', [voterId, 'yes_no_vote'])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, message: 'Ответ учтён', profile: await getProfileForFrontend(client, voterId) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Yes no vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/yes-no/claim-results', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    if (!Number.isInteger(voterId)) return res.status(400).json({ ok: false, error: 'INVALID_DATA' })

    await client.query('BEGIN')
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day

    const existing = await client.query('SELECT * FROM yes_no_rewards WHERE voter_id = $1 AND game_day = $2', [voterId, yesterdayDay])
    if (existing.rowCount > 0 && existing.rows[0].result_rewarded) {
      await client.query('ROLLBACK')
      return res.json({ ok: true, success: true, alreadyClaimed: true, totalTitleXp: 0, totalCoins: 0 })
    }

    const voteResult = await client.query('SELECT vote FROM yes_no_votes WHERE game_day = $1 AND voter_id = $2', [yesterdayDay, voterId])
    if (voteResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_VOTED' }) }

    const votesResult = await client.query(`
      SELECT COUNT(*) FILTER (WHERE vote = 'yes')::int AS yes_votes,
             COUNT(*) FILTER (WHERE vote = 'no')::int AS no_votes
      FROM yes_no_votes WHERE game_day = $1
    `, [yesterdayDay])
    const yesVotes = Number(votesResult.rows[0].yes_votes)
    const noVotes = Number(votesResult.rows[0].no_votes)
    let winner = null
    if (yesVotes > noVotes) winner = 'yes'
    else if (noVotes > yesVotes) winner = 'no'

    const userVote = voteResult.rows[0].vote
    let titleXpAwarded = 0
    let coinsAwarded = 0
    if (winner && userVote === winner) {
      titleXpAwarded = 3
      coinsAwarded = 3
      await rewardTitleXp(client, voterId, titleXpAwarded)
      await rewardPlayer(client, voterId, 0, coinsAwarded)
    }

    await client.query(`
      INSERT INTO yes_no_rewards (voter_id, game_day, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded)
      VALUES ($1, $2, true, $3, 2, $4, $5)
      ON CONFLICT (voter_id, game_day) DO UPDATE SET result_rewarded = true, title_xp_awarded = $4, coins_awarded = $5
    `, [voterId, yesterdayDay, !!winner, titleXpAwarded, coinsAwarded])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, totalTitleXp: titleXpAwarded, totalCoins: coinsAwarded, winner })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Yes no claim error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #9: SECRET LOVE (Тайная любовь)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/secret-love/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let dailyResult = await client.query('SELECT * FROM secret_love_daily WHERE game_day = $1', [gameDay])

    if (dailyResult.rowCount === 0) {
      const players = await getRandomPlayers(client, 3)
      if (players.length < 3) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }
      const qIndex = Math.floor(Math.random() * QUESTIONS.secret_love.length)
      const correctIndex = Math.floor(Math.random() * 3)
      await client.query(
        'INSERT INTO secret_love_daily (game_day, question_index, player1_id, player2_id, player3_id, correct_index) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (game_day) DO NOTHING',
        [gameDay, qIndex, players[0].id, players[1].id, players[2].id, correctIndex])
      dailyResult = await client.query('SELECT * FROM secret_love_daily WHERE game_day = $1', [gameDay])
    }

    const daily = dailyResult.rows[0]
    const question = QUESTIONS.secret_love[daily.question_index] || QUESTIONS.secret_love[0]
    const p1 = await getPlayerById(client, daily.player1_id)
    const p2 = await getPlayerById(client, daily.player2_id)
    const p3 = await getPlayerById(client, daily.player3_id)

    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    if (playerId) {
      const voteResult = await client.query('SELECT selected_index, is_correct FROM secret_love_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (voteResult.rowCount > 0) userVote = voteResult.rows[0]
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        question,
        players: [p1?.full_name || '', p2?.full_name || '', p3?.full_name || ''],
        userVote: userVote ? { selected_index: userVote.selected_index, is_correct: userVote.is_correct } : null,
        correctIndex: userVote ? daily.correct_index : null,
      },
      yesterday: null,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Secret love today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/secret-love/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const selectedIndex = Number(req.body.selectedIndex)
    if (!Number.isInteger(voterId) || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 2) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const daily = await client.query('SELECT correct_index FROM secret_love_daily WHERE game_day = $1', [gameDay])
    if (daily.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'DAILY_NOT_FOUND' }) }

    const existing = await client.query('SELECT id FROM secret_love_votes WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    const isCorrect = Number(daily.rows[0].correct_index) === selectedIndex
    await client.query('INSERT INTO secret_love_votes (game_day, voter_id, selected_index, is_correct) VALUES ($1, $2, $3, $4)', [gameDay, voterId, selectedIndex, isCorrect])
    await completeDailyGame(client, voterId, gameDay, 'secret-love')

    const xpGain = isCorrect ? 4 : 2
    const coinGain = isCorrect ? 2 : 1
    await rewardPlayer(client, voterId, xpGain, coinGain)
    if (isCorrect) await rewardTitleXp(client, voterId, 2)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, xpGain, 'secret_love_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, coinGain, 'secret_love_vote'])

    await client.query('COMMIT')
    res.json({
      ok: true,
      success: true,
      message: isCorrect ? 'Правильно!' : 'Неправильно',
      isCorrect,
      correctIndex: Number(daily.rows[0].correct_index),
      profile: await getProfileForFrontend(client, voterId),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Secret love vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #10: ROULETTE (Русская рулетка)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/roulette/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    const playerId = Number(req.query.playerId || 0)
    let todayData = null
    let yesterdayData = null

    if (playerId) {
      const todayResult = await client.query('SELECT opponent_id, result FROM roulette_user_daily WHERE game_day = $1 AND voter_id = $2', [gameDay, playerId])
      if (todayResult.rowCount > 0) {
        const opponent = await getPlayerById(client, todayResult.rows[0].opponent_id)
        todayData = {
          opponent_name: opponent?.full_name || '',
          result: todayResult.rows[0].result,
        }
      } else {
        const opponents = await getRandomPlayers(client, 1)
        todayData = {
          opponent_name: opponents[0]?.full_name || '',
          result: null,
        }
      }
    } else {
      const opponents = await getRandomPlayers(client, 1)
      todayData = {
        opponent_name: opponents[0]?.full_name || '',
        result: null,
      }
    }

    // Yesterday stats
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const statsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE result = 'win')::int AS wins,
        COUNT(*) FILTER (WHERE result = 'lose')::int AS losses,
        COUNT(*)::int AS total
      FROM roulette_user_daily WHERE game_day = $1
    `, [yesterdayDay])
    yesterdayData = {
      wins: Number(statsResult.rows[0].wins),
      losses: Number(statsResult.rows[0].losses),
      total: Number(statsResult.rows[0].total),
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: todayData,
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Roulette today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/roulette/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    if (!Number.isInteger(voterId)) return res.status(400).json({ ok: false, error: 'INVALID_DATA' })

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    const existing = await client.query('SELECT id FROM roulette_user_daily WHERE game_day = $1 AND voter_id = $2', [gameDay, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_PLAYED' }) }

    const opponents = await getRandomPlayers(client, 1)
    if (opponents.length < 1) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }

    const result = Math.random() < 0.5 ? 'win' : 'lose'
    await client.query('INSERT INTO roulette_user_daily (game_day, voter_id, opponent_id, result) VALUES ($1, $2, $3, $4)', [gameDay, voterId, opponents[0].id, result])
    await completeDailyGame(client, voterId, gameDay, 'roulette')

    const xpGain = result === 'win' ? 5 : 2
    const coinGain = result === 'win' ? 3 : 1
    await rewardPlayer(client, voterId, xpGain, coinGain)
    if (result === 'win') await rewardTitleXp(client, voterId, 3)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, xpGain, 'roulette_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, $2, $3)', [voterId, coinGain, 'roulette_vote'])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, message: result === 'win' ? 'Победа!' : 'Поражение', profile: await getProfileForFrontend(client, voterId) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Roulette vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// GAME #1: DAILY POLL (Вопрос дня) — uses text candidates
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/games/daily-poll/today', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameDay = await getGameDay(client)

    let pollResult = await client.query(`
      SELECT dp.*, dpq.question
      FROM daily_polls dp
      JOIN daily_poll_questions dpq ON dpq.id = dp.question_id
      WHERE dp.poll_date = $1
    `, [gameDay])

    if (pollResult.rowCount === 0) {
      const questionResult = await client.query('SELECT id, question FROM daily_poll_questions WHERE active = true ORDER BY RANDOM() LIMIT 1')
      if (questionResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NO_QUESTIONS' }) }

      const allPlayers = await client.query('SELECT full_name FROM players ORDER BY RANDOM() LIMIT 3')
      if (allPlayers.rowCount < 3) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_ENOUGH_PLAYERS' }) }

      const candidates = allPlayers.rows.map(r => r.full_name)
      await client.query(
        'INSERT INTO daily_polls (question_id, poll_date, candidate_1, candidate_2, candidate_3) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (poll_date) DO NOTHING',
        [questionResult.rows[0].id, gameDay, candidates[0], candidates[1], candidates[2]])
      pollResult = await client.query(`
        SELECT dp.*, dpq.question
        FROM daily_polls dp
        JOIN daily_poll_questions dpq ON dpq.id = dp.question_id
        WHERE dp.poll_date = $1
      `, [gameDay])
    }

    const poll = pollResult.rows[0]
    const playerId = Number(req.query.playerId || 0)
    let userVote = null
    let votedAt = null
    if (playerId) {
      const voteResult = await client.query('SELECT selected_candidates, voted_at FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2', [poll.id, playerId])
      if (voteResult.rowCount > 0) {
        userVote = voteResult.rows[0].selected_candidates
        votedAt = voteResult.rows[0].voted_at
      }
    }

    // Yesterday results
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const yesterdayPoll = await client.query(`
      SELECT dp.*, dpq.question
      FROM daily_polls dp
      JOIN daily_poll_questions dpq ON dpq.id = dp.question_id
      WHERE dp.poll_date = $1
    `, [yesterdayDay])
    let yesterdayData = null
    if (yesterdayPoll.rowCount > 0) {
      const yp = yesterdayPoll.rows[0]
      const candidates = [yp.candidate_1, yp.candidate_2, yp.candidate_3]
      const voteCountsResult = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE $2 = ANY(selected_candidates))::int AS c1,
          COUNT(*) FILTER (WHERE $3 = ANY(selected_candidates))::int AS c2,
          COUNT(*) FILTER (WHERE $4 = ANY(selected_candidates))::int AS c3
        FROM daily_poll_user_votes
        JOIN daily_polls dp ON dp.id = daily_poll_user_votes.daily_poll_id
        WHERE dp.poll_date = $1
      `, [yesterdayDay, candidates[0], candidates[1], candidates[2]])
      const voteCounts = [Number(voteCountsResult.rows[0].c1), Number(voteCountsResult.rows[0].c2), Number(voteCountsResult.rows[0].c3)]
      const results = candidates.map((c, i) => ({ candidate: c, votes: voteCounts[i], placement: 0 }))
        .sort((a, b) => b.votes - a.votes)
        .map((r, i) => ({ ...r, placement: i + 1 }))

      let ydUserVote = null
      let reward = null
      if (playerId) {
        const yuv = await client.query('SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2', [yp.id, playerId])
        if (yuv.rowCount > 0) ydUserVote = yuv.rows[0].selected_candidates
        const r = await client.query('SELECT * FROM daily_poll_rewards WHERE daily_poll_id = $1 AND user_id = $2', [yp.id, playerId])
        if (r.rowCount > 0) reward = r.rows[0]
      }

      yesterdayData = {
        pollId: yp.id,
        question: yp.question,
        results,
        userVote: ydUserVote,
        reward: reward ? {
          participation_rewarded: reward.participation_rewarded,
          result_rewarded: reward.result_rewarded,
          xp_awarded: reward.xp_awarded,
          title_xp_awarded: reward.title_xp_awarded,
        } : null,
      }
    }

    await client.query('COMMIT')
    res.json({
      ok: true,
      today: {
        pollId: poll.id,
        question: poll.question,
        userVote,
        votedAt,
      },
      yesterday: yesterdayData,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Daily poll today error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/daily-poll/vote', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    const selectedCandidates = req.body.selectedCandidates
    if (!Number.isInteger(voterId) || !Array.isArray(selectedCandidates) || selectedCandidates.length === 0) {
      return res.status(400).json({ ok: false, error: 'INVALID_DATA' })
    }

    await client.query('BEGIN')
    const gameDay = await getGameDay(client)
    const pollResult = await client.query('SELECT id FROM daily_polls WHERE poll_date = $1', [gameDay])
    if (pollResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'POLL_NOT_FOUND' }) }

    const pollId = pollResult.rows[0].id
    const existing = await client.query('SELECT id FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2', [pollId, voterId])
    if (existing.rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ ok: false, error: 'ALREADY_VOTED' }) }

    await client.query('INSERT INTO daily_poll_user_votes (daily_poll_id, user_id, selected_candidates) VALUES ($1, $2, $3)', [pollId, voterId, selectedCandidates])
    await completeDailyGame(client, voterId, gameDay, 'daily-poll')
    await rewardPlayer(client, voterId, 2, 1)
    await client.query('INSERT INTO xp_transactions (player_id, amount, reason) VALUES ($1, 2, $2)', [voterId, 'daily_poll_vote'])
    await client.query('INSERT INTO coin_transactions (player_id, amount, reason) VALUES ($1, 1, $2)', [voterId, 'daily_poll_vote'])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, message: 'Голос учтён' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Daily poll vote error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

app.post('/api/games/daily-poll/claim-results', async (req, res) => {
  const client = await pool.connect()
  try {
    const voterId = Number(req.body.voterId)
    if (!Number.isInteger(voterId)) return res.status(400).json({ ok: false, error: 'INVALID_DATA' })

    await client.query('BEGIN')
    const yesterdayResult = await client.query(`SELECT ((NOW() AT TIME ZONE 'Europe/Moscow') - INTERVAL '8 hours')::date - 1 AS game_day`)
    const yesterdayDay = yesterdayResult.rows[0].game_day
    const pollResult = await client.query('SELECT * FROM daily_polls WHERE poll_date = $1', [yesterdayDay])
    if (pollResult.rowCount === 0) { await client.query('ROLLBACK'); return res.json({ ok: true, success: true, totalXp: 0, totalTitleXp: 0, message: 'Нет вчерашнего опроса' }) }

    const poll = pollResult.rows[0]
    const existing = await client.query('SELECT * FROM daily_poll_rewards WHERE daily_poll_id = $1 AND user_id = $2', [poll.id, voterId])
    if (existing.rowCount > 0 && existing.rows[0].result_rewarded) {
      await client.query('ROLLBACK')
      return res.json({ ok: true, success: true, alreadyClaimed: true, totalXp: 0, totalTitleXp: 0 })
    }

    const voteResult = await client.query('SELECT selected_candidates FROM daily_poll_user_votes WHERE daily_poll_id = $1 AND user_id = $2', [poll.id, voterId])
    if (voteResult.rowCount === 0) { await client.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'NOT_VOTED' }) }

    const candidates = [poll.candidate_1, poll.candidate_2, poll.candidate_3]
    const voteCountsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE $2 = ANY(selected_candidates))::int AS c1,
        COUNT(*) FILTER (WHERE $3 = ANY(selected_candidates))::int AS c2,
        COUNT(*) FILTER (WHERE $4 = ANY(selected_candidates))::int AS c3
      FROM daily_poll_user_votes
      JOIN daily_polls dp ON dp.id = daily_poll_user_votes.daily_poll_id
      WHERE dp.poll_date = $1
    `, [yesterdayDay, candidates[0], candidates[1], candidates[2]])
    const voteCounts = [Number(voteCountsResult.rows[0].c1), Number(voteCountsResult.rows[0].c2), Number(voteCountsResult.rows[0].c3)]
    const ranked = candidates.map((c, i) => ({ candidate: c, votes: voteCounts[i] }))
      .sort((a, b) => b.votes - a.votes)
    const placeMap = new Map()
    ranked.forEach((r, i) => placeMap.set(r.candidate, i + 1))

    const userCandidates = voteResult.rows[0].selected_candidates
    const placeRewards = { 1: { xp: 3, titleXp: 3 }, 2: { xp: 2, titleXp: 2 }, 3: { xp: 1, titleXp: 1 } }
    let totalXp = 0
    let totalTitleXp = 0
    const breakdown = []
    for (const c of userCandidates) {
      const place = placeMap.get(c)
      if (place && place <= 3) {
        const reward = placeRewards[place]
        totalXp += reward.xp
        totalTitleXp += reward.titleXp
        breakdown.push({ candidate: c, placement: place, xp: reward.xp, titleXp: reward.titleXp })
      }
    }

    if (totalTitleXp > 0) await rewardTitleXp(client, voterId, totalTitleXp)
    if (totalXp > 0) await rewardPlayer(client, voterId, totalXp, 0)

    await client.query(`
      INSERT INTO daily_poll_rewards (daily_poll_id, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded)
      VALUES ($1, $2, true, true, $3, $4)
      ON CONFLICT (daily_poll_id, user_id) DO UPDATE SET result_rewarded = true, xp_awarded = $3, title_xp_awarded = $4
    `, [poll.id, voterId, totalXp, totalTitleXp])

    await client.query('COMMIT')
    res.json({ ok: true, success: true, totalXp, totalTitleXp, breakdown })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Daily poll claim error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// MINI-GAME PROFILE (for MiniGamesPanel)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/mini-games/profile/:playerId', async (req, res) => {
  const client = await pool.connect()
  try {
    const playerId = Number(req.params.playerId)
    if (!Number.isInteger(playerId)) return res.status(400).json({ ok: false, error: 'INVALID_PLAYER_ID' })

    const profile = await getProfileForFrontend(client, playerId)
    if (!profile) return res.status(404).json({ ok: false, error: 'PLAYER_NOT_FOUND' })

    // Get today's completed games
    const gameDay = await getGameDay(client)
    const completionsResult = await client.query(`
      SELECT game_key FROM daily_game_completions
      WHERE player_id = $1 AND game_day = $2
    `, [playerId, gameDay])

    const gameKeyToNumber = {
      'who-most': 1, 'who-of-them': 2, 'would-he-do-it': 3, 'past-life': 4,
      'best-duo': 5, 'rate-player': 6, 'mafia': 7, 'yes-no': 8, 'secret-love': 9, 'roulette': 10,
    }
    const progress = []
    for (let i = 1; i <= 10; i++) {
      const gameKey = Object.entries(gameKeyToNumber).find(([, num]) => num === i)?.[0]
      const completed = completionsResult.rows.some(r => r.game_key === gameKey)
      progress.push({ game_number: i, completed, best_score: 0, played_at: completed ? gameDay.toISOString() : '' })
    }

    await client.query('COMMIT')
    res.json({ ok: true, profile, progress })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Mini-game profile error:', error)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  } finally {
    client.release()
  }
})
