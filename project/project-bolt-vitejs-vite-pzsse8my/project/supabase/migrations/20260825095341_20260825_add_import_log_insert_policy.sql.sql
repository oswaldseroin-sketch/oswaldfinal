/*
# Add INSERT policy to import_log for anon role

1. Security
- Allow anon+authenticated to INSERT into import_log so the frontend import can record completion
*/

DROP POLICY IF EXISTS "anon_insert_import_log" ON import_log;
CREATE POLICY "anon_insert_import_log" ON import_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
