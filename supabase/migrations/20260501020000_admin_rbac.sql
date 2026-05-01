DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('owner', 'editor', 'viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_user_status') THEN
    CREATE TYPE admin_user_status AS ENUM ('active', 'disabled');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  status admin_user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_email_not_blank CHECK (btrim(email) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx ON admin_users (lower(email));
CREATE INDEX IF NOT EXISTS admin_users_status_role_idx ON admin_users (status, role);

CREATE OR REPLACE FUNCTION set_admin_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(NEW.email);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_users_updated_at ON admin_users;
CREATE TRIGGER set_admin_users_updated_at
BEFORE INSERT OR UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION set_admin_users_updated_at();

CREATE OR REPLACE FUNCTION link_admin_user_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.admin_users
  SET auth_user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND (auth_user_id IS NULL OR auth_user_id = NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_admin_user_auth_user ON auth.users;
CREATE TRIGGER link_admin_user_auth_user
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_admin_user_auth_user();

INSERT INTO admin_users (email, auth_user_id, role, status)
SELECT
  'hieplevuc@gmail.com',
  (
    SELECT id
    FROM auth.users
    WHERE lower(email) = 'hieplevuc@gmail.com'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  'owner',
  'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_users
  WHERE lower(email) = 'hieplevuc@gmail.com'
);

UPDATE admin_users
SET
  role = 'owner',
  status = 'active',
  auth_user_id = COALESCE(
    auth_user_id,
    (
      SELECT id
      FROM auth.users
      WHERE lower(email) = 'hieplevuc@gmail.com'
      ORDER BY created_at DESC
      LIMIT 1
    )
  )
WHERE lower(email) = 'hieplevuc@gmail.com';

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
