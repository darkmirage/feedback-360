-- ============================================
-- Migrate review_assignments from UUID FKs to email-based columns
-- ============================================

-- Step 1: Add email columns
ALTER TABLE review_assignments ADD COLUMN reviewer_email text;
ALTER TABLE review_assignments ADD COLUMN subject_email text;

-- Step 2: Backfill from existing users
UPDATE review_assignments ra
SET reviewer_email = LOWER(u.email)
FROM users u
WHERE u.id = ra.reviewer_id;

UPDATE review_assignments ra
SET subject_email = LOWER(u.email)
FROM users u
WHERE u.id = ra.subject_id;

-- Step 3: Make email columns NOT NULL
ALTER TABLE review_assignments ALTER COLUMN reviewer_email SET NOT NULL;
ALTER TABLE review_assignments ALTER COLUMN subject_email SET NOT NULL;

-- Step 4: Drop ALL old RLS policies that reference reviewer_id/subject_id BEFORE dropping columns
DROP POLICY IF EXISTS "assignments_select" ON review_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON review_assignments;
DROP POLICY IF EXISTS "assignments_update" ON review_assignments;
DROP POLICY IF EXISTS "assignments_delete" ON review_assignments;
DROP POLICY IF EXISTS "responses_select" ON responses;
DROP POLICY IF EXISTS "responses_insert" ON responses;
DROP POLICY IF EXISTS "responses_update" ON responses;

-- Step 5: Drop old constraints, indexes, and columns
DROP INDEX IF EXISTS idx_assignments_reviewer;
DROP INDEX IF EXISTS idx_assignments_subject;
ALTER TABLE review_assignments DROP CONSTRAINT IF EXISTS review_assignments_review_cycle_id_reviewer_id_subject_id_key;
ALTER TABLE review_assignments DROP COLUMN reviewer_id;
ALTER TABLE review_assignments DROP COLUMN subject_id;

-- Step 5: Add new constraints and indexes
ALTER TABLE review_assignments ADD CONSTRAINT review_assignments_cycle_reviewer_subject_key
  UNIQUE(review_cycle_id, reviewer_email, subject_email);
CREATE INDEX idx_assignments_reviewer_email ON review_assignments(reviewer_email);
CREATE INDEX idx_assignments_subject_email ON review_assignments(subject_email);

-- Step 6: Normalize emails in handle_new_user trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    LOWER(new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create view for resolved names
CREATE OR REPLACE VIEW assignment_details AS
SELECT
  ra.id,
  ra.review_cycle_id,
  ra.reviewer_email,
  ra.subject_email,
  ra.relationship,
  ra.completed_at,
  ra.created_at,
  r.id AS reviewer_user_id,
  r.full_name AS reviewer_name,
  s.id AS subject_user_id,
  s.full_name AS subject_name
FROM review_assignments ra
LEFT JOIN users r ON LOWER(r.email) = ra.reviewer_email
LEFT JOIN users s ON LOWER(s.email) = ra.subject_email;

-- Step 8: Recreate RLS policies for email-based access

CREATE POLICY "assignments_select" ON review_assignments FOR SELECT USING (
  reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
  OR is_admin()
);
CREATE POLICY "assignments_insert" ON review_assignments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "assignments_update" ON review_assignments FOR UPDATE USING (is_admin());
CREATE POLICY "assignments_delete" ON review_assignments FOR DELETE USING (is_admin());

-- Responses policies (chain through assignments via email)
CREATE POLICY "responses_select" ON responses FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM review_assignments ra
    WHERE ra.id = responses.assignment_id
    AND (
      ra.reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
      OR is_admin()
    )
  )
);

CREATE POLICY "responses_insert" ON responses FOR INSERT WITH CHECK (
  EXISTS(
    SELECT 1 FROM review_assignments ra
    JOIN review_cycles rc ON rc.id = ra.review_cycle_id
    WHERE ra.id = assignment_id
    AND ra.reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
    AND rc.status = 'active'
  )
);

CREATE POLICY "responses_update" ON responses FOR UPDATE USING (
  EXISTS(
    SELECT 1 FROM review_assignments ra
    JOIN review_cycles rc ON rc.id = ra.review_cycle_id
    WHERE ra.id = responses.assignment_id
    AND ra.reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
    AND rc.status = 'active'
  )
);
