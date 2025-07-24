-- Fix speaker statistics synchronization
-- This migration ensures total_talks and total_events_completed stay in sync

-- Update existing records to sync total_talks with total_events_completed
UPDATE speakers 
SET total_talks = COALESCE(total_events_completed, 0)
WHERE total_talks IS NULL OR total_talks != COALESCE(total_events_completed, 0);

-- Create or replace function to update speaker stats when booking is completed
CREATE OR REPLACE FUNCTION update_speaker_stats_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stats when booking moves to completed status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update both total_events_completed and total_talks
    UPDATE speakers 
    SET 
      total_events_completed = COALESCE(total_events_completed, 0) + 1,
      total_talks = COALESCE(total_talks, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.speaker_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic speaker stats update
DROP TRIGGER IF EXISTS trigger_update_speaker_stats ON bookings;
CREATE TRIGGER trigger_update_speaker_stats
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_stats_on_completion();

-- Create or replace function to update speaker rating when organizer rating is added
CREATE OR REPLACE FUNCTION update_speaker_rating_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  total_rating_count INTEGER;
  rating_value INTEGER;
BEGIN
  -- Only process when reviewer_notes contains a rating and wasn't there before
  IF NEW.reviewer_notes IS NOT NULL 
     AND NEW.reviewer_notes LIKE 'Rating:%'
     AND (OLD.reviewer_notes IS NULL OR OLD.reviewer_notes NOT LIKE 'Rating:%') THEN
    
    -- Extract rating from "Rating: X/5 stars" format
    rating_value := CAST(substring(NEW.reviewer_notes from 'Rating: (\d+)/5 stars') AS INTEGER);
    
    IF rating_value IS NOT NULL THEN
      -- Calculate new average rating and total count for this speaker
      SELECT 
        ROUND(AVG(CAST(substring(b.reviewer_notes from 'Rating: (\d+)/5 stars') AS INTEGER))::NUMERIC, 2),
        COUNT(*)
      INTO avg_rating, total_rating_count
      FROM bookings b
      WHERE b.speaker_id = NEW.speaker_id 
        AND b.reviewer_notes IS NOT NULL 
        AND b.reviewer_notes LIKE 'Rating:%';
      
      -- Update speaker's average rating and total ratings
      UPDATE speakers 
      SET 
        average_rating = avg_rating,
        total_ratings = total_rating_count,
        updated_at = NOW()
      WHERE id = NEW.speaker_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic speaker rating update
DROP TRIGGER IF EXISTS trigger_update_speaker_rating ON bookings;
CREATE TRIGGER trigger_update_speaker_rating
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_rating_on_feedback();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_speaker_feedback ON bookings(speaker_id) WHERE reviewer_notes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_completion ON bookings(speaker_id, status) WHERE status IN ('paid', 'completed');

-- Add comments
COMMENT ON FUNCTION update_speaker_stats_on_completion() IS 'Automatically updates speaker statistics when bookings are completed';
COMMENT ON FUNCTION update_speaker_rating_on_feedback() IS 'Automatically updates speaker average rating when feedback is provided';
