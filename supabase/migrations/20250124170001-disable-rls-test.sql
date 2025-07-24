-- Simple fix: temporarily disable RLS on speaker_invitations to test
-- This will help us determine if the issue is with RLS policies or table naming

-- Disable RLS temporarily for testing
ALTER TABLE speaker_invitations DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE speaker_invitations IS 'RLS temporarily disabled for testing invitation creation.';
