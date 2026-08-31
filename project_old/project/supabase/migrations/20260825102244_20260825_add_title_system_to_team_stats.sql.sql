/*
# Add title system columns to team_stats

1. Modified Tables
- `team_stats`: add `title_level` (integer, default 1) — current title rank (1-25)
- `team_stats`: add `title_xp` (integer, default 0) — progress points toward next title (0-9)
2. Security
- No policy changes needed; existing RLS policies already cover the new columns
*/

ALTER TABLE team_stats
  ADD COLUMN IF NOT EXISTS title_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS title_xp integer NOT NULL DEFAULT 0;
