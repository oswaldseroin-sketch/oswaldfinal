-- ============================================================================
-- AMALGAMA — Schema FIX for VPS (api.serointeam.ru)
-- ----------------------------------------------------------------------------
-- This migration FIXES the tables created by vps_schema_latest.sql to match
-- what the existing /var/www/seroin-app/index.js backend actually expects.
--
-- The existing backend uses integer player IDs (players.id is serial),
-- player1_id/player2_id (int FKs), voter_id (int FK), etc.
-- The previous migration created text-based columns matching Supabase.
--
-- This script:
--   1. DROPs the incorrectly-shaped game tables (they have 0 rows — safe)
--   2. Recreates them with the correct schema matching the backend
--   3. Creates the additional tables the backend needs (lottery, rewards, etc.)
--
-- IMPORTANT: The `players` table must already exist as a real table with
-- id (serial), full_name, gender, coins, xp, level, title_level, title_xp.
-- If it doesn't exist, this script creates it and seeds from game_workers.
--
-- SAFE: Only drops tables that have 0 rows. Checks before dropping.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PLAYERS — real table (NOT a view). The backend expects id, full_name, etc.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'players') THEN
    DROP VIEW players;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS players (
  id          serial      PRIMARY KEY,
  full_name   text        NOT NULL UNIQUE,
  gender      text        NOT NULL CHECK (gender IN ('м', 'ж')),
  coins       int         NOT NULL DEFAULT 0,
  xp          int         NOT NULL DEFAULT 0,
  level       int         NOT NULL DEFAULT 1,
  title_level int         NOT NULL DEFAULT 1,
  title_xp    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed players from game_workers if players table is empty
INSERT INTO players (full_name, gender)
SELECT name, gender FROM game_workers
WHERE name NOT IN (SELECT full_name FROM players)
ON CONFLICT (full_name) DO NOTHING;

-- ============================================================================
-- Drop incorrectly-shaped game tables (0 rows — safe to recreate)
-- ============================================================================
DO $$
DECLARE
  t text;
  tables_to_drop text[] := ARRAY[
    'who_of_them_daily', 'who_of_them_votes', 'who_of_them_rewards',
    'would_he_do_it_daily', 'would_he_do_it_votes', 'would_he_do_it_rewards',
    'past_life_daily', 'past_life_votes', 'past_life_rewards',
    'best_duo_daily', 'best_duo_votes', 'best_duo_rewards',
    'rate_player_daily', 'rate_player_votes', 'rate_player_rewards',
    'mafia_daily', 'mafia_user_state', 'mafia_rewards', 'mafia_attempts',
    'yes_no_daily', 'yes_no_votes', 'yes_no_rewards',
    'secret_love_user_daily', 'secret_love_user_state', 'secret_love_rewards',
    'roulette_user_daily', 'roulette_user_state', 'roulette_rewards',
    'daily_game_completions', 'daily_game_set_rewards',
    'xp_transactions', 'coin_transactions',
    'mini_game_profile', 'mini_game_progress',
    'daily_poll_questions', 'daily_polls', 'daily_poll_user_votes', 'daily_poll_rewards',
    'knowledge_numbers', 'test_question_blocks'
  ];
  row_count int;
BEGIN
  FOREACH t IN ARRAY tables_to_drop LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = t AND schemaname = 'public') THEN
      EXECUTE format('SELECT count(*) FROM %I', t) INTO row_count;
      IF row_count = 0 THEN
        EXECUTE format('DROP TABLE %I CASCADE', t);
        RAISE NOTICE 'Dropped empty table %', t;
      ELSE
        RAISE NOTICE 'Keeping table % (has % rows)', t, row_count;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- GAME COMPLETIONS & SET REWARDS (backend uses player_id int)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_game_completions (
  id          serial      PRIMARY KEY,
  player_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day    date        NOT NULL,
  game_key    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, game_day, game_key)
);

CREATE TABLE IF NOT EXISTS daily_game_set_rewards (
  id              serial      PRIMARY KEY,
  player_id       int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  bonus_rewarded  boolean     NOT NULL DEFAULT false,
  title_xp_awarded int       NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, game_day)
);

-- ============================================================================
-- XP & COIN TRANSACTIONS (backend uses player_id int)
-- ============================================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id          serial      PRIMARY KEY,
  player_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount      int         NOT NULL,
  reason      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id          serial      PRIMARY KEY,
  player_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount      int         NOT NULL,
  reason      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DAILY GAME VOTES (who-most game — backend uses voter_id, choice_N_id int)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_game_votes (
  id          serial      PRIMARY KEY,
  game_day    date        NOT NULL,
  game_key    text        NOT NULL,
  question    text        NOT NULL,
  voter_id    int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  choice_1_id int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  choice_2_id int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  choice_3_id int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reward_xp   int         NOT NULL DEFAULT 0,
  reward_coins int       NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, game_key, voter_id)
);

-- ============================================================================
-- WHO MOST RESULT REWARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS who_most_result_rewards (
  id              serial      PRIMARY KEY,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  picked_player_id int       NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  place           int        NOT NULL,
  coins_awarded   int        NOT NULL DEFAULT 0,
  title_xp_awarded int       NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, game_day, picked_player_id)
);

-- ============================================================================
-- GAME #2: WHO OF THEM (backend uses player1_id, player2_id, voter_id, chosen_player_id int)
-- ============================================================================
CREATE TABLE IF NOT EXISTS who_of_them_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player1_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS who_of_them_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  chosen_player_id int       NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- ============================================================================
-- HOURLY REWARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS hourly_rewards (
  id              serial      PRIMARY KEY,
  player_id       int         NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  last_claimed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DAILY LOGIN REWARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_login_rewards (
  id              serial      PRIMARY KEY,
  player_id       int         NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  streak          int         NOT NULL DEFAULT 0,
  last_claimed_day date      NOT NULL DEFAULT CURRENT_DATE,
  last_claimed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- LOTTERY SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS lottery_state (
  id      int     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  jackpot int     NOT NULL DEFAULT 0
);

INSERT INTO lottery_state (id, jackpot) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS lottery_daily_spins (
  id              serial      PRIMARY KEY,
  player_id       int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  free_spins_used int        NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, game_day)
);

CREATE TABLE IF NOT EXISTS lottery_inventory (
  id          serial      PRIMARY KEY,
  player_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_key    text        NOT NULL,
  quantity    int         NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, item_key)
);

CREATE TABLE IF NOT EXISTS lottery_spins (
  id          serial      PRIMARY KEY,
  player_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day    date        NOT NULL,
  result_type text        NOT NULL,
  item_key    text,
  coins_won   int         NOT NULL DEFAULT 0,
  jackpot_won int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lottery_spins_player_day
  ON lottery_spins (player_id, game_day);

CREATE TABLE IF NOT EXISTS lottery_effects (
  id                  serial      PRIMARY KEY,
  player_id           int         NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  pink_bushido_active boolean     NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lottery_radio_messages (
  id          serial      PRIMARY KEY,
  sender_id   int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  recipient_id int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  message     text        NOT NULL,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lottery_radio_recipient
  ON lottery_radio_messages (recipient_id, is_read);

-- ============================================================================
-- KNOWLEDGE NUMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_numbers (
  id          serial      PRIMARY KEY,
  number      int         NOT NULL UNIQUE,
  content     text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO knowledge_numbers (number, content)
SELECT i, ''
FROM generate_series(1, 31) AS i
WHERE NOT EXISTS (SELECT 1 FROM knowledge_numbers kn WHERE kn.number = i);

-- ============================================================================
-- TEST QUESTION BLOCKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_question_blocks (
  question_id  text        PRIMARY KEY,
  block_number int         NOT NULL CHECK (block_number >= 1 AND block_number <= 4),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_blocks_block_number
  ON test_question_blocks (block_number);

-- ============================================================================
-- DAILY POLL (if the backend uses it — create with int FKs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_poll_questions (
  id          serial      PRIMARY KEY,
  question    text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_polls (
  id          serial      PRIMARY KEY,
  question_id int         NOT NULL REFERENCES daily_poll_questions(id) ON DELETE CASCADE,
  poll_date   date        NOT NULL UNIQUE,
  candidate_1 text        NOT NULL,
  candidate_2 text        NOT NULL,
  candidate_3 text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_poll_user_votes (
  id                serial      PRIMARY KEY,
  daily_poll_id     int         NOT NULL REFERENCES daily_polls(id) ON DELETE CASCADE,
  user_id           int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_candidates text[]   NOT NULL,
  voted_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_poll_rewards (
  id                  serial      PRIMARY KEY,
  daily_poll_id       int         NOT NULL REFERENCES daily_polls(id) ON DELETE CASCADE,
  user_id             int        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded     boolean     NOT NULL DEFAULT false,
  xp_awarded          int         NOT NULL DEFAULT 0,
  title_xp_awarded    int         NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_game_completions_player_day
  ON daily_game_completions (player_id, game_day);
CREATE INDEX IF NOT EXISTS idx_daily_game_set_rewards_player_day
  ON daily_game_set_rewards (player_id, game_day);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_player
  ON xp_transactions (player_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_player
  ON coin_transactions (player_id);
CREATE INDEX IF NOT EXISTS idx_daily_game_votes_day_key
  ON daily_game_votes (game_day, game_key);
CREATE INDEX IF NOT EXISTS idx_who_of_them_votes_day_voter
  ON who_of_them_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_lottery_inventory_player
  ON lottery_inventory (player_id);

-- ============================================================================
-- END OF SCHEMA FIX
-- ============================================================================
