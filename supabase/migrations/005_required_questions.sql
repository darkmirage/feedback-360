-- Add required flag to questions
ALTER TABLE questions ADD COLUMN is_required boolean NOT NULL DEFAULT false;
