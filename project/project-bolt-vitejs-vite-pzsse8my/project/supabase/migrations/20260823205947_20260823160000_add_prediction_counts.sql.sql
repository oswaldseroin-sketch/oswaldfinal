/*
# Add shared prediction statistics

1. New Tables
- `prediction_counts`
- `name` (text, primary key): employee name used for a prediction.
- `count` (integer): total number of predictions revealed for that name.
- `updated_at` (timestamptz): last time the count changed.

2. Security
- Enable row level security on `prediction_counts`.
- Allow public read access because the statistics are intentionally shared.
- Keep direct writes unavailable to the browser and expose one atomic counter function.

3. Functions
- `increment_prediction_count(text)`: atomically increments the selected name's counter.

4. Important Notes
- The app has no sign-in screen, so the public anon role can read statistics and call the narrowly validated counter function.
- The counter is stored in Supabase and is shared across browsers and reloads.
*/

CREATE TABLE IF NOT EXISTS public.prediction_counts (
  name text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read prediction counts" ON public.prediction_counts;
CREATE POLICY "Public can read prediction counts"
ON public.prediction_counts FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert prediction counts" ON public.prediction_counts;
CREATE POLICY "Public can insert prediction counts"
ON public.prediction_counts FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Public can update prediction counts" ON public.prediction_counts;
CREATE POLICY "Public can update prediction counts"
ON public.prediction_counts FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Public can delete prediction counts" ON public.prediction_counts;
CREATE POLICY "Public can delete prediction counts"
ON public.prediction_counts FOR DELETE
TO anon, authenticated
USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.prediction_counts FROM anon, authenticated;
GRANT SELECT ON public.prediction_counts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_prediction_count(p_name text)
RETURNS public.prediction_counts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.prediction_counts;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 1 OR length(trim(p_name)) > 120 THEN
    RAISE EXCEPTION 'Invalid prediction name';
  END IF;

  INSERT INTO public.prediction_counts (name, count, updated_at)
  VALUES (trim(p_name), 1, now())
  ON CONFLICT (name)
  DO UPDATE SET count = public.prediction_counts.count + 1, updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_prediction_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_prediction_count(text) TO anon, authenticated;