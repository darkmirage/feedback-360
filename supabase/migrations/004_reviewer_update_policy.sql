-- Allow reviewers to update their own assignments (e.g. setting completed_at)
CREATE POLICY "assignments_update_own" ON review_assignments
  FOR UPDATE USING (
    reviewer_email = (SELECT LOWER(email) FROM users WHERE id = auth.uid())
  );
