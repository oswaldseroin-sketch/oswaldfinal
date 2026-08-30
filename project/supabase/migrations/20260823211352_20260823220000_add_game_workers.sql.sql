/*
# Create shared game worker roster

1. New Tables
- `game_workers`
- `id` (uuid, primary key): roster record identifier.
- `name` (text, unique): displayed full name.
- `gender` (text): grammatical gender, either `м` or `ж`.
- `created_at` (timestamptz): creation time.

2. Security
- Enable RLS on `game_workers`.
- Allow shared anon and authenticated read/write access because this app has no sign-in; the visible admin lock controls the management screen.

3. Important Notes
- The initial roster is copied from the existing game roster.
- This roster is used by news, weekly worker, team life, predictions, and the secret room.
*/

CREATE TABLE IF NOT EXISTS public.game_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 2 AND 120),
  gender text NOT NULL CHECK (gender IN ('м', 'ж')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read game workers" ON public.game_workers;
CREATE POLICY "Public can read game workers" ON public.game_workers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can insert game workers" ON public.game_workers;
CREATE POLICY "Public can insert game workers" ON public.game_workers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update game workers" ON public.game_workers;
CREATE POLICY "Public can update game workers" ON public.game_workers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete game workers" ON public.game_workers;
CREATE POLICY "Public can delete game workers" ON public.game_workers FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.game_workers (name, gender) VALUES
  ('Шигапова З.М.', 'ж'), ('Дикая С.И.', 'ж'), ('Терлецкая Т.А.', 'ж'), ('Тимшин Д.С.', 'м'),
  ('Пономарева Е.Е.', 'ж'), ('Бенвовская Ю.С.', 'ж'), ('Билык И.Е.', 'ж'), ('Усенко А.Н.', 'м'),
  ('Шомесова Е.П.', 'ж'), ('Тарабукина Н.Б.', 'ж'), ('Майерс Н.А.', 'ж'), ('Пруткевич Е.Р.', 'м'),
  ('Гутче А.И.', 'ж'), ('Гаврилюк Е.В.', 'ж'), ('Карпюк О.В.', 'м'), ('Капустина О.Н.', 'ж'),
  ('Пруткевич О.В.', 'ж'), ('Гутче Н.С.', 'ж'), ('Батманов И.А.', 'м'), ('Заколодяжная И.В.', 'ж'),
  ('Усенко В.А.', 'м'), ('Кетова В.В.', 'ж'), ('Радина Е.А.', 'ж'), ('Красоцкая А.Н.', 'ж'),
  ('Шомесова Е.П.', 'ж')
ON CONFLICT (name) DO NOTHING;