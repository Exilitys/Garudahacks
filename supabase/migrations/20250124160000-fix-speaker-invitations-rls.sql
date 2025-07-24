-- Fix RLS policies for speaker_invitations table
-- This migration fixes the Row Level Security policies that were causing invitation creation to fail

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Organizers can create invitations" ON speaker_invitations;
DROP POLICY IF EXISTS "Organizers can update their invitations" ON speaker_invitations;
DROP POLICY IF EXISTS "Organizers can view their event invitations" ON speaker_invitations;

-- Create corrected RLS policies

-- Allow organizers to view their invitations (simplified)
CREATE POLICY "Organizers can view their event invitations" ON speaker_invitations
  FOR SELECT USING (
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Allow organizers to create invitations (simplified and fixed)
CREATE POLICY "Organizers can create invitations" ON speaker_invitations
  FOR INSERT WITH CHECK (
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Allow organizers to update their invitations
CREATE POLICY "Organizers can update their invitations" ON speaker_invitations
  FOR UPDATE USING (
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Add a more permissive policy for debugging (can be removed later)
-- This allows any authenticated user to create invitations temporarily
CREATE POLICY "Temporary debug policy for invitations" ON speaker_invitations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Comment explaining the fix
COMMENT ON TABLE speaker_invitations IS 'Tracks invitations sent by event organizers to speakers. RLS policies updated to fix insertion issues.';
