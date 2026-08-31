/*
# Create mini-games #2-6 tables, unified reward system, and title XP on profile

## Overview
This migration adds:
1. title_xp and title_level columns to mini_game_profile
2. xp_transactions and coin_transactions tables for economic audit trail
3. daily_game_completions table (tracks which games a user completed per game day)
4. daily_game_set_rewards table (tracks 10/10 bonus reward)
5. Game-specific tables for mini-games #2-6

## 1. Modified Tables
- mini_game_profile: added title_xp (int, default 0) and title_level (int, default 1)
  These are independent from the ordinary xp/level system.

## 2. New Tables — Economy
- xp_transactions: audit log of all XP changes
  - id, user_id, amount, reason, game_key, game_day, created_at
- coin_transactions: audit log of all coin changes
  - id, user_id, amount, reason, game_key, game_day, created_at

## 3. New Tables — Completion tracking
- daily_game_completions: one row per (user_id, game_key, game_day)
  - Tracks which of the 10 games a user completed each day
  - Unique on (user_id, game_key, game_day)
- daily_game_set_rewards: tracks whether the 10/10 bonus (+5 title_xp) was granted
  - Unique on (user_id, game_day)

## 4. New Tables — Game #2 "Кто из них?"
- who_of_them_daily: one daily question + 2 randomly selected players (same for all users)
  - id, game_day (date, unique), question_index, player_1, player_2, created_at
- who_of_them_votes: one vote per user per day
  - id, game_day, user_id, selected_player, voted_at
  - Unique on (game_day, user_id)
- who_of_them_rewards: tracks participation + result reward status
  - id, game_day, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
  - Unique on (game_day, user_id)

## 5. New Tables — Game #3 "Сделал бы за 100 000?"
- would_he_do_it_daily: one daily scenario + 1 player + question
  - id, game_day (date, unique), question_index, player_name, created_at
- would_he_do_it_votes: one vote per user per day (yes/no)
  - id, game_day, user_id, vote (text: 'yes' or 'no'), voted_at
  - Unique on (game_day, user_id)
- would_he_do_it_rewards: reward tracking
  - id, game_day, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
  - Unique on (game_day, user_id)

## 6. New Tables — Game #4 "Прошлая жизнь"
- past_life_daily: one daily question + 3 players + correct answer index
  - id, game_day (date, unique), question_index, player_1, player_2, player_3, correct_index (0-2), created_at
- past_life_votes: one vote per user per day (selected player index)
  - id, game_day, user_id, selected_index (0-2), is_correct (boolean), voted_at
  - Unique on (game_day, user_id)
- past_life_rewards: reward tracking
  - id, game_day, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
  - Unique on (game_day, user_id)

## 7. New Tables — Game #5 "Какой дуэт лучше?"
- best_duo_daily: one daily question + 4 players + team assignment
  - id, game_day (date, unique), question_index, player_1, player_2, player_3, player_4, created_at
  - Team 1 = player_1 + player_2, Team 2 = player_3 + player_4
- best_duo_votes: one vote per user per day (team 1 or 2)
  - id, game_day, user_id, selected_team (1 or 2), voted_at
  - Unique on (game_day, user_id)
- best_duo_rewards: reward tracking
  - id, game_day, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
  - Unique on (game_day, user_id)

## 8. New Tables — Game #6 "Оцени"
- rate_player_daily: one daily question + 1 player to rate
  - id, game_day (date, unique), question_index, player_name, created_at
- rate_player_votes: one rating per user per day (0-5)
  - id, game_day, user_id, rating (0-5), voted_at
  - Unique on (game_day, user_id)
- rate_player_rewards: reward tracking
  - id, game_day, user_id, participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded, coins_awarded
  - Unique on (game_day, user_id)

## 9. Security
- RLS enabled on all new tables.
- Deny-by-default for anon/authenticated direct access.
  All access goes through edge functions using the service role key (bypasses RLS).
*/

-- ─── Add title_xp and title_level to mini_game_profile ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mini_game_profile' AND column_name = 'title_xp') THEN
    ALTER TABLE mini_game_profile ADD COLUMN title_xp int NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mini_game_profile' AND column_name = 'title_level') THEN
    ALTER TABLE mini_game_profile ADD COLUMN title_level int NOT NULL DEFAULT 1;
  END IF;
END $$;

-- ─── Economy: xp_transactions ───
CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,
  game_key text,
  game_day date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_xp_transactions" ON xp_transactions;
CREATE POLICY "deny_xp_transactions" ON xp_transactions FOR SELECT TO anon, authenticated USING (false);

-- ─── Economy: coin_transactions ───
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,
  game_key text,
  game_day date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_coin_transactions" ON coin_transactions;
CREATE POLICY "deny_coin_transactions" ON coin_transactions FOR SELECT TO anon, authenticated USING (false);

-- ─── daily_game_completions ───
CREATE TABLE IF NOT EXISTS daily_game_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game_key text NOT NULL,
  game_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_key, game_day)
);
ALTER TABLE daily_game_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_daily_game_completions" ON daily_game_completions;
CREATE POLICY "deny_daily_game_completions" ON daily_game_completions FOR SELECT TO anon, authenticated USING (false);

-- ─── daily_game_set_rewards (10/10 bonus) ───
CREATE TABLE IF NOT EXISTS daily_game_set_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game_day date NOT NULL,
  bonus_rewarded boolean NOT NULL DEFAULT false,
  title_xp_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_day)
);
ALTER TABLE daily_game_set_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_daily_game_set_rewards" ON daily_game_set_rewards;
CREATE POLICY "deny_daily_game_set_rewards" ON daily_game_set_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #2: who_of_them ───
CREATE TABLE IF NOT EXISTS who_of_them_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_1 text NOT NULL,
  player_2 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE who_of_them_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_who_of_them_daily" ON who_of_them_daily;
CREATE POLICY "deny_who_of_them_daily" ON who_of_them_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS who_of_them_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  selected_player text NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE who_of_them_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_who_of_them_votes" ON who_of_them_votes;
CREATE POLICY "deny_who_of_them_votes" ON who_of_them_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS who_of_them_rewards (
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
ALTER TABLE who_of_them_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_who_of_them_rewards" ON who_of_them_rewards;
CREATE POLICY "deny_who_of_them_rewards" ON who_of_them_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #3: would_he_do_it ───
CREATE TABLE IF NOT EXISTS would_he_do_it_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE would_he_do_it_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_would_he_do_it_daily" ON would_he_do_it_daily;
CREATE POLICY "deny_would_he_do_it_daily" ON would_he_do_it_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS would_he_do_it_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes', 'no')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE would_he_do_it_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_would_he_do_it_votes" ON would_he_do_it_votes;
CREATE POLICY "deny_would_he_do_it_votes" ON would_he_do_it_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS would_he_do_it_rewards (
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
ALTER TABLE would_he_do_it_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_would_he_do_it_rewards" ON would_he_do_it_rewards;
CREATE POLICY "deny_would_he_do_it_rewards" ON would_he_do_it_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #4: past_life ───
CREATE TABLE IF NOT EXISTS past_life_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_1 text NOT NULL,
  player_2 text NOT NULL,
  player_3 text NOT NULL,
  correct_index int NOT NULL CHECK (correct_index >= 0 AND correct_index <= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE past_life_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_past_life_daily" ON past_life_daily;
CREATE POLICY "deny_past_life_daily" ON past_life_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS past_life_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  selected_index int NOT NULL CHECK (selected_index >= 0 AND selected_index <= 2),
  is_correct boolean NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE past_life_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_past_life_votes" ON past_life_votes;
CREATE POLICY "deny_past_life_votes" ON past_life_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS past_life_rewards (
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
ALTER TABLE past_life_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_past_life_rewards" ON past_life_rewards;
CREATE POLICY "deny_past_life_rewards" ON past_life_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #5: best_duo ───
CREATE TABLE IF NOT EXISTS best_duo_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_1 text NOT NULL,
  player_2 text NOT NULL,
  player_3 text NOT NULL,
  player_4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE best_duo_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_best_duo_daily" ON best_duo_daily;
CREATE POLICY "deny_best_duo_daily" ON best_duo_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS best_duo_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  selected_team int NOT NULL CHECK (selected_team IN (1, 2)),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE best_duo_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_best_duo_votes" ON best_duo_votes;
CREATE POLICY "deny_best_duo_votes" ON best_duo_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS best_duo_rewards (
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
ALTER TABLE best_duo_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_best_duo_rewards" ON best_duo_rewards;
CREATE POLICY "deny_best_duo_rewards" ON best_duo_rewards FOR SELECT TO anon, authenticated USING (false);

-- ─── Game #6: rate_player ───
CREATE TABLE IF NOT EXISTS rate_player_daily (
  id serial PRIMARY KEY,
  game_day date NOT NULL UNIQUE,
  question_index int NOT NULL DEFAULT 0,
  player_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rate_player_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_rate_player_daily" ON rate_player_daily;
CREATE POLICY "deny_rate_player_daily" ON rate_player_daily FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS rate_player_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_day date NOT NULL,
  user_id text NOT NULL,
  rating int NOT NULL CHECK (rating >= 0 AND rating <= 5),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, user_id)
);
ALTER TABLE rate_player_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_rate_player_votes" ON rate_player_votes;
CREATE POLICY "deny_rate_player_votes" ON rate_player_votes FOR SELECT TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS rate_player_rewards (
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
ALTER TABLE rate_player_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_rate_player_rewards" ON rate_player_rewards;
CREATE POLICY "deny_rate_player_rewards" ON rate_player_rewards FOR SELECT TO anon, authenticated USING (false);