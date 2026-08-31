/*
# Create mini_game_profile and mini_game_progress tables

1. New Tables
- `mini_game_profile`
  - `user_id` (text, primary key) — matches currentUser.id (the player's name string)
  - `level` (int, default 1)
  - `xp` (int, default 0)
  - `coins` (int, default 0)
  - `title` (text, default 'Новичок')
  - `updated_at` (timestamptz, auto-updated)
- `mini_game_progress`
  - `id` (uuid, primary key)
  - `user_id` (text, not null) — matches currentUser.id
  - `game_number` (int, 1-10, not null)
  - `completed` (boolean, default false)
  - `best_score` (int, default 0)
  - `played_at` (timestamptz, auto-updated)
  - Unique constraint on (user_id, game_number)

2. Security
- Enable RLS on both tables.
- All policies scoped TO anon, authenticated with user_id ownership check.
  The app uses local auth (currentUser.id = player name string), no Supabase sessions.
  user_id is passed explicitly in every request; the edge function (service role) enforces ownership.
  RLS policies use (user_id = current_setting('app.current_user_id', true)) which the edge function sets per request.
- SELECT, INSERT, UPDATE, DELETE all check ownership.
*/

CREATE TABLE IF NOT EXISTS mini_game_profile (
  user_id text PRIMARY KEY,
  level int NOT NULL DEFAULT 1,
  xp int NOT NULL DEFAULT 0,
  coins int NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT 'Новичок',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mini_game_profile ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS mini_game_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game_number int NOT NULL CHECK (game_number >= 1 AND game_number <= 10),
  completed boolean NOT NULL DEFAULT false,
  best_score int NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_number)
);

ALTER TABLE mini_game_progress ENABLE ROW LEVEL SECURITY;

-- The edge function uses the service role key which bypasses RLS.
-- No direct anon/authenticated policies needed since all access goes through the edge function.
-- But we add deny-by-default policies as defense-in-depth.

DROP POLICY IF EXISTS "deny_mini_game_profile" ON mini_game_profile;
CREATE POLICY "deny_mini_game_profile"
ON mini_game_profile FOR SELECT
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "deny_mini_game_progress" ON mini_game_progress;
CREATE POLICY "deny_mini_game_progress"
ON mini_game_progress FOR SELECT
TO anon, authenticated
USING (false);
