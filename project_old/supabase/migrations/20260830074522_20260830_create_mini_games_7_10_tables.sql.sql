/*
# Create mini-games #7-10 tables

## Game #7: Mafia (mafia)
- mafia_daily: 5 players + mafia index, shared for all users per game day
- mafia_user_state: per-user state (attempts, eliminated picks, completed)
- mafia_rewards: reward tracking
- mafia_attempts: audit log of each attempt

## Game #8: Yes/No (yes_no)
- yes_no_daily: player + question, shared for all users per game day
- yes_no_votes: one vote per user per day (yes/no)
- yes_no_rewards: reward tracking

## Game #9: Secret Love (secret_love)
- secret_love_user_daily: per-user 3 players + correct index, individual
- secret_love_user_state: per-user answer state
- secret_love_rewards: reward tracking

## Game #10: Roulette (roulette)
- roulette_user_daily: per-user opponent, individual
- roulette_user_state: per-user result (win/lose)
- roulette_rewards: reward tracking

Security: RLS enabled, deny-by-default for anon/authenticated.
*/

-- ─── Game #7: Mafia ───
CREATE TABLE IF NOT EXISTS mafia_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_1 text NOT NULL,
  player_2 text NOT NULL,
  player_3 text NOT NULL,
  player_4 text NOT NULL,
  player_5 text NOT NULL,
  mafia_index int NOT NULL CHECK (mafia_index >= 0 AND mafia_index <= 4),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mafia_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_mafia_daily" ON mafia_daily;
CREATE POLICY "deny_mafia_daily" ON mafia_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS mafia_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  eliminated_1 int,
  eliminated_2 int,
  found_mafia boolean NOT NULL DEFAULT false,
  game_ended boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE mafia_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_mafia_user_state" ON mafia_user_state;
CREATE POLICY "deny_mafia_user_state" ON mafia_user_state FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS mafia_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean NOT NULL DEFAULT false,
  xp_awarded int NOT NULL DEFAULT 0,
  title_xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  UNIQUE (game_day, user_id)
);
ALTER TABLE mafia_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_mafia_rewards" ON mafia_rewards;
CREATE POLICY "deny_mafia_rewards" ON mafia_rewards FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS mafia_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  attempt_number int NOT NULL,
  selected_index int NOT NULL,
  is_mafia boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mafia_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_mafia_attempts" ON mafia_attempts;
CREATE POLICY "deny_mafia_attempts" ON mafia_attempts FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #8: Yes/No ───
CREATE TABLE IF NOT EXISTS yes_no_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE yes_no_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_yes_no_daily" ON yes_no_daily;
CREATE POLICY "deny_yes_no_daily" ON yes_no_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS yes_no_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes', 'no')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE yes_no_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_yes_no_votes" ON yes_no_votes;
CREATE POLICY "deny_yes_no_votes" ON yes_no_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS yes_no_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean NOT NULL DEFAULT false,
  xp_awarded int NOT NULL DEFAULT 0,
  title_xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  UNIQUE (game_day, user_id)
);
ALTER TABLE yes_no_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_yes_no_rewards" ON yes_no_rewards;
CREATE POLICY "deny_yes_no_rewards" ON yes_no_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #9: Secret Love ───
CREATE TABLE IF NOT EXISTS secret_love_user_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  player_1 text NOT NULL,
  player_2 text NOT NULL,
  player_3 text NOT NULL,
  correct_index int NOT NULL CHECK (correct_index >= 0 AND correct_index <= 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE secret_love_user_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_secret_love_user_daily" ON secret_love_user_daily;
CREATE POLICY "deny_secret_love_user_daily" ON secret_love_user_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS secret_love_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  selected_index int NOT NULL CHECK (selected_index >= 0 AND selected_index <= 2),
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE secret_love_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_secret_love_user_state" ON secret_love_user_state;
CREATE POLICY "deny_secret_love_user_state" ON secret_love_user_state FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS secret_love_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean NOT NULL DEFAULT false,
  xp_awarded int NOT NULL DEFAULT 0,
  title_xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  UNIQUE (game_day, user_id)
);
ALTER TABLE secret_love_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_secret_love_rewards" ON secret_love_rewards;
CREATE POLICY "deny_secret_love_rewards" ON secret_love_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #10: Roulette ───
CREATE TABLE IF NOT EXISTS roulette_user_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  opponent_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE roulette_user_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_roulette_user_daily" ON roulette_user_daily;
CREATE POLICY "deny_roulette_user_daily" ON roulette_user_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS roulette_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  result text NOT NULL CHECK (result IN ('win', 'lose')),
  played_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE roulette_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_roulette_user_state" ON roulette_user_state;
CREATE POLICY "deny_roulette_user_state" ON roulette_user_state FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS roulette_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean NOT NULL DEFAULT false,
  xp_awarded int NOT NULL DEFAULT 0,
  title_xp_awarded int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  UNIQUE (game_day, user_id)
);
ALTER TABLE roulette_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_roulette_rewards" ON roulette_rewards;
CREATE POLICY "deny_roulette_rewards" ON roulette_rewards FOR SELECT TO anon, authenticated USING (false);