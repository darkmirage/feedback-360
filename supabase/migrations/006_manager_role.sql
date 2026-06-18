-- ============================================
-- Add manager role for cycle-scoped ownership
-- ============================================

-- Step 1: Add 'manager' to user_role enum
ALTER TYPE user_role ADD VALUE 'manager';

-- Step 2: Helper function — is current user admin or manager?
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 3: Helper function — does current user own this cycle?
-- Returns true for admins (any cycle) or managers (own cycles only)
CREATE OR REPLACE FUNCTION is_cycle_owner(cycle_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
  OR EXISTS(
    SELECT 1 FROM users u
    JOIN review_cycles rc ON rc.created_by = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'manager'
      AND rc.id = cycle_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 4: Update review_cycles policies
DROP POLICY IF EXISTS "cycles_insert" ON review_cycles;
DROP POLICY IF EXISTS "cycles_update" ON review_cycles;
DROP POLICY IF EXISTS "cycles_delete" ON review_cycles;

CREATE POLICY "cycles_insert" ON review_cycles FOR INSERT
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "cycles_update" ON review_cycles FOR UPDATE
  USING (is_cycle_owner(id));

CREATE POLICY "cycles_delete" ON review_cycles FOR DELETE
  USING (is_cycle_owner(id));

-- Step 5: Update questions policies
DROP POLICY IF EXISTS "questions_insert" ON questions;
DROP POLICY IF EXISTS "questions_update" ON questions;
DROP POLICY IF EXISTS "questions_delete" ON questions;

CREATE POLICY "questions_insert" ON questions FOR INSERT
  WITH CHECK (is_cycle_owner(review_cycle_id));

CREATE POLICY "questions_update" ON questions FOR UPDATE
  USING (is_cycle_owner(review_cycle_id));

CREATE POLICY "questions_delete" ON questions FOR DELETE
  USING (is_cycle_owner(review_cycle_id));

-- Step 6: Update review_assignments policies
DROP POLICY IF EXISTS "assignments_select" ON review_assignments;
DROP POLICY IF EXISTS "assignments_insert" ON review_assignments;
DROP POLICY IF EXISTS "assignments_update" ON review_assignments;
DROP POLICY IF EXISTS "assignments_delete" ON review_assignments;

CREATE POLICY "assignments_select" ON review_assignments FOR SELECT USING (
  reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
  OR is_cycle_owner(review_cycle_id)
);

CREATE POLICY "assignments_insert" ON review_assignments FOR INSERT
  WITH CHECK (is_cycle_owner(review_cycle_id));

CREATE POLICY "assignments_update" ON review_assignments FOR UPDATE
  USING (is_cycle_owner(review_cycle_id));

CREATE POLICY "assignments_delete" ON review_assignments FOR DELETE
  USING (is_cycle_owner(review_cycle_id));

-- Recreate reviewer self-update policy (from migration 004)
CREATE POLICY "reviewer_update_own" ON review_assignments FOR UPDATE USING (
  reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
);

-- Step 7: Update responses select policy to allow cycle owners
DROP POLICY IF EXISTS "responses_select" ON responses;

CREATE POLICY "responses_select" ON responses FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM review_assignments ra
    WHERE ra.id = responses.assignment_id
    AND (
      ra.reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
      OR is_cycle_owner(ra.review_cycle_id)
    )
  )
);
