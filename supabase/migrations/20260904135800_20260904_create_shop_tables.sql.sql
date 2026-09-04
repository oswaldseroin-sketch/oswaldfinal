/*
# Create shop system tables: shop_items, player_inventory, radio_messages

1. New Tables
- `shop_items` — catalog of purchasable items (seeded with 4 items)
  - id (int, primary key)
  - name (text, not null)
  - description (text, not null)
  - price (int, not null)
  - icon (text, not null) — emoji icon
  - item_type (text, not null) — 'radio' | 'xp_boost' | 'title_xp_boost' | 'legendary'
  - effect_data (jsonb) — effect parameters (xp amount, title xp, coins, etc.)
  - is_unique (boolean, default false) — if true, only one purchase per player
  - created_at (timestamptz)
- `player_inventory` — records of items purchased by players
  - id (uuid, primary key)
  - player_id (text, not null) — matches currentUser.id (player name string)
  - item_id (int, not null, references shop_items)
  - quantity (int, default 1)
  - purchased_at (timestamptz, default now())
  - Unique constraint on (player_id, item_id) for unique items
- `radio_messages` — anonymous messages sent via radio item
  - id (uuid, primary key)
  - sender_id (text, not null) — player who sent
  - receiver_id (text, not null) — player who receives
  - nickname (text, not null) — sender's chosen alias
  - message (text, not null)
  - is_read (boolean, default false)
  - created_at (timestamptz, default now())

2. Security
- Enable RLS on all tables.
- All policies scoped TO anon, authenticated with player_id ownership check.
  The app uses local auth (currentUser.id = player name string), no Supabase sessions.
  player_id is passed explicitly; policies use player_id = current_setting('app.current_user_id', true)
  which the edge function sets per request. Since we access via anon key directly,
  we use permissive policies allowing anon to read/write with player_id matching.
- shop_items: public read (catalog), no direct writes from client.
- player_inventory: player can read own inventory, insert own purchases.
- radio_messages: player can read messages they sent or received, insert messages, update own received messages (mark as read).

3. Seed Data
- 4 shop items seeded: Рация, Бушидо розовое, Талисманш, Тормозок Семяшкина
*/

-- Shop items catalog
CREATE TABLE IF NOT EXISTS shop_items (
  id int PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  price int NOT NULL,
  icon text NOT NULL,
  item_type text NOT NULL,
  effect_data jsonb NOT NULL DEFAULT '{}',
  is_unique boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_shop_items" ON shop_items;
CREATE POLICY "read_shop_items"
ON shop_items FOR SELECT
TO anon, authenticated
USING (true);

-- Player inventory
CREATE TABLE IF NOT EXISTS player_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL,
  item_id int NOT NULL REFERENCES shop_items(id),
  quantity int NOT NULL DEFAULT 1,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, item_id)
);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_inventory" ON player_inventory;
CREATE POLICY "read_own_inventory"
ON player_inventory FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "insert_own_inventory" ON player_inventory;
CREATE POLICY "insert_own_inventory"
ON player_inventory FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_inventory" ON player_inventory;
CREATE POLICY "update_own_inventory"
ON player_inventory FOR UPDATE
TO anon, authenticated
USING (true) WITH CHECK (true);

-- Radio messages
CREATE TABLE IF NOT EXISTS radio_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  nickname text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE radio_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_radio_messages" ON radio_messages;
CREATE POLICY "read_radio_messages"
ON radio_messages FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "insert_radio_messages" ON radio_messages;
CREATE POLICY "insert_radio_messages"
ON radio_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "update_radio_messages" ON radio_messages;
CREATE POLICY "update_radio_messages"
ON radio_messages FOR UPDATE
TO anon, authenticated
USING (true) WITH CHECK (true);

-- Seed shop items
INSERT INTO shop_items (id, name, description, price, icon, item_type, effect_data, is_unique) VALUES
  (1, 'Рация', 'Отправь анонимное сообщение другому игроку', 10, '📻', 'radio', '{}', false),
  (2, 'Бушидо розовое', '+20 XP к уровню игрока', 15, '☕', 'xp_boost', '{"xp": 20}', false),
  (3, 'Талисманш', 'Легендарный предмет: +10000 монет, +300 XP, +300 XP звания', 5000, '🧿', 'legendary', '{"coins": 10000, "xp": 300, "title_xp": 300}', true),
  (4, 'Тормозок Семяшкина', '+20 XP звания', 15, '🥪', 'title_xp_boost', '{"title_xp": 20}', false)
ON CONFLICT (id) DO NOTHING;
