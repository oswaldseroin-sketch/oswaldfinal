/*
# Create daily poll tables for mini-game #1 "Вопрос дня"

1. New Tables
- `daily_poll_questions`
  - `id` (serial, primary key)
  - `question` (text, not null) — the poll question text
  - `active` (boolean, default true) — whether this question can be selected
  - `created_at` (timestamptz, default now())
- `daily_polls`
  - `id` (serial, primary key)
  - `question_id` (int, references daily_poll_questions)
  - `poll_date` (date, unique, not null) — one poll per day
  - `candidate_1` (text, not null) — worker name
  - `candidate_2` (text, not null) — worker name
  - `candidate_3` (text, not null) — worker name
  - `created_at` (timestamptz, default now())
- `daily_poll_user_votes`
  - `id` (uuid, primary key)
  - `daily_poll_id` (int, references daily_polls)
  - `user_id` (text, not null) — currentUser.id
  - `selected_candidates` (text[], not null) — array of candidate names chosen (1-3)
  - `voted_at` (timestamptz, default now())
  - Unique constraint on (daily_poll_id, user_id) — one vote per user per poll
- `daily_poll_rewards`
  - `id` (uuid, primary key)
  - `daily_poll_id` (int, references daily_polls)
  - `user_id` (text, not null) — currentUser.id
  - `participation_rewarded` (boolean, default false) — +10 XP for voting
  - `result_rewarded` (boolean, default false) — XP for placement
  - `xp_awarded` (int, default 0) — total XP awarded
  - `title_xp_awarded` (int, default 0) — title progress awarded
  - `created_at` (timestamptz, default now())
  - Unique constraint on (daily_poll_id, user_id)

2. Security
- Enable RLS on all tables.
- Deny-by-default for anon/authenticated direct access (all access via edge function with service role key).
*/

CREATE TABLE IF NOT EXISTS daily_poll_questions (
  id serial PRIMARY KEY,
  question text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_poll_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS daily_polls (
  id serial PRIMARY KEY,
  question_id int NOT NULL REFERENCES daily_poll_questions(id) ON DELETE CASCADE,
  poll_date date NOT NULL UNIQUE,
  candidate_1 text NOT NULL,
  candidate_2 text NOT NULL,
  candidate_3 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS daily_poll_user_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_poll_id int NOT NULL REFERENCES daily_polls(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  selected_candidates text[] NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

ALTER TABLE daily_poll_user_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS daily_poll_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_poll_id int NOT NULL REFERENCES daily_polls(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean NOT NULL DEFAULT false,
  xp_awarded int NOT NULL DEFAULT 0,
  title_xp_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

ALTER TABLE daily_poll_rewards ENABLE ROW LEVEL SECURITY;

-- Deny-by-default: all access goes through the edge function (service role bypasses RLS)
DROP POLICY IF EXISTS "deny_daily_poll_questions" ON daily_poll_questions;
CREATE POLICY "deny_daily_poll_questions" ON daily_poll_questions FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_daily_polls" ON daily_polls;
CREATE POLICY "deny_daily_polls" ON daily_polls FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_daily_poll_user_votes" ON daily_poll_user_votes;
CREATE POLICY "deny_daily_poll_user_votes" ON daily_poll_user_votes FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_daily_poll_rewards" ON daily_poll_rewards;
CREATE POLICY "deny_daily_poll_rewards" ON daily_poll_rewards FOR SELECT TO anon, authenticated USING (false);
