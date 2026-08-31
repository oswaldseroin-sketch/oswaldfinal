// ============================================================================
// AMALGAMA — Express API routes for VPS backend (api.serointeam.ru)
// ----------------------------------------------------------------------------
// This file contains ALL 18 API endpoints needed by the frontend.
// It is designed to be merged into your existing /var/www/seroin-app/index.js
//
// PREREQUISITES:
//   - Express app already created and listening
//   - PostgreSQL connection already established (as `pool` or `db`)
//   - `pg` Pool is assumed. If your variable name differs, adjust the imports.
//
// The code below uses:
//   import express from 'express'   (or require, depending on your setup)
//   import { Pool } from 'pg'
//
// Adjust the pool variable name to match your existing code.
// ============================================================================

// --- CORS CONFIGURATION -----------------------------------------------------
// Replace BOLT_DOMAIN with your actual Bolt production domain.
// Bolt preview domains look like: https://<project-id>.bolt.new
// Check your Bolt project settings for the exact published URL.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',       // Vite dev server
  'http://localhost:3000',       // local preview
  'https://bolt.new',            // Bolt main domain
  // TODO: Add your Bolt production domain here, e.g.:
  // 'https://amalgama.bolt.new',
  // 'https://<your-project-id>.bolt.new',
]

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
}

// Apply CORS to all routes
app.use(corsMiddleware)

// Helper: convert pg snake_case rows to consistent JSON
function rowsToJson(rows) {
  return rows
}

// Helper: safe async handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

// ============================================================================
// EMPLOYEES — /api/employees
// ============================================================================

// GET /api/employees — list all, ordered by full_name
app.get('/api/employees', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM employees ORDER BY full_name'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/employees — create new entry
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

// DELETE /api/employees/:id — delete by uuid
app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM employees WHERE id = $1', [id])
  res.status(204).end()
}))

// ============================================================================
// GAME WORKERS — /api/workers
// ============================================================================

// GET /api/workers — list all, ordered by name
app.get('/api/workers', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, gender FROM game_workers ORDER BY name'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/workers — add worker + create team_stats row
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
  // Create team_stats row
  await pool.query(
    'INSERT INTO team_stats (worker_name, weight, happiness, balance, title_level, title_xp) VALUES ($1, 0, 0, 0, 1, 0) ON CONFLICT DO NOTHING',
    [name]
  )
  res.status(201).json(rows[0])
}))

// DELETE /api/workers/:name — remove worker (cascade deletes team_stats)
app.delete('/api/workers/:name', asyncHandler(async (req, res) => {
  const { name } = req.params
  await pool.query('DELETE FROM game_workers WHERE name = $1', [name])
  res.status(204).end()
}))

// ============================================================================
// TEAM STATS — /api/team-stats
// ============================================================================

// GET /api/team-stats — all stats
app.get('/api/team-stats', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT worker_name, weight, happiness, balance, title_level, title_xp FROM team_stats'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/team-stats/adjust — atomic increment (replaces RPC adjust_team_stats)
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

// PATCH /api/team-stats/:workerName/title — update title_level and title_xp
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

// GET /api/memes — list all, newest first
app.get('/api/memes', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM memes ORDER BY created_at DESC'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/memes — add meme
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

// GET /api/prediction-counts — statistics, ordered by count DESC, name ASC
app.get('/api/prediction-counts', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, count FROM prediction_counts ORDER BY count DESC, name ASC'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/prediction-counts/increment — atomic increment (replaces RPC)
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

// GET /api/secret-attempts — current counter value
app.get('/api/secret-attempts', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT attempts FROM secret_attempts WHERE id = 1'
  )
  res.json({ attempts: rows[0]?.attempts ?? 0 })
}))

// POST /api/secret-attempts/increment — atomic increment (replaces RPC)
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

// GET /api/chat/nicks/:deviceId — get user's nick for today
app.get('/api/chat/nicks/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT nickname FROM chat_nicks WHERE user_id = $1 AND chat_day = $2',
    [deviceId, day]
  )
  res.json({ nickname: rows[0]?.nickname ?? null })
}))

// GET /api/chat/nicks?day=YYYY-MM-DD — list taken nicks for a day
app.get('/api/chat/nicks', asyncHandler(async (req, res) => {
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT nickname FROM chat_nicks WHERE chat_day = $1',
    [day]
  )
  res.json(rows.map(r => r.nickname))
}))

// POST /api/chat/nicks — assign a nick
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
      // unique constraint violation — nick already taken or user already has a nick
      return res.status(409).json({ error: 'nick already taken or user already assigned' })
    }
    throw err
  }
}))

// GET /api/chat/messages?day=YYYY-MM-DD — messages for a day, oldest first, limit 200
app.get('/api/chat/messages', asyncHandler(async (req, res) => {
  const day = req.query.day || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(
    'SELECT * FROM chat_messages WHERE chat_day = $1 ORDER BY created_at ASC LIMIT 200',
    [day]
  )
  res.json(rowsToJson(rows))
}))

// POST /api/chat/messages — send a message
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

// GET /api/chat/messages/count?day=YYYY-MM-DD — message count for a day
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

// GET /api/votes?gameDay=YYYY-MM-DD&voterName=... — get user's vote for a day
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

// POST /api/votes — save a vote
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
// HEALTH CHECK (should already exist — keep this only if it doesn't)
// ============================================================================
// app.get('/api/health', (req, res) => {
//   res.json({ ok: true, message: 'SEROIN SERVER WORKS' })
// })

// ============================================================================
// TEST QUESTIONS — /api/test-questions
// ============================================================================

// GET /api/test-questions — all questions with correct_answer
app.get('/api/test-questions', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT question_id, question_text, options, correct_answer FROM test_questions ORDER BY question_id'
  )
  res.json(rowsToJson(rows))
}))

// GET /api/test-questions/active — only questions with correct_answer set
app.get('/api/test-questions/active', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT question_id, question_text, options, correct_answer FROM test_questions WHERE correct_answer IS NOT NULL ORDER BY question_id'
  )
  res.json(rowsToJson(rows))
}))

// POST /api/test-questions/seed — bulk insert/update questions (preserves existing correct_answer)
app.post('/api/test-questions/seed', asyncHandler(async (req, res) => {
  const { questions } = req.body
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'questions array is required' })
  }
  let inserted = 0
  let updated = 0
  for (const q of questions) {
    if (!q.question_id || !q.question_text || !Array.isArray(q.options)) continue
    const result = await pool.query(
      `INSERT INTO test_questions (question_id, question_text, options, correct_answer)
       VALUES ($1, $2, $3, NULL)
       ON CONFLICT (question_id) DO UPDATE SET
         question_text = EXCLUDED.question_text,
         options = EXCLUDED.options,
         updated_at = now()
       WHERE test_questions.correct_answer IS NULL
       RETURNING (xmax = 0) AS inserted`,
      [q.question_id, q.question_text, JSON.stringify(q.options)]
    )
    if (result.rows.length > 0) {
      if (result.rows[0].inserted) inserted++
      else updated++
    }
  }
  res.json({ inserted, updated, total: questions.length })
}))

// PATCH /api/test-questions/:questionId/correct — set correct answer for a question
app.patch('/api/test-questions/:questionId/correct', asyncHandler(async (req, res) => {
  const questionId = decodeURIComponent(req.params.questionId)
  const { correct_answer } = req.body
  if (typeof correct_answer !== 'number' || correct_answer < 0) {
    return res.status(400).json({ error: 'correct_answer must be a non-negative number' })
  }
  const { rows } = await pool.query(
    `UPDATE test_questions SET correct_answer = $2, updated_at = now()
     WHERE question_id = $1
     RETURNING question_id, question_text, options, correct_answer`,
    [questionId, correct_answer]
  )
  if (rows.length === 0) {
    return res.status(404).json({ error: 'question not found' })
  }
  res.json(rows[0])
}))

// ============================================================================
// ERROR HANDLER — catch-all for unhandled errors
// ============================================================================
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})
