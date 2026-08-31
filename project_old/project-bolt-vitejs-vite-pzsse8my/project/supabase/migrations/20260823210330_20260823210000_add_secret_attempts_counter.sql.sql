/*
# Add shared secret room entry attempt counter

1. New Tables
- `secret_attempts`
- `id` (int, primary key, always 1): singleton row.
- `attempts` (integer): total number of key-click attempts on the secret door.
- `updated_at` (timestamptz): last time the counter changed.

2. Security
- Enable row level security on `secret_attempts`.
- Allow public read because the counter is intentionally shared.
- Block direct writes from the browser; expose one atomic increment function.

3. Functions
- `increment_secret_attempt()`: atomically increments the singleton counter and returns the new value.

4. Important Notes
- The app has no sign-in screen, so the public anon role can read the counter and call the narrowly validated increment function.
- The counter is stored in Supabase and is shared across browsers and reloads.
*/

CREATE TABLE IF NOT EXISTS public.secret_attempts (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.secret_attempts (id, attempts)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.secret_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read secret attempts" ON public.secret_attempts;
CREATE POLICY "Public can read secret attempts"
ON public.secret_attempts FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert secret attempts" ON public.secret_attempts;
CREATE POLICY "Public can insert secret attempts"
ON public.secret_attempts FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Public can update secret attempts" ON public.secret_attempts;
CREATE POLICY "Public can update secret attempts"
ON public.secret_attempts FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Public can delete secret attempts" ON public.secret_attempts;
CREATE POLICY "Public can delete secret attempts"
ON public.secret_attempts FOR DELETE
TO anon, authenticated
USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.secret_attempts FROM anon, authenticated;
GRANT SELECT ON public.secret_attempts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_secret_attempt()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_value integer;
BEGIN
  INSERT INTO public.secret_attempts (id, attempts, updated_at)
  VALUES (1, 1, now())
  ON CONFLICT (id)
  DO UPDATE SET attempts = public.secret_attempts.attempts + 1, updated_at = now()
  RETURNING attempts INTO new_value;

  RETURN new_value;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_secret_attempt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_secret_attempt() TO anon, authenticated;