-- ============================================================================
-- AMALGAMA — SQL schema for PostgreSQL on VPS (api.serointeam.ru)
-- ----------------------------------------------------------------------------
-- This file consolidates all 11 Supabase migrations into a single script
-- adapted for a plain PostgreSQL database (no RLS, no Supabase roles).
--
-- HOW TO APPLY:
--   psql -U <user> -d <database> -f vps_schema.sql
--
-- Or paste into pgAdmin / Adminer / DBeaver.
--
-- All RLS policies and Supabase-specific constructs (REPLICA IDENTITY,
-- publications, SECURITY DEFINER, role grants) have been removed.
-- Access control is now enforced in the Node.js/Express backend.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. employees — access requests (заявки на пропуск)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text        NOT NULL,
  organization text       NOT NULL,
  access_date date        NOT NULL,
  record_type text        NOT NULL DEFAULT 'person',
  vehicle_type text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. memes — meme collection
-- ============================================================================
CREATE TABLE IF NOT EXISTS memes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  description text        NOT NULL,
  image_url   text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. game_workers — team roster for games
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_workers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 2 AND 120),
  gender     text        NOT NULL CHECK (gender IN ('м', 'ж')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: 24 employees (duplicate Шомесова Е.П. filtered by ON CONFLICT)
INSERT INTO game_workers (name, gender) VALUES
  ('Шигапова З.М.', 'ж'), ('Дикая С.И.', 'ж'), ('Терлецкая Т.А.', 'ж'), ('Тимшин Д.С.', 'м'),
  ('Пономарева Е.Е.', 'ж'), ('Бенвовская Ю.С.', 'ж'), ('Билык И.Е.', 'ж'), ('Усенко А.Н.', 'м'),
  ('Шомесова Е.П.', 'ж'), ('Тарабукина Н.Б.', 'ж'), ('Майерс Н.А.', 'ж'), ('Пруткевич Е.Р.', 'м'),
  ('Гутче А.И.', 'ж'), ('Гаврилюк Е.В.', 'ж'), ('Карпюк О.В.', 'м'), ('Капустина О.Н.', 'ж'),
  ('Пруткевич О.В.', 'ж'), ('Гутче Н.С.', 'ж'), ('Батманов И.А.', 'м'), ('Заколодяжная И.В.', 'ж'),
  ('Усенко В.А.', 'м'), ('Кетова В.В.', 'ж'), ('Радина Е.А.', 'ж'), ('Красоцкая А.Н.', 'ж')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. team_stats — per-worker game statistics
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_stats (
  worker_name text        PRIMARY KEY REFERENCES game_workers(name) ON DELETE CASCADE,
  weight      int         NOT NULL DEFAULT 0,
  happiness   int         NOT NULL DEFAULT 0,
  balance     int         NOT NULL DEFAULT 0,
  title_level int         NOT NULL DEFAULT 1,
  title_xp    int         NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed: one row per game_worker, all zeros
INSERT INTO team_stats (worker_name, weight, happiness, balance, title_level, title_xp)
SELECT name, 0, 0, 0, 1, 0 FROM game_workers
ON CONFLICT (worker_name) DO NOTHING;

-- ============================================================================
-- 5. prediction_counts — prediction statistics per name
-- ============================================================================
CREATE TABLE IF NOT EXISTS prediction_counts (
  name       text        PRIMARY KEY,
  count      int         NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. secret_attempts — singleton counter for secret room
-- ============================================================================
CREATE TABLE IF NOT EXISTS secret_attempts (
  id         int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  attempts   int         NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO secret_attempts (id, attempts) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. import_log — Google Sheet import tracking (idempotency)
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key  text        UNIQUE NOT NULL,
  row_count   int         NOT NULL,
  imported_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. chat_messages — Fludilka chat messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  nickname   text        NOT NULL,
  message    text        NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 300),
  chat_day   date        NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_day_created
  ON chat_messages (chat_day, created_at);

-- ============================================================================
-- 9. chat_nicks — daily nickname assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_nicks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  nickname   text        NOT NULL,
  chat_day   date        NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_nicks_nick_day_unique UNIQUE (nickname, chat_day),
  CONSTRAINT chat_nicks_user_day_unique UNIQUE (user_id, chat_day)
);

CREATE INDEX IF NOT EXISTS idx_chat_nicks_day
  ON chat_nicks (chat_day);

-- ============================================================================
-- 10. team_daily_votes — daily team mini-game votes
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_daily_votes (
  id         bigint      GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  game_day   date        NOT NULL,
  voter_name text        NOT NULL,
  question   text        NOT NULL,
  choice_1   text        NOT NULL,
  choice_2   text        NOT NULL,
  choice_3   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_name)
);

-- ============================================================================
-- FUNCTIONS (optional — logic can also be in Node.js backend instead)
-- ============================================================================

-- increment_prediction_count: atomic upsert + increment
CREATE OR REPLACE FUNCTION increment_prediction_count(p_name text)
RETURNS prediction_counts
LANGUAGE plpgsql
AS $$
DECLARE
  result prediction_counts;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 1 OR length(trim(p_name)) > 120 THEN
    RAISE EXCEPTION 'Invalid prediction name';
  END IF;

  INSERT INTO prediction_counts (name, count, updated_at)
  VALUES (trim(p_name), 1, now())
  ON CONFLICT (name)
  DO UPDATE SET count = prediction_counts.count + 1, updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- increment_secret_attempt: atomic increment of singleton counter
CREATE OR REPLACE FUNCTION increment_secret_attempt()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_value integer;
BEGIN
  INSERT INTO secret_attempts (id, attempts, updated_at)
  VALUES (1, 1, now())
  ON CONFLICT (id)
  DO UPDATE SET attempts = secret_attempts.attempts + 1, updated_at = now()
  RETURNING attempts INTO new_value;

  RETURN new_value;
END;
$$;

-- adjust_team_stats: atomic increment of weight/happiness/balance
CREATE OR REPLACE FUNCTION adjust_team_stats(
  p_worker_name text,
  p_weight integer DEFAULT 0,
  p_happiness integer DEFAULT 0,
  p_balance integer DEFAULT 0
)
RETURNS team_stats
LANGUAGE plpgsql
AS $$
DECLARE
  updated_row team_stats;
BEGIN
  IF p_worker_name IS NULL OR length(trim(p_worker_name)) = 0 THEN
    RAISE EXCEPTION 'worker name is required';
  END IF;

  INSERT INTO team_stats (worker_name, weight, happiness, balance)
  VALUES (p_worker_name, p_weight, p_happiness, p_balance)
  ON CONFLICT (worker_name) DO UPDATE SET
    weight = team_stats.weight + EXCLUDED.weight,
    happiness = team_stats.happiness + EXCLUDED.happiness,
    balance = team_stats.balance + EXCLUDED.balance,
    updated_at = now()
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

-- ============================================================================
-- 11. test_questions — questions for Tests panel (Знания → Тесты)
-- ============================================================================
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

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
