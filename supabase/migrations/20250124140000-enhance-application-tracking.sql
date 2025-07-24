-- Enhanced Application Status Tracking Migration
-- This migration enhances the application tracking system for speaker applications

-- Add new columns to bookings table for enhanced tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
ADD COLUMN IF NOT EXISTS application_priority TEXT CHECK (application_priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create application_status_history table to track status changes
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create application_notifications table to track notifications
CREATE TABLE IF NOT EXISTS public.application_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('submitted', 'reviewed', 'accepted', 'rejected', 'reminder', 'deadline')),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  message TEXT,
  metadata JSONB
);

-- Enable RLS on new tables
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON public.bookings(event_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_speaker_status ON public.bookings(speaker_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_status ON public.bookings(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings(updated_at);

CREATE INDEX IF NOT EXISTS idx_application_status_history_booking_id ON public.application_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_created_at ON public.application_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_application_notifications_booking_id ON public.application_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_application_notifications_recipient_id ON public.application_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_application_notifications_type ON public.application_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_application_notifications_sent_at ON public.application_notifications(sent_at);

-- RLS Policies for application_status_history
-- Users can view status history for applications they're involved in
CREATE POLICY "Users can view related application status history" ON public.application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.speakers s ON s.id = b.speaker_id
      JOIN public.profiles p ON p.id = s.profile_id
      WHERE b.id = booking_id 
      AND (p.user_id = auth.uid() OR b.organizer_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      ))
    )
  );

-- Only organizers can insert status history (when they change application status)
CREATE POLICY "Organizers can insert status history" ON public.application_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id 
      AND b.organizer_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for application_notifications
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.application_notifications
  FOR SELECT USING (
    recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.application_notifications
  FOR UPDATE USING (
    recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- System can insert notifications (this would be handled by triggers or application logic)
CREATE POLICY "System can insert notifications" ON public.application_notifications
  FOR INSERT WITH CHECK (true);

-- Create function to automatically track status changes
CREATE OR REPLACE FUNCTION public.track_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_status_history (
      booking_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.organizer_id, -- Assuming organizer makes the change
      NEW.status_reason
    );
    
    -- Update responded_at timestamp when status changes from pending
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
      NEW.responded_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track status changes
DROP TRIGGER IF EXISTS trigger_track_booking_status_change ON public.bookings;
CREATE TRIGGER trigger_track_booking_status_change
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.track_booking_status_change();

-- Create function to get application statistics
CREATE OR REPLACE FUNCTION public.get_application_stats(user_id_param UUID)
RETURNS TABLE (
  total_applications BIGINT,
  pending_applications BIGINT,
  accepted_applications BIGINT,
  rejected_applications BIGINT,
  completed_applications BIGINT,
  response_rate DECIMAL,
  avg_response_time_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT id FROM public.profiles WHERE user_id = user_id_param
  ),
  user_bookings AS (
    SELECT b.* FROM public.bookings b
    JOIN public.speakers s ON s.id = b.speaker_id
    JOIN user_profile up ON up.id = s.profile_id
  ),
  stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')) as responded,
      AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600) FILTER (WHERE responded_at IS NOT NULL) as avg_response_hours
    FROM user_bookings
  )
  SELECT 
    s.total,
    s.pending,
    s.accepted,
    s.rejected,
    s.completed,
    CASE 
      WHEN s.total > 0 THEN (s.responded::DECIMAL / s.total::DECIMAL) * 100
      ELSE 0
    END as response_rate,
    COALESCE(s.avg_response_hours, 0) as avg_response_time_hours
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for application summary
CREATE OR REPLACE VIEW public.application_summary AS
SELECT 
  b.id,
  b.event_id,
  b.speaker_id,
  b.organizer_id,
  b.status,
  b.status_reason,
  b.agreed_rate,
  b.message,
  b.application_priority,
  b.created_at,
  b.updated_at,
  b.responded_at,
  e.title as event_title,
  e.date_time as event_date,
  e.format as event_format,
  e.event_type,
  sp.full_name as speaker_name,
  sp.avatar_url as speaker_avatar,
  op.full_name as organizer_name,
  s.experience_level,
  s.average_rating,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.created_at))/3600 as hours_since_application,
  CASE 
    WHEN b.responded_at IS NOT NULL THEN EXTRACT(EPOCH FROM (b.responded_at - b.created_at))/3600
    ELSE NULL
  END as response_time_hours
FROM public.bookings b
JOIN public.events e ON e.id = b.event_id
JOIN public.speakers s ON s.id = b.speaker_id
JOIN public.profiles sp ON sp.id = s.profile_id
JOIN public.profiles op ON op.id = b.organizer_id;

-- Grant permissions on the view
GRANT SELECT ON public.application_summary TO authenticated;

-- Note: RLS policies cannot be applied directly to views in PostgreSQL
-- The view will inherit security from the underlying tables (bookings, events, speakers, profiles)
-- which already have RLS policies in place

-- Add comment to document the migration
COMMENT ON TABLE public.application_status_history IS 'Tracks all status changes for speaker applications with timestamps and reasons';
COMMENT ON TABLE public.application_notifications IS 'Manages notifications sent to users about application status changes';
COMMENT ON FUNCTION public.get_application_stats IS 'Returns comprehensive statistics about a user''s applications';
COMMENT ON VIEW public.application_summary IS 'Provides a comprehensive view of applications with related event and user information';
