-- Create invitation status enum first
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- Create speaker invitations table
CREATE TABLE speaker_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  message TEXT,
  proposed_rate INTEGER, -- Rate in cents
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- Default 7 day expiry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one invitation per speaker per event
  CONSTRAINT unique_speaker_event_invitation UNIQUE(event_id, speaker_id)
);

-- Create invitation history table for tracking status changes
CREATE TABLE speaker_invitation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES speaker_invitations(id) ON DELETE CASCADE,
  old_status invitation_status,
  new_status invitation_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on speaker_invitations
CREATE TRIGGER update_speaker_invitations_updated_at
  BEFORE UPDATE ON speaker_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to track invitation status changes
CREATE OR REPLACE FUNCTION track_invitation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO speaker_invitation_history (
      invitation_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.organizer_id -- Default to organizer, but can be updated in application logic
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to track status changes
CREATE TRIGGER track_invitation_status_change_trigger
  AFTER UPDATE ON speaker_invitations
  FOR EACH ROW
  EXECUTE FUNCTION track_invitation_status_change();

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE speaker_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create a function to get invitation statistics for an event
CREATE OR REPLACE FUNCTION get_invitation_stats(event_uuid UUID)
RETURNS TABLE (
  total_invitations BIGINT,
  pending_invitations BIGINT,
  accepted_invitations BIGINT,
  declined_invitations BIGINT,
  expired_invitations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'declined') as declined_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations
  FROM speaker_invitations
  WHERE event_id = event_uuid;
END;
$$ language 'plpgsql';

-- Create indexes for performance
CREATE INDEX idx_speaker_invitations_event_id ON speaker_invitations(event_id);
CREATE INDEX idx_speaker_invitations_speaker_id ON speaker_invitations(speaker_id);
CREATE INDEX idx_speaker_invitations_organizer_id ON speaker_invitations(organizer_id);
CREATE INDEX idx_speaker_invitations_status ON speaker_invitations(status);
CREATE INDEX idx_speaker_invitations_expires_at ON speaker_invitations(expires_at);
CREATE INDEX idx_speaker_invitation_history_invitation_id ON speaker_invitation_history(invitation_id);

-- Enable RLS (Row Level Security)
ALTER TABLE speaker_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_invitation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for speaker_invitations
-- Organizers can see all invitations for their events
CREATE POLICY "Organizers can view their event invitations" ON speaker_invitations
  FOR SELECT USING (
    organizer_id = auth.uid() OR
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Speakers can see invitations sent to them
CREATE POLICY "Speakers can view their invitations" ON speaker_invitations
  FOR SELECT USING (
    speaker_id IN (
      SELECT s.id FROM speakers s
      JOIN profiles p ON s.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Organizers can create invitations for their events
CREATE POLICY "Organizers can create invitations" ON speaker_invitations
  FOR INSERT WITH CHECK (
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Organizers can update their invitations
CREATE POLICY "Organizers can update their invitations" ON speaker_invitations
  FOR UPDATE USING (
    organizer_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Speakers can update invitations sent to them (to accept/decline)
CREATE POLICY "Speakers can update their invitations" ON speaker_invitations
  FOR UPDATE USING (
    speaker_id IN (
      SELECT s.id FROM speakers s
      JOIN profiles p ON s.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS Policies for speaker_invitation_history
-- Users can view history for invitations they're involved in
CREATE POLICY "Users can view invitation history" ON speaker_invitation_history
  FOR SELECT USING (
    invitation_id IN (
      SELECT id FROM speaker_invitations
      WHERE organizer_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      ) OR speaker_id IN (
        SELECT s.id FROM speakers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.user_id = auth.uid()
      )
    )
  );

-- Only system can insert into history (handled by triggers)
CREATE POLICY "System can insert invitation history" ON speaker_invitation_history
  FOR INSERT WITH CHECK (true);

-- Create a view for invitation details with related information
CREATE VIEW invitation_details AS
SELECT 
  i.id,
  i.event_id,
  i.organizer_id,
  i.speaker_id,
  i.message,
  i.proposed_rate,
  i.status,
  i.expires_at,
  i.created_at,
  i.updated_at,
  -- Event details
  e.title as event_title,
  e.description as event_description,
  e.date_time as event_date,
  e.location as event_location,
  e.event_type,
  e.format as event_format,
  -- Organizer details
  org.full_name as organizer_name,
  org.email as organizer_email,
  org.avatar_url as organizer_avatar,
  -- Speaker details
  sp_profile.full_name as speaker_name,
  sp_profile.email as speaker_email,
  sp_profile.avatar_url as speaker_avatar,
  sp_profile.bio as speaker_bio,
  sp.experience_level as speaker_experience,
  sp.hourly_rate as speaker_hourly_rate
FROM speaker_invitations i
JOIN events e ON i.event_id = e.id
JOIN profiles org ON i.organizer_id = org.id
JOIN speakers sp ON i.speaker_id = sp.id
JOIN profiles sp_profile ON sp.profile_id = sp_profile.id;

-- Comment on tables and columns
COMMENT ON TABLE speaker_invitations IS 'Tracks invitations sent by event organizers to speakers';
COMMENT ON COLUMN speaker_invitations.proposed_rate IS 'Proposed speaking rate in cents (e.g., 50000 = $500)';
COMMENT ON COLUMN speaker_invitations.expires_at IS 'When the invitation expires if not responded to';
COMMENT ON TABLE speaker_invitation_history IS 'Tracks all status changes for speaker invitations';
COMMENT ON VIEW invitation_details IS 'Comprehensive view of invitations with event, organizer, and speaker details';
