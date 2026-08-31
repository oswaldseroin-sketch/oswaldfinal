/*
# Create Fludilka chat tables

1. New Tables
- `chat_messages`: stores all chat messages
  - id (uuid PK)
  - user_id (text, not null) — device identifier from localStorage
  - nickname (text, not null) — daily anonymous nickname
  - message (text, not null, max 300 chars)
  - chat_day (date, not null) — which calendar day this message belongs to
  - created_at (timestamptz, default now())
- `chat_nicks`: tracks daily nickname assignments
  - id (uuid PK)
  - user_id (text, not null) — device identifier
  - nickname (text, not null) — assigned nickname
  - chat_day (date, not null) — which day this assignment is for
  - created_at (timestamptz, default now())
  - UNIQUE constraint on (nickname, chat_day) — one nick per day
  - UNIQUE constraint on (user_id, chat_day) — one user gets one nick per day

2. Security
- RLS enabled on both tables
- This is a no-auth app (no sign-in screen), so policies use TO anon, authenticated
- chat_messages: anyone can read (shared chat), anyone can insert (with length check)
- chat_nicks: anyone can read (to check availability), anyone can insert (assignment)
- No update or delete policies needed
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nickname text NOT NULL,
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 300),
  chat_day date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_nicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nickname text NOT NULL,
  chat_day date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_nicks_nick_day_unique UNIQUE (nickname, chat_day),
  CONSTRAINT chat_nicks_user_day_unique UNIQUE (user_id, chat_day)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_day_created ON chat_messages (chat_day, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_nicks_day ON chat_nicks (chat_day);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_nicks ENABLE ROW LEVEL SECURITY;

-- chat_messages policies
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- chat_nicks policies
DROP POLICY IF EXISTS "anon_select_chat_nicks" ON chat_nicks;
CREATE POLICY "anon_select_chat_nicks" ON chat_nicks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_nicks" ON chat_nicks;
CREATE POLICY "anon_insert_chat_nicks" ON chat_nicks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
