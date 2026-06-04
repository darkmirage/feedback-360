-- ============================================
-- Global team roster (people table)
-- ============================================

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "people_select" ON people FOR SELECT USING (true);
CREATE POLICY "people_insert" ON people FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "people_update" ON people FOR UPDATE USING (is_admin());
CREATE POLICY "people_delete" ON people FOR DELETE USING (is_admin());

-- Index for email lookups
CREATE INDEX idx_people_email ON people(email);

-- Backfill from existing users
INSERT INTO people (email, first_name, last_name)
SELECT
  LOWER(email),
  SPLIT_PART(full_name, ' ', 1),
  CASE
    WHEN POSITION(' ' IN full_name) > 0
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE ''
  END
FROM users
ON CONFLICT (email) DO NOTHING;

-- Update handle_new_user trigger to also upsert into people
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  _full_name text;
  _first text;
  _last text;
BEGIN
  _full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email);
  _first := SPLIT_PART(_full_name, ' ', 1);
  _last := CASE
    WHEN POSITION(' ' IN _full_name) > 0
    THEN SUBSTRING(_full_name FROM POSITION(' ' IN _full_name) + 1)
    ELSE ''
  END;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (new.id, LOWER(new.email), _full_name, 'user');

  INSERT INTO public.people (email, first_name, last_name)
  VALUES (LOWER(new.email), _first, _last)
  ON CONFLICT (email) DO UPDATE SET
    first_name = CASE WHEN people.first_name = '' THEN EXCLUDED.first_name ELSE people.first_name END,
    last_name = CASE WHEN people.last_name = '' THEN EXCLUDED.last_name ELSE people.last_name END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate assignment_details view using people table for names
DROP VIEW IF EXISTS assignment_details;
CREATE VIEW assignment_details AS
SELECT
  ra.id,
  ra.review_cycle_id,
  ra.reviewer_email,
  ra.subject_email,
  ra.relationship,
  ra.completed_at,
  ra.created_at,
  NULLIF(TRIM(r.first_name || ' ' || r.last_name), '') AS reviewer_name,
  NULLIF(TRIM(s.first_name || ' ' || s.last_name), '') AS subject_name
FROM review_assignments ra
LEFT JOIN people r ON r.email = ra.reviewer_email
LEFT JOIN people s ON s.email = ra.subject_email;
