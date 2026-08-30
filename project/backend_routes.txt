// ============================================================================
// AMALGAMA — Integrated API routes for VPS backend (merge into index.js)
// ----------------------------------------------------------------------------
// INSTRUCTIONS:
//   1. Paste this entire block into your existing /var/www/seroin-app/index.js
//      AFTER all existing routes, BEFORE the app.listen() call.
//   2. Do NOT add app.listen, express, dotenv, Pool, or CORS — already in index.js.
//   3. The variable `pool` must already be defined (pg Pool) in your index.js.
//   4. Restart after merge: pm2 restart seroin-app
// ============================================================================

// --- HELPERS ----------------------------------------------------------------

function rowsToJson(rows) {
  return rows
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

// ============================================================================
// EMPLOYEES — /api/employees
// ============================================================================

app.get('/api/employees', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM employees ORDER BY full_name'
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/employees', asyncHandler(async (req, res) => {
  const { full_name, organization, access_date, record_type, vehicle_type } = req.body
  if (!full_name || !organization || !access_date) {
    return res.status(400).json({ error: 'full_name, organization, access_date are required' })
  }
  const { rows } = await pool.query(
    `INSERT INTO employees (full_name, organization, access_date, record_type, vehicle_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [full_name, organization, access_date, record_type || 'person', vehicle_type || null]
  )
  res.status(201).json(rows[0])
}))

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM employees WHERE id = $1', [id])
  res.status(204).end()
}))

// ============================================================================
// GAME WORKERS — /api/workers
// ============================================================================

app.get('/api/workers', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, gender FROM game_workers ORDER BY name'
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/workers', asyncHandler(async (req, res) => {
  const { name, gender } = req.body
  if (!name || !gender) {
    return res.status(400).json({ error: 'name and gender are required' })
  }
  if (gender !== 'м' && gender !== 'ж') {
    return res.status(400).json({ error: "gender must be 'м' or 'ж'" })
  }
  const { rows } = await pool.query(
    'INSERT INTO game_workers (name, gender) VALUES ($1, $2) RETURNING *',
    [name, gender]
  )
  await pool.query(
    'INSERT INTO team_stats (worker_name, weight, happiness, balance, title_level, title_xp) VALUES ($1, 0, 0, 0, 1, 0) ON CONFLICT DO NOTHING',
    [name]
  )
  res.status(201).json(rows[0])
}))

app.delete('/api/workers/:name', asyncHandler(async (req, res) => {
  const { name } = req.params
  await pool.query('DELETE FROM game_workers WHERE name = $1', [name])
  res.status(204).end()
}))

// ============================================================================
// TEAM STATS — /api/team-stats
// ============================================================================

app.get('/api/team-stats', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT worker_name, weight, happiness, balance, title_level, title_xp FROM team_stats'
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/team-stats/adjust', asyncHandler(async (req, res) => {
  const { worker_name, weight, happiness, balance } = req.body
  if (!worker_name) {
    return res.status(400).json({ error: 'worker_name is required' })
  }
  const { rows } = await pool.query(
    `INSERT INTO team_stats (worker_name, weight, happiness, balance)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (worker_name) DO UPDATE SET
       weight = team_stats.weight + EXCLUDED.weight,
       happiness = team_stats.happiness + EXCLUDED.happiness,
       balance = team_stats.balance + EXCLUDED.balance,
       updated_at = now()
     RETURNING worker_name, weight, happiness, balance, title_level, title_xp`,
    [worker_name, weight || 0, happiness || 0, balance || 0]
  )
  res.json(rows[0])
}))

app.patch('/api/team-stats/:workerName/title', asyncHandler(async (req, res) => {
  const workerName = decodeURIComponent(req.params.workerName)
  const { title_level, title_xp } = req.body
  if (typeof title_level !== 'number' || typeof title_xp !== 'number') {
    return res.status(400).json({ error: 'title_level and title_xp must be numbers' })
  }
  const { rows } = await pool.query(
    `UPDATE team_stats SET title_level = $2, title_xp = $3, updated_at = now()
     WHERE worker_name = $1
     RETURNING worker_name, weight, happiness, balance, title_level, title_xp`,
    [workerName, title_level, title_xp]
  )
  if (rows.length === 0) {
    return res.status(404).json({ error: 'worker not found' })
  }
  res.json(rows[0])
}))

// ============================================================================
// MEMES — /api/memes
// ============================================================================

app.get('/api/memes', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM memes ORDER BY created_at DESC'
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/memes', asyncHandler(async (req, res) => {
  const { description, image_url } = req.body
  if (!description) {
    return res.status(400).json({ error: 'description is required' })
  }
  const { rows } = await pool.query(
    'INSERT INTO memes (description, image_url) VALUES ($1, $2) RETURNING *',
    [description, image_url || null]
  )
  res.status(201).json(rows[0])
}))

// ============================================================================
// PREDICTION COUNTS — /api/prediction-counts
// ============================================================================

app.get('/api/prediction-counts', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, count FROM prediction_counts ORDER BY count DESC, name ASC'
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/prediction-counts/increment', asyncHandler(async (req, res) => {
  const { name } = req.body
  if (!name || name.trim().length < 1 || name.trim().length > 120) {
    return res.status(400).json({ error: 'valid name is required (1-120 chars)' })
  }
  const { rows } = await pool.query(
    `INSERT INTO prediction_counts (name, count, updated_at)
     VALUES (trim($1), 1, now())
     ON CONFLICT (name)
     DO UPDATE SET count = prediction_counts.count + 1, updated_at = now()
     RETURNING name, count`,
    [name]
  )
  res.json(rows[0])
}))

// ============================================================================
// SECRET ATTEMPTS — /api/secret-attempts
// ============================================================================

app.get('/api/secret-attempts', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT attempts FROM secret_attempts WHERE id = 1'
  )
  res.json({ attempts: rows[0]?.attempts ?? 0 })
}))

app.post('/api/secret-attempts/increment', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `INSERT INTO secret_attempts (id, attempts, updated_at)
     VALUES (1, 1, now())
     ON CONFLICT (id)
     DO UPDATE SET attempts = secret_attempts.attempts + 1, updated_at = now()
     RETURNING attempts`
  )
  res.json({ attempts: rows[0].attempts })
}))

// ============================================================================
// CHAT (Флюдилка) — /api/chat/*
// ============================================================================

app.get('/api/chat/nicks/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT nickname FROM chat_nicks WHERE user_id = $1 AND chat_day = $2',
    [deviceId, day]
  )
  res.json({ nickname: rows[0]?.nickname ?? null })
}))

app.get('/api/chat/nicks', asyncHandler(async (req, res) => {
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT nickname FROM chat_nicks WHERE chat_day = $1',
    [day]
  )
  res.json(rows.map(r => r.nickname))
}))

app.post('/api/chat/nicks', asyncHandler(async (req, res) => {
  const { user_id, nickname, chat_day } = req.body
  if (!user_id || !nickname || !chat_day) {
    return res.status(400).json({ error: 'user_id, nickname, chat_day are required' })
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO chat_nicks (user_id, nickname, chat_day) VALUES ($1, $2, $3) RETURNING *',
      [user_id, nickname, chat_day]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'nick already taken or user already assigned' })
    }
    throw err
  }
}))

app.get('/api/chat/messages', asyncHandler(async (req, res) => {
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT * FROM chat_messages WHERE chat_day = $1 ORDER BY created_at ASC LIMIT 200',
    [day]
  )
  res.json(rowsToJson(rows))
}))

app.post('/api/chat/messages', asyncHandler(async (req, res) => {
  const { user_id, nickname, message, chat_day } = req.body
  if (!user_id || !nickname || !message) {
    return res.status(400).json({ error: 'user_id, nickname, message are required' })
  }
  const trimmed = message.trim()
  if (trimmed.length === 0 || trimmed.length > 300) {
    return res.status(400).json({ error: 'message must be 1-300 characters' })
  }
  const day = chat_day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'INSERT INTO chat_messages (user_id, nickname, message, chat_day) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_id, nickname, trimmed, day]
  )
  res.status(201).json(rows[0])
}))

app.get('/api/chat/messages/count', asyncHandler(async (req, res) => {
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT count(*)::int AS count FROM chat_messages WHERE chat_day = $1',
    [day]
  )
  res.json({ count: rows[0]?.count ?? 0 })
}))

// ============================================================================
// TEAM DAILY VOTES — /api/votes
// ============================================================================

app.get('/api/votes', asyncHandler(async (req, res) => {
  const { gameDay, voterName } = req.query
  if (!gameDay || !voterName) {
    return res.status(400).json({ error: 'gameDay and voterName are required' })
  }
  const { rows } = await pool.query(
    'SELECT choice_1, choice_2, choice_3 FROM team_daily_votes WHERE game_day = $1 AND voter_name = $2',
    [gameDay, voterName]
  )
  res.json(rows[0] ?? null)
}))

app.post('/api/votes', asyncHandler(async (req, res) => {
  const { game_day, voter_name, question, choice_1, choice_2, choice_3 } = req.body
  if (!game_day || !voter_name || !question || !choice_1 || !choice_2 || !choice_3) {
    return res.status(400).json({ error: 'game_day, voter_name, question, choice_1, choice_2, choice_3 are required' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO team_daily_votes (game_day, voter_name, question, choice_1, choice_2, choice_3)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [game_day, voter_name, question, choice_1, choice_2, choice_3]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'vote already submitted for this day' })
    }
    throw err
  }
}))

// ============================================================================
// ERROR HANDLER — catch-all for unhandled errors
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})
