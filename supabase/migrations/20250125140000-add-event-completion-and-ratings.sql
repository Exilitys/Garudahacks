-- Add event completion and rating system functionality
-- This migration adds:
-- 1. Event completion tracking
-- 2. Speaker rating system 
-- 3. Speaker statistics
-- 4. Payment release functionality

-- Add completion tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completed_by_organizer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_by_speaker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_released BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMPTZ;

-- Add rating fields to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS organizer_rating INTEGER CHECK (organizer_rating >= 1 AND organizer_rating <= 5),
ADD COLUMN IF NOT EXISTS organizer_feedback TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add statistics to speakers table
ALTER TABLE public.speakers 
ADD COLUMN IF NOT EXISTS total_events_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0, -- in cents
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Create function to check if event completion conditions are met
CREATE OR REPLACE FUNCTION check_event_completion()
RETURNS TRIGGER AS $$
DECLARE
  event_date TIMESTAMPTZ;
  is_event_passed BOOLEAN := FALSE;
BEGIN
  -- Get event date
  SELECT e.date_time INTO event_date
  FROM events e
  WHERE e.id = NEW.event_id;
  
  -- Check if event has passed (including some buffer time)
  is_event_passed := (event_date + INTERVAL '2 hours') < NOW();
  
  -- If both organizer and speaker have marked complete, and event has passed
  IF NEW.completed_by_organizer = TRUE AND 
     NEW.completed_by_speaker = TRUE AND 
     is_event_passed AND 
     OLD.completed_at IS NULL THEN
    
    -- Mark completion timestamp
    NEW.completed_at := NOW();
    
    -- Update booking status to completed
    NEW.status := 'completed';
    
    -- Release payment if it was paid
    IF NEW.payment_status = 'paid' AND NEW.payment_released = FALSE THEN
      NEW.payment_released := TRUE;
      NEW.payment_released_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event completion
DROP TRIGGER IF EXISTS booking_completion_trigger ON bookings;
CREATE TRIGGER booking_completion_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_event_completion();

-- Create function to update speaker statistics when booking is completed
CREATE OR REPLACE FUNCTION update_speaker_stats()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  total_rating_count INTEGER;
BEGIN
  -- Only update stats when booking moves to completed status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update total events completed
    UPDATE speakers 
    SET total_events_completed = total_events_completed + 1
    WHERE id = NEW.speaker_id;
    
    -- Update total earnings if payment was released
    IF NEW.payment_released = TRUE THEN
      UPDATE speakers 
      SET total_earnings = total_earnings + COALESCE(NEW.payment_amount, 0)
      WHERE id = NEW.speaker_id;
    END IF;
  END IF;
  
  -- Update rating statistics when organizer rating is added
  IF NEW.organizer_rating IS NOT NULL AND OLD.organizer_rating IS NULL THEN
    -- Calculate new average rating and total count
    SELECT 
      ROUND(AVG(b.organizer_rating)::NUMERIC, 2),
      COUNT(b.organizer_rating)
    INTO avg_rating, total_rating_count
    FROM bookings b
    WHERE b.speaker_id = NEW.speaker_id 
      AND b.organizer_rating IS NOT NULL;
    
    -- Update speaker statistics
    UPDATE speakers 
    SET 
      average_rating = avg_rating,
      total_ratings = total_rating_count
    WHERE id = NEW.speaker_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for speaker statistics updates
DROP TRIGGER IF EXISTS speaker_stats_trigger ON bookings;
CREATE TRIGGER speaker_stats_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_stats();

-- Create function for organizers to mark event as completed
CREATE OR REPLACE FUNCTION mark_event_completed_by_organizer(
  booking_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  event_date TIMESTAMPTZ;
  is_authorized BOOLEAN := FALSE;
  current_status TEXT;
BEGIN
  -- Check if user is authorized (is the organizer of the event)
  SELECT 
    e.date_time,
    (e.organizer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())),
    b.status
  INTO event_date, is_authorized, current_status
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  WHERE b.id = booking_id_param;
  
  -- Check authorization and event status
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Only the event organizer can mark completion';
  END IF;
  
  IF current_status != 'paid' THEN
    RAISE EXCEPTION 'Event must be in paid status before completion';
  END IF;
  
  -- Check if event has passed (with some buffer time)
  IF (event_date + INTERVAL '2 hours') > NOW() THEN
    RAISE EXCEPTION 'Event has not yet concluded';
  END IF;
  
  -- Mark as completed by organizer
  UPDATE bookings 
  SET completed_by_organizer = TRUE
  WHERE id = booking_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for speakers to mark event as completed
CREATE OR REPLACE FUNCTION mark_event_completed_by_speaker(
  booking_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  event_date TIMESTAMPTZ;
  is_authorized BOOLEAN := FALSE;
  current_status TEXT;
BEGIN
  -- Check if user is authorized (is the speaker for the booking)
  SELECT 
    e.date_time,
    (s.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())),
    b.status
  INTO event_date, is_authorized, current_status
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  JOIN speakers s ON b.speaker_id = s.id
  WHERE b.id = booking_id_param;
  
  -- Check authorization and event status
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Only the event speaker can mark completion';
  END IF;
  
  IF current_status != 'paid' THEN
    RAISE EXCEPTION 'Event must be in paid status before completion';
  END IF;
  
  -- Check if event has passed (with some buffer time)
  IF (event_date + INTERVAL '2 hours') > NOW() THEN
    RAISE EXCEPTION 'Event has not yet concluded';
  END IF;
  
  -- Mark as completed by speaker
  UPDATE bookings 
  SET completed_by_speaker = TRUE
  WHERE id = booking_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for organizers to rate speakers
CREATE OR REPLACE FUNCTION rate_speaker(
  booking_id_param UUID,
  rating_param INTEGER,
  feedback_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_authorized BOOLEAN := FALSE;
  is_completed BOOLEAN := FALSE;
BEGIN
  -- Validate rating
  IF rating_param < 1 OR rating_param > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Check if user is authorized and event is completed
  SELECT 
    (e.organizer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())),
    (b.status = 'completed')
  INTO is_authorized, is_completed
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  WHERE b.id = booking_id_param;
  
  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Only the event organizer can rate speakers';
  END IF;
  
  IF NOT is_completed THEN
    RAISE EXCEPTION 'Event must be completed before rating';
  END IF;
  
  -- Add rating
  UPDATE bookings 
  SET 
    organizer_rating = rating_param,
    organizer_feedback = feedback_param,
    rated_at = NOW()
  WHERE id = booking_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for speaker dashboard statistics
CREATE OR REPLACE VIEW speaker_dashboard_stats AS
SELECT 
  s.id as speaker_id,
  s.profile_id,
  p.full_name,
  s.total_events_completed,
  s.total_earnings,
  s.average_rating,
  s.total_ratings,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
  COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as upcoming_events,
  COUNT(CASE WHEN b.status = 'paid' THEN 1 END) as paid_events,
  COUNT(CASE WHEN b.completed_by_speaker = TRUE AND b.completed_by_organizer = FALSE THEN 1 END) as waiting_organizer_completion,
  SUM(CASE WHEN b.payment_released = TRUE THEN b.payment_amount ELSE 0 END) as total_released_payments
FROM speakers s
JOIN profiles p ON s.profile_id = p.id
LEFT JOIN bookings b ON s.id = b.speaker_id
WHERE p.user_id = auth.uid()
GROUP BY s.id, s.profile_id, p.full_name, s.total_events_completed, s.total_earnings, s.average_rating, s.total_ratings;

-- Create view for organizer event management with completion status
CREATE OR REPLACE VIEW organizer_event_management AS
SELECT 
  e.id as event_id,
  e.title,
  e.date_time,
  e.duration_hours,
  b.id as booking_id,
  b.status as booking_status,
  b.payment_status,
  b.payment_amount,
  b.completed_by_organizer,
  b.completed_by_speaker,
  b.completed_at,
  b.payment_released,
  b.organizer_rating,
  b.organizer_feedback,
  sp_profile.full_name as speaker_name,
  s.average_rating as speaker_avg_rating,
  s.total_events_completed as speaker_total_events,
  (e.date_time + INTERVAL '2 hours' < NOW()) as event_has_passed,
  (b.completed_by_organizer = TRUE AND b.completed_by_speaker = TRUE) as is_fully_completed
FROM events e
JOIN profiles org_profile ON e.organizer_id = org_profile.id
LEFT JOIN bookings b ON e.id = b.event_id AND b.status IN ('paid', 'completed')
LEFT JOIN speakers s ON b.speaker_id = s.id
LEFT JOIN profiles sp_profile ON s.profile_id = sp_profile.id
WHERE org_profile.user_id = auth.uid()
ORDER BY e.date_time DESC;

-- Grant permissions
GRANT SELECT ON speaker_dashboard_stats TO authenticated;
GRANT SELECT ON organizer_event_management TO authenticated;
GRANT EXECUTE ON FUNCTION mark_event_completed_by_organizer TO authenticated;
GRANT EXECUTE ON FUNCTION mark_event_completed_by_speaker TO authenticated;
GRANT EXECUTE ON FUNCTION rate_speaker TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_completion_status ON bookings(completed_by_organizer, completed_by_speaker);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_released ON bookings(payment_released);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_rating ON bookings(organizer_rating);
CREATE INDEX IF NOT EXISTS idx_speakers_stats ON speakers(total_events_completed, average_rating);

-- Add comments
COMMENT ON COLUMN bookings.completed_by_organizer IS 'Tracks if organizer has marked event as completed';
COMMENT ON COLUMN bookings.completed_by_speaker IS 'Tracks if speaker has marked event as completed';
COMMENT ON COLUMN bookings.payment_released IS 'Tracks if payment has been released to speaker after event completion';
COMMENT ON COLUMN speakers.total_events_completed IS 'Total number of completed events for this speaker';
COMMENT ON COLUMN speakers.total_earnings IS 'Total earnings in cents from completed events';
COMMENT ON FUNCTION mark_event_completed_by_organizer IS 'Allows organizers to mark their events as completed';
COMMENT ON FUNCTION mark_event_completed_by_speaker IS 'Allows speakers to mark events as completed';
COMMENT ON FUNCTION rate_speaker IS 'Allows organizers to rate speakers after event completion';
