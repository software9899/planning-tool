-- Add readiness_checklist column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS readiness_checklist JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.readiness_checklist IS 'Array of checklist items with id, text, and checked fields';
