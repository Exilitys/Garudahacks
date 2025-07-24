-- Add "finished" status to events and create trigger to auto-update event status
-- This migration adds functionality to automatically change event status to "finished"
-- when all paid bookings for an event are completed
-- This extends the event completion system with automatic event status management

-- First, update the events status constraint to include 'finished'
-- Check if the constraint exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_status_check' 
        AND table_name = 'events'
    ) THEN
        ALTER TABLE public.events DROP CONSTRAINT events_status_check;
    END IF;
END $$;

-- Add the updated check constraint that includes 'finished'
ALTER TABLE public.events 
ADD CONSTRAINT events_status_check 
CHECK (status IN ('open', 'in_progress', 'completed', 'finished', 'cancelled'));

-- Create function to check and update event status when bookings are completed
CREATE OR REPLACE FUNCTION check_and_update_event_status()
RETURNS TRIGGER AS $$
DECLARE
  event_id_var UUID;
  total_paid_bookings INTEGER;
  total_completed_bookings INTEGER;
  current_event_status TEXT;
BEGIN
  -- Only proceed if booking status changed to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get the event ID from the updated booking
    event_id_var := NEW.event_id;
    
    -- Get the current event status
    SELECT status INTO current_event_status
    FROM events
    WHERE id = event_id_var;
    
    -- Only proceed if event is not already finished
    IF current_event_status != 'finished' THEN
      -- Count total paid bookings for this event (originally paid)
      SELECT COUNT(*) INTO total_paid_bookings
      FROM bookings 
      WHERE event_id = event_id_var 
        AND status IN ('paid', 'completed');
      
      -- Count completed bookings for this event
      SELECT COUNT(*) INTO total_completed_bookings
      FROM bookings 
      WHERE event_id = event_id_var 
        AND status = 'completed';
      
      -- If all paid bookings are now completed, update event status to finished
      IF total_paid_bookings > 0 AND total_completed_bookings = total_paid_bookings THEN
        UPDATE events 
        SET 
          status = 'finished',
          updated_at = NOW()
        WHERE id = event_id_var;
        
        -- Log the status change
        RAISE NOTICE 'Event % status updated to finished. Completed bookings: %, Total paid bookings: %', 
          event_id_var, total_completed_bookings, total_paid_bookings;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update event status when bookings are completed
DROP TRIGGER IF EXISTS trigger_update_event_status_on_booking_completion ON public.bookings;
CREATE TRIGGER trigger_update_event_status_on_booking_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_event_status();

-- Add index for better performance when checking event completion status
CREATE INDEX IF NOT EXISTS idx_bookings_event_status_completion 
ON public.bookings(event_id, status) 
WHERE status IN ('paid', 'completed');

-- Add index for events status for faster filtering
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_and_update_event_status TO authenticated;

-- Add comments to document the functionality
COMMENT ON CONSTRAINT events_status_check ON public.events IS 'Updated to include finished status for automatic event completion';
COMMENT ON FUNCTION check_and_update_event_status IS 'Automatically updates event status to finished when all paid bookings are completed';
COMMENT ON TRIGGER trigger_update_event_status_on_booking_completion ON public.bookings IS 'Triggers event status update when bookings are completed';
COMMENT ON INDEX idx_bookings_event_status_completion IS 'Optimizes queries for checking event completion status';
COMMENT ON INDEX idx_events_status IS 'Optimizes event filtering by status including the new finished status';
