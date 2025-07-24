-- Fix the foreign key reference for organizer_id in event_invitations table
-- It should reference profiles(id) not profiles(user_id) to match the events table

ALTER TABLE event_invitations DROP CONSTRAINT event_invitations_organizer_id_fkey;

ALTER TABLE event_invitations ADD CONSTRAINT event_invitations_organizer_id_fkey 
  FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
