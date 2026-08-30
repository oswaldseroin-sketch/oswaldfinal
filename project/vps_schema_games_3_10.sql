-- ============================================================================
-- AMALGAMA — Schema for mini-games #3-10 on VPS (api.serointeam.ru)
-- ----------------------------------------------------------------------------
-- Creates tables for games #3-10 that the existing backend doesn't have yet.
-- Uses CREATE TABLE IF NOT EXISTS — safe to run multiple times.
-- All tables use integer player IDs (FK to players.id) to match existing backend.
-- ============================================================================

-- Game #3: Would He Do It (Сделал бы?)
CREATE TABLE IF NOT EXISTS would_he_do_it_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player_id       int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS would_he_do_it_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  vote            text        NOT NULL CHECK (vote IN ('yes', 'no')),
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

CREATE TABLE IF NOT EXISTS would_he_do_it_rewards (
  id              serial      PRIMARY KEY,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean     NOT NULL DEFAULT false,
  xp_awarded      int         NOT NULL DEFAULT 0,
  title_xp_awarded int        NOT NULL DEFAULT 0,
  coins_awarded   int        NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, game_day)
);

-- Game #4: Past Life (Прошлая жизнь)
CREATE TABLE IF NOT EXISTS past_life_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player1_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player3_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  correct_index   int         NOT NULL CHECK (correct_index >= 0 AND correct_index <= 2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS past_life_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_index  int         NOT NULL,
  is_correct      boolean     NOT NULL DEFAULT false,
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- Game #5: Best Duo (Лучший дуэт)
CREATE TABLE IF NOT EXISTS best_duo_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  team1_p1_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team1_p2_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team2_p1_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team2_p2_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS best_duo_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_team   int         NOT NULL CHECK (selected_team IN (1, 2)),
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

CREATE TABLE IF NOT EXISTS best_duo_rewards (
  id              serial      PRIMARY KEY,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean     NOT NULL DEFAULT false,
  xp_awarded      int         NOT NULL DEFAULT 0,
  title_xp_awarded int        NOT NULL DEFAULT 0,
  coins_awarded   int        NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, game_day)
);

-- Game #6: Rate Player (Оцени)
CREATE TABLE IF NOT EXISTS rate_player_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player_id       int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_player_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rating          int         NOT NULL CHECK (rating >= 0 AND rating <= 5),
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- Game #7: Mafia (Угадай мафию)
CREATE TABLE IF NOT EXISTS mafia_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player1_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player3_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player4_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player5_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mafia_index     int         NOT NULL CHECK (mafia_index >= 0 AND mafia_index <= 4),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mafia_user_state (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attempt_count   int         NOT NULL DEFAULT 0,
  eliminated      int[]       NOT NULL DEFAULT '{}',
  found_mafia     boolean     NOT NULL DEFAULT false,
  game_ended      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- Game #8: Yes or No (Да или Нет)
CREATE TABLE IF NOT EXISTS yes_no_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player_id       int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yes_no_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  vote            text        NOT NULL CHECK (vote IN ('yes', 'no')),
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

CREATE TABLE IF NOT EXISTS yes_no_rewards (
  id              serial      PRIMARY KEY,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_day        date        NOT NULL,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded boolean     NOT NULL DEFAULT false,
  xp_awarded      int         NOT NULL DEFAULT 0,
  title_xp_awarded int        NOT NULL DEFAULT 0,
  coins_awarded   int        NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, game_day)
);

-- Game #9: Secret Love (Тайная любовь)
CREATE TABLE IF NOT EXISTS secret_love_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL UNIQUE,
  question_index  int         NOT NULL DEFAULT 0,
  player1_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player3_id      int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  correct_index   int         NOT NULL CHECK (correct_index >= 0 AND correct_index <= 2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secret_love_votes (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_index  int         NOT NULL,
  is_correct      boolean     NOT NULL DEFAULT false,
  voted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- Game #10: Roulette (Русская рулетка)
CREATE TABLE IF NOT EXISTS roulette_user_daily (
  id              serial      PRIMARY KEY,
  game_day        date        NOT NULL,
  voter_id        int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent_id     int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  result          text        NOT NULL CHECK (result IN ('win', 'lose')),
  played_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_day, voter_id)
);

-- Daily poll (Game #1: Вопрос дня) — text-based candidates (not int FK)
CREATE TABLE IF NOT EXISTS daily_poll_questions (
  id          serial      PRIMARY KEY,
  question    text        NOT NULL,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO daily_poll_questions (question)
SELECT 'Кто самый красивый в команде?'
WHERE NOT EXISTS (SELECT 1 FROM daily_poll_questions LIMIT 1);

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
  user_id           int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_candidates text[]   NOT NULL,
  voted_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS daily_poll_rewards (
  id                  serial      PRIMARY KEY,
  daily_poll_id       int         NOT NULL REFERENCES daily_polls(id) ON DELETE CASCADE,
  user_id             int         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  participation_rewarded boolean NOT NULL DEFAULT false,
  result_rewarded     boolean     NOT NULL DEFAULT false,
  xp_awarded          int         NOT NULL DEFAULT 0,
  title_xp_awarded    int         NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_poll_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_would_he_do_it_votes_day_voter ON would_he_do_it_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_past_life_votes_day_voter ON past_life_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_best_duo_votes_day_voter ON best_duo_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_rate_player_votes_day_voter ON rate_player_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_mafia_user_state_day_voter ON mafia_user_state (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_yes_no_votes_day_voter ON yes_no_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_secret_love_votes_day_voter ON secret_love_votes (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_roulette_user_daily_day_voter ON roulette_user_daily (game_day, voter_id);
CREATE INDEX IF NOT EXISTS idx_daily_poll_user_votes_poll_user ON daily_poll_user_votes (daily_poll_id, user_id);
