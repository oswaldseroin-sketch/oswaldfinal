/*
# Create employees and memes tables (single-tenant, no auth)

1. New Tables
- `employees`
  - `id` (uuid, primary key)
  - `full_name` (text, not null) — ФИО сотрудника
  - `organization` (text, not null) — Организация
  - `access_date` (date, not null) — Дата допуска
  - `created_at` (timestamptz)
- `memes`
  - `id` (uuid, primary key)
  - `description` (text, not null) — Текст описания мема
  - `image_url` (text, nullable) — Ссылка на картинку URL
  - `created_at` (timestamptz)
2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD because the app is intentionally shared/public
  (admin access is gated by a client-side password lock, not Supabase auth).
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  organization text NOT NULL,
  access_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees
  FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE memes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_memes" ON memes;
CREATE POLICY "anon_select_memes" ON memes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_memes" ON memes;
CREATE POLICY "anon_insert_memes" ON memes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_memes" ON memes;
CREATE POLICY "anon_update_memes" ON memes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_memes" ON memes;
CREATE POLICY "anon_delete_memes" ON memes
  FOR DELETE TO anon, authenticated USING (true);
