-- Create event_invitations table to track invitations from organizers to speakers
CREATE TABLE event_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  message TEXT,
  offered_rate INTEGER, -- Rate in cents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique invitation per speaker per event
  UNIQUE(event_id, speaker_id)
);

-- Add RLS policies
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;

-- Organizers can create invitations for their own events
CREATE POLICY "Organizers can create invitations for their events" ON event_invitations
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_invitations.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can view invitations for their events
CREATE POLICY "Organizers can view their event invitations" ON event_invitations
  FOR SELECT USING (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_invitations.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- Speakers can view invitations sent to them
CREATE POLICY "Speakers can view their invitations" ON event_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM speakers 
      WHERE speakers.id = event_invitations.speaker_id 
      AND speakers.profile_id = auth.uid()
    )
  );

-- Speakers can update their own invitations (accept/decline)
CREATE POLICY "Speakers can update their invitations" ON event_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM speakers 
      WHERE speakers.id = event_invitations.speaker_id 
      AND speakers.profile_id = auth.uid()
    )
  );

-- Organizers can update invitations for their events
CREATE POLICY "Organizers can update their event invitations" ON event_invitations
  FOR UPDATE USING (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_invitations.event_id 
      AND events.organizer_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_event_invitations_event_id ON event_invitations(event_id);
CREATE INDEX idx_event_invitations_speaker_id ON event_invitations(speaker_id);
CREATE INDEX idx_event_invitations_organizer_id ON event_invitations(organizer_id);
CREATE INDEX idx_event_invitations_status ON event_invitations(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_event_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_invitations_updated_at
  BEFORE UPDATE ON event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_invitations_updated_at();
