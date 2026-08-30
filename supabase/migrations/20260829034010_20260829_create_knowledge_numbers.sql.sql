/*
# Create knowledge_numbers table for "Числа" panel inside "Знания"

1. New Tables
- `knowledge_numbers`
  - `id` (serial, primary key)
  - `number` (int, unique, 1-31) — the number identifier
  - `content` (text, default empty string) — the text stored by admin
  - `updated_at` (timestamptz, auto-updated on change)

2. Seed Data
- 31 rows (number 1 through 31), each with empty content.

3. Security
- Enable RLS on `knowledge_numbers`.
- SELECT: allow anon + authenticated (all app users can read).
- INSERT/UPDATE/DELETE: blocked for anon/authenticated via RLS.
  Updates are performed only through an edge function using the service role key,
  which bypasses RLS. The edge function verifies the admin password (3010) before updating.
*/

CREATE TABLE IF NOT EXISTS knowledge_numbers (
  id serial PRIMARY KEY,
  number int NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_numbers ENABLE ROW LEVEL SECURITY;

-- Seed 31 rows if they don't exist
INSERT INTO knowledge_numbers (number, content)
SELECT i, ''
FROM generate_series(1, 31) AS i
WHERE NOT EXISTS (SELECT 1 FROM knowledge_numbers kn WHERE kn.number = i);

-- SELECT: anyone can read
DROP POLICY IF EXISTS "read_knowledge_numbers" ON knowledge_numbers;
CREATE POLICY "read_knowledge_numbers"
ON knowledge_numbers FOR SELECT
TO anon, authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated — only the edge function
-- (using the service role key) can modify data.
