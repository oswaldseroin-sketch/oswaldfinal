/*
# Create test_question_blocks table

1. Purpose
   Stores block assignments (1-4) for test questions that live in the external VPS backend.
   The VPS backend at api.serointeam.ru owns the test_questions table (question_id, text, options, correct_answer).
   We cannot add columns there, so block assignments are stored here in Supabase and merged on the frontend.

2. New Tables
   - test_question_blocks
     - question_id (text, primary key) — matches question_id in the VPS test_questions table
     - block_number (int, 1-4) — which user-facing block the question belongs to
     - updated_at (timestamptz)

3. Security
   - RLS enabled.
   - This is a no-auth app (no sign-in screen). Admin operations are gated by a password
     checked in the edge function, not by RLS. So anon+authenticated can read and write.
   - SELECT: anon+authenticated can read all rows (block assignments are public data needed to render the tests menu).
   - INSERT/UPDATE/DELETE: anon+authenticated can write (the edge function validates the admin password before writing).
*/
CREATE TABLE IF NOT EXISTS test_question_blocks (
  question_id  text PRIMARY KEY,
  block_number int  NOT NULL CHECK (block_number >= 1 AND block_number <= 4),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE test_question_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_test_blocks" ON test_question_blocks;
CREATE POLICY "anon_select_test_blocks" ON test_question_blocks
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_test_blocks" ON test_question_blocks;
CREATE POLICY "anon_insert_test_blocks" ON test_question_blocks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_test_blocks" ON test_question_blocks;
CREATE POLICY "anon_update_test_blocks" ON test_question_blocks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_test_blocks" ON test_question_blocks;
CREATE POLICY "anon_delete_test_blocks" ON test_question_blocks
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_test_blocks_block_number ON test_question_blocks (block_number);
