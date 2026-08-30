#!/bin/bash
# ============================================================================
# DEPLOY — Fix test_questions seed SQL on live VPS backend
# ----------------------------------------------------------------------------
# Run as root:  bash deploy_seed_fix.sh
#
# What it does:
#   1. Backs up /var/www/seroin-app/index.js
#   2. Removes the "WHERE test_questions.correct_answer IS NULL" clause
#      from the ON CONFLICT DO UPDATE in the seed endpoint
#      (so text/options always update, correct_answer is preserved)
#   3. node --check
#   4. pm2 restart seroin-api
#   5. Verifies GET / POST seed / PATCH endpoints
#
# Does NOT touch any other routes, tables, or functionality.
# Does NOT delete existing questions or correct_answer values.
# ============================================================================

set -e

BACKEND="/var/www/seroin-app/index.js"
BACKUP="/var/www/seroin-app/index.js.bak.$(date +%Y%m%d%H%M%S)"
MARKER="test-questions/seed"

echo "============================================"
echo "  Deploy: seed SQL fix"
echo "============================================"
echo ""

# --- Step 1: Backup ---------------------------------------------------------
echo "[1/5] Backing up index.js -> $BACKUP"
cp "$BACKEND" "$BACKUP"
echo "      Done."
echo ""

# --- Step 2: Patch the seed SQL ---------------------------------------------
echo "[2/5] Patching seed SQL in index.js..."

if ! grep -q "$MARKER" "$BACKEND"; then
  echo "      ERROR: seed endpoint not found in $BACKEND"
  echo "      Aborting. Backup preserved: $BACKUP"
  exit 1
fi

# Check if the old clause is present
if grep -q "WHERE test_questions.correct_answer IS NULL" "$BACKEND"; then
  # Use node to do a safe, targeted replacement
  node -e "
    const fs = require('fs');
    const file = '$BACKEND';
    let src = fs.readFileSync(file, 'utf8');

    const oldClause = 'WHERE test_questions.correct_answer IS NULL\n       RETURNING (xmax = 0) AS inserted';
    const newClause = 'RETURNING (xmax = 0) AS inserted';

    // Try exact match first (with newline + spaces)
    let patched = src.replace(
      /WHERE\s+test_questions\.correct_answer\s+IS\s+NULL\s*\n\s*RETURNING\s+\(xmax\s*=\s*0\)\s+AS\s+inserted/,
      'RETURNING (xmax = 0) AS inserted'
    );

    if (patched === src) {
      // Fallback: just remove the WHERE line anywhere in the seed block
      patched = src.replace(
        /\n\s*WHERE test_questions\.correct_answer IS NULL\n/,
        '\n'
      );
    }

    if (patched === src) {
      console.error('Could not find the clause to remove. Aborting.');
      process.exit(1);
    }

    fs.writeFileSync(file, patched, 'utf8');
    console.log('Patched successfully.');
  "

  if grep -q "WHERE test_questions.correct_answer IS NULL" "$BACKEND"; then
    echo "      ERROR: clause still present after patch. Restoring backup."
    cp "$BACKUP" "$BACKEND"
    exit 1
  fi
  echo "      Removed 'WHERE test_questions.correct_answer IS NULL' from seed ON CONFLICT."
else
  echo "      Clause already absent — nothing to patch."
fi
echo ""

# --- Step 3: Syntax check ---------------------------------------------------
echo "[3/5] Running node --check..."
node --check "$BACKEND"
echo "      Syntax OK."
echo ""

# --- Step 4: Restart PM2 ----------------------------------------------------
echo "[4/5] Restarting PM2 process 'seroin-api'..."
pm2 restart seroin-api
echo "      Done."
echo ""

sleep 2

# --- Step 5: Verify endpoints -----------------------------------------------
echo "[5/5] Verifying endpoints..."
echo ""

echo "--- GET /api/test-questions ---"
GET_RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/api/test-questions)
GET_STATUS=$(echo "$GET_RESULT" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
GET_BODY=$(echo "$GET_RESULT" | head -n -1)
QUESTION_COUNT=$(echo "$GET_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const a=JSON.parse(d);console.log(a.length)}catch{console.log('parse_error')}})")
echo "  HTTP $GET_STATUS | questions in DB: $QUESTION_COUNT"
echo ""

echo "--- POST /api/test-questions/seed (single test question, will be upserted) ---"
SEED_RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/test-questions/seed \
  -H 'Content-Type: application/json' \
  -d '{"questions":[{"question_id":"__deploy_test__","question_text":"Deploy verification — safe to ignore","options":["a","b","c"]}]}')
SEED_STATUS=$(echo "$SEED_RESULT" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
SEED_BODY=$(echo "$SEED_RESULT" | head -n -1)
echo "  HTTP $SEED_STATUS | $SEED_BODY"
echo ""

echo "--- PATCH /api/test-questions/__deploy_test__/correct ---"
PATCH_RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH http://localhost:3001/api/test-questions/__deploy_test__/correct \
  -H 'Content-Type: application/json' \
  -d '{"correct_answer":0}')
PATCH_STATUS=$(echo "$PATCH_RESULT" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
PATCH_BODY=$(echo "$PATCH_RESULT" | head -n -1)
echo "  HTTP $PATCH_STATUS | $PATCH_BODY"
echo ""

echo "--- Verify: re-seed overwrites text but preserves correct_answer ---"
RESEED_RESULT=$(curl -s -X POST http://localhost:3001/api/test-questions/seed \
  -H 'Content-Type: application/json' \
  -d '{"questions":[{"question_id":"__deploy_test__","question_text":"Updated text after correct_answer was set","options":["x","y","z"]}]}')
echo "  Re-seed: $RESEED_RESULT"

VERIFY=$(curl -s http://localhost:3001/api/test-questions | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const rows=JSON.parse(d);
    const q=rows.find(r=>r.question_id==='__deploy_test__');
    if(!q){console.log('ERROR: __deploy_test__ not found');return}
    const textOk = q.question_text === 'Updated text after correct_answer was set';
    const optsOk = JSON.stringify(q.options) === JSON.stringify(['x','y','z']);
    const ansOk  = q.correct_answer === 0;
    console.log('  text updated:  ' + textOk);
    console.log('  options updated: ' + optsOk);
    console.log('  correct_answer preserved: ' + ansOk);
    if(textOk && optsOk && ansOk) console.log('  RESULT: ALL CHECKS PASSED');
    else console.log('  RESULT: CHECKS FAILED');
  });
")
echo "$VERIFY"
echo ""

# Cleanup: remove the test row so it doesn't clutter the real data
echo "--- Cleanup: removing __deploy_test__ row ---"
sudo -u postgres psql -d seroin_app -c "DELETE FROM test_questions WHERE question_id = '__deploy_test__';" 2>/dev/null && echo "  Removed." || echo "  (skipped — could not connect to psql, remove manually if needed)"
echo ""

echo "============================================"
echo "  DEPLOY COMPLETE"
echo "============================================"
echo ""
echo "Backup: $BACKUP"
echo ""
echo "What was fixed:"
echo "  - seed endpoint now always updates question_text and options"
echo "  - correct_answer is preserved (never reset to NULL by seed)"
echo "  - re-seeding overwrites stale text even for answered questions"
echo ""
