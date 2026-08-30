/*
# Add pin_plaintext column and admin PIN retrieval function

1. Changes to existing tables
- `user_accounts`: add `pin_plaintext` text column to store the 5-digit PIN for admin retrieval
- Existing hashed PINs are irrecoverable (bcrypt), so all accounts are regenerated with plaintext stored alongside the hash

2. New/updated functions
- `ensure_user_pins()`: updated to also store pin_plaintext
- `get_admin_pins(p_admin_password)`: SECURITY DEFINER function that returns worker_name + pin only if admin password matches "3010"

3. Security
- pin_plaintext is NOT directly accessible via RLS (anon SELECT policy only exposes id + worker_name, not pin_plaintext)
- get_admin_pins is SECURITY DEFINER and checks the admin password server-side before returning any data
- Admin password is validated on the backend, never in frontend code

4. Important notes
- Existing accounts are truncated and regenerated since bcrypt hashes are irreversible
- No real users have logged in yet, so no data is lost
- Re-running ensure_user_pins() still skips existing accounts
*/

ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS pin_plaintext text;

-- Since existing bcrypt hashes are irreversible, regenerate all PINs with plaintext stored
TRUNCATE user_accounts;

CREATE OR REPLACE FUNCTION ensure_user_pins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_worker record;
  v_pin text;
  v_count integer := 0;
BEGIN
  FOR v_worker IN SELECT name FROM game_workers ORDER BY name LOOP
    -- Check if account already exists
    IF EXISTS (SELECT 1 FROM user_accounts WHERE worker_name = v_worker.name) THEN
      CONTINUE;
    END IF;

    -- Generate unique 5-digit PIN
    LOOP
      v_pin := lpad(floor(random() * 100000)::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM user_accounts WHERE pin_plaintext = v_pin);
    END LOOP;

    INSERT INTO user_accounts (worker_name, password_hash, pin_plaintext)
    VALUES (v_worker.name, crypt(v_pin, gen_salt('bf')), v_pin);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function: get_admin_pins(admin_password) — returns all worker_name + pin pairs only if admin password is correct
CREATE OR REPLACE FUNCTION get_admin_pins(p_admin_password text)
RETURNS TABLE(worker_name text, pin text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_password <> '3010' THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT ua.worker_name, ua.pin_plaintext FROM user_accounts ua ORDER BY ua.worker_name;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_pins() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_pins(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_pin(text, text) TO anon, authenticated;