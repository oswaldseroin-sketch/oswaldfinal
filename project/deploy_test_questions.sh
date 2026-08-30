#!/bin/bash
# ============================================================================
# DEPLOY SCRIPT — test_questions endpoints for seroin-api
# ----------------------------------------------------------------------------
# Run on VPS:  bash deploy_test_questions.sh
#
# What it does:
#   1. Creates test_questions table in PostgreSQL
#   2. Adds 4 new API endpoints to /var/www/seroin-app/index.js
#   3. Restarts PM2 process "seroin-api"
#
# Does NOT touch existing routes or break current backend.
# ============================================================================

set -e

BACKEND_FILE="/var/www/seroin-app/index.js"
BACKUP_FILE="/var/www/seroin-app/index.js.bak.$(date +%Y%m%d%H%M%S)"
MARKER="# __TEST_QUESTIONS_ROUTES__"

echo "============================================"
echo "  Deploy: test_questions endpoints"
echo "============================================"
echo ""

# --- Step 0: Backup --------------------------------------------------------
echo "[1/4] Backing up index.js -> $BACKUP_FILE"
cp "$BACKEND_FILE" "$BACKUP_FILE"
echo "      Done."
echo ""

# --- Step 1: Create PostgreSQL table ---------------------------------------
echo "[2/4] Creating test_questions table in PostgreSQL..."

# Table is created by postgres superuser, then privileges granted to seroin_user
sudo -u postgres psql -d seroin_app << 'SQL'
CREATE TABLE IF NOT EXISTS test_questions (
  question_id    text        PRIMARY KEY,
  question_text  text        NOT NULL,
  options        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  correct_answer int         CHECK (correct_answer IS NULL OR correct_answer >= 0),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_correct
  ON test_questions (correct_answer);

GRANT ALL PRIVILEGES ON TABLE test_questions TO seroin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seroin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO seroin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO seroin_user;

SELECT 'test_questions table ready' AS status;
SQL

echo "      Done."
echo ""

# --- Step 2: Check if routes already added ---------------------------------
echo "[3/4] Adding API endpoints to index.js..."

if grep -q "$MARKER" "$BACKEND_FILE"; then
  echo "      Routes already present — skipping insertion."
else
  # Create the routes snippet
  ROUTES_FILE=$(mktemp)
  cat > "$ROUTES_FILE" << 'ROUTES_EOF'

// __TEST_QUESTIONS_ROUTES__
// ============================================================================
// TEST QUESTIONS — /api/test-questions  (auto-inserted by deploy script)
// ============================================================================

app.get('/api/test-questions', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT question_id, question_text, options, correct_answer FROM test_questions ORDER BY question_id'
  )
  res.json(rowsToJson(rows))
}))

app.get('/api/test-questions/active', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT question_id, question_text, options, correct_answer FROM test_questions WHERE correct_answer IS NOT NULL ORDER BY question_id'
  )
  res.json(rowsToJson(rows))
}))

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

// __END_TEST_QUESTIONS_ROUTES__
ROUTES_EOF

  # Insert before the error handler
  # Find the line with "app.use((err, req, res, next)" and insert before it
  if grep -q "app.use((err, req, res, next)" "$BACKEND_FILE"; then
    # Use sed to insert the routes file content before the error handler line
    sed -i "/app.use((err, req, res, next)/{
      h
      r $ROUTES_FILE"
      d
    }" "$BACKEND_FILE" 2>/dev/null || true

    # If sed approach failed, try a simpler method: insert before error handler
    if ! grep -q "$MARKER" "$BACKEND_FILE"; then
      # Restore from backup and use node to insert
      cp "$BACKUP_FILE" "$BACKEND_FILE"
      node -e "
        const fs = require('fs')
        const file = '$BACKEND_FILE'
        const routes = fs.readFileSync('$ROUTES_FILE', 'utf8')
        let content = fs.readFileSync(file, 'utf8')
        const marker = 'app.use((err, req, res, next)'
        const idx = content.indexOf(marker)
        if (idx === -1) {
          // No error handler found — append at end
          content = content + '\n' + routes + '\n'
        } else {
          content = content.slice(0, idx) + routes + '\n' + content.slice(idx)
        }
        fs.writeFileSync(file, content, 'utf8')
        console.log('Routes inserted via node')
      "
    fi
  else
    # No error handler found — append at end
    cat "$ROUTES_FILE" >> "$BACKEND_FILE"
  fi

  rm -f "$ROUTES_FILE"

  if grep -q "$MARKER" "$BACKEND_FILE"; then
    echo "      Routes inserted successfully."
  else
    echo "      ERROR: Failed to insert routes. Restoring backup."
    cp "$BACKUP_FILE" "$BACKEND_FILE"
    exit 1
  fi
fi
echo ""

# --- Step 3: Restart PM2 ---------------------------------------------------
echo "[4/4] Restarting PM2 process 'seroin-api'..."
pm2 restart seroin-api
echo "      Done."
echo ""

# --- Step 4: Verify --------------------------------------------------------
echo "============================================"
echo "  Verifying endpoints..."
echo "============================================"

sleep 2

echo ""
echo "Testing GET /api/test-questions:"
curl -s http://localhost:3001/api/test-questions | head -c 200
echo ""
echo ""

echo "Testing GET /api/test-questions/active:"
curl -s http://localhost:3001/api/test-questions/active | head -c 200
echo ""
echo ""

echo "============================================"
echo "  DEPLOY COMPLETE"
echo "============================================"
echo ""
echo "New endpoints now live:"
echo "  GET   /api/test-questions"
echo "  GET   /api/test-questions/active"
echo "  POST  /api/test-questions/seed"
echo "  PATCH /api/test-questions/:questionId/correct"
echo ""
echo "Backup saved: $BACKUP_FILE"
echo ""
echo "Next steps:"
echo "  1. Open the admin panel in the app"
echo "  2. Click 'Загрузить вопросы в базу' to seed 440 questions"
echo "  3. Assign correct answers via admin panel"
echo ""
