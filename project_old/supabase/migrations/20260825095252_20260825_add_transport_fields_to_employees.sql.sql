/*
# Add transport support fields to employees table

1. Modified Tables
- `employees`: add `record_type` (text, default 'person') to distinguish people from vehicles
- `employees`: add `vehicle_type` (text, nullable) for vehicle type description (e.g. "Автокран")
2. New Tables
- `import_log`: tracks which Google Sheet imports have been performed (idempotency)
  - `id` (uuid, primary key)
  - `source_key` (text, unique) — identifies the specific Google Sheet
  - `row_count` (int) — number of rows imported
  - `imported_at` (timestamptz)
3. Security
- `employees` already has RLS enabled with anon/authenticated CRUD policies
- `import_log`: enable RLS, allow anon+authenticated read (to check if import done), no write from frontend (write only via service role)
*/

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS vehicle_type text;

CREATE TABLE IF NOT EXISTS import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text UNIQUE NOT NULL,
  row_count integer NOT NULL,
  imported_at timestamptz DEFAULT now()
);

ALTER TABLE import_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_import_log" ON import_log;
CREATE POLICY "anon_read_import_log" ON import_log FOR SELECT
  TO anon, authenticated USING (true);
