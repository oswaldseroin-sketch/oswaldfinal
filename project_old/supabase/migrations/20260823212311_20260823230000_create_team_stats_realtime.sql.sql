/*
# Create global team_stats table with realtime

1. New Tables
- `team_stats`
  - `worker_name` (text, primary key): references game_workers.name
  - `weight` (int, default 0): global weight counter in kg
  - `happiness` (int, default 0): global happiness counter
  - `balance` (int, default 0): global balance counter in rubles
  - `updated_at` (timestamptz): last modification time

2. Security
- Enable RLS on `team_stats`.
- Allow shared anon + authenticated CRUD (no-auth app, admin lock is client-side).

3. Realtime
- Add table to the `supabase_realtime` publication so all users see live updates.

4. Seed
- Insert one row per existing game_workers entry with zeros.
*/

CREATE TABLE IF NOT EXISTS public.team_stats (
  worker_name text PRIMARY KEY REFERENCES public.game_workers(name) ON DELETE CASCADE,
  weight int NOT NULL DEFAULT 0,
  happiness int NOT NULL DEFAULT 0,
  balance int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read team stats" ON public.team_stats;
CREATE POLICY "Public can read team stats" ON public.team_stats
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can insert team stats" ON public.team_stats;
CREATE POLICY "Public can insert team stats" ON public.team_stats
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update team stats" ON public.team_stats;
CREATE POLICY "Public can update team stats" ON public.team_stats
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete team stats" ON public.team_stats;
CREATE POLICY "Public can delete team stats" ON public.team_stats
  FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.team_stats (worker_name, weight, happiness, balance)
SELECT name, 0, 0, 0 FROM public.game_workers
ON CONFLICT (worker_name) DO NOTHING;

ALTER TABLE public.team_stats REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_stats;
  END IF;
END $$;

-- Also add game_workers and employees to realtime for live sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_workers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_workers;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'employees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'memes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memes;
  END IF;
END $$;