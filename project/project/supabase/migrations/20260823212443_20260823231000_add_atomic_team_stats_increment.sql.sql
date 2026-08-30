/* Atomic global counter updates for the no-auth shared app. */

CREATE OR REPLACE FUNCTION public.adjust_team_stats(
  p_worker_name text,
  p_weight integer DEFAULT 0,
  p_happiness integer DEFAULT 0,
  p_balance integer DEFAULT 0
)
RETURNS public.team_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.team_stats;
BEGIN
  IF p_worker_name IS NULL OR length(trim(p_worker_name)) = 0 THEN
    RAISE EXCEPTION 'worker name is required';
  END IF;

  INSERT INTO public.team_stats (worker_name, weight, happiness, balance)
  VALUES (p_worker_name, p_weight, p_happiness, p_balance)
  ON CONFLICT (worker_name) DO UPDATE SET
    weight = public.team_stats.weight + EXCLUDED.weight,
    happiness = public.team_stats.happiness + EXCLUDED.happiness,
    balance = public.team_stats.balance + EXCLUDED.balance,
    updated_at = now()
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_team_stats(text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_team_stats(text, integer, integer, integer) TO anon, authenticated;