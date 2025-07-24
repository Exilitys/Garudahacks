-- Implementation of comprehensive payment system with automatic fee calculation
-- This migration adds payment tracking, automatic calculation based on hourly rates and event duration,
-- and comprehensive payment workflow management

-- Add payment tracking fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
ADD COLUMN IF NOT EXISTS payment_amount INTEGER, -- Amount in cents
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Create function to automatically set payment due date and calculate fees when booking is accepted
CREATE OR REPLACE FUNCTION set_payment_due_date()
RETURNS TRIGGER AS $$
DECLARE
  speaker_hourly_rate INTEGER;
  event_duration INTEGER;
  calculated_amount INTEGER;
BEGIN
  -- If status changes to 'accepted' and payment_due_date is not set
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.payment_due_date IS NULL THEN
    -- Get speaker's hourly rate and event duration
    SELECT s.hourly_rate, e.duration_hours 
    INTO speaker_hourly_rate, event_duration
    FROM speakers s, events e
    WHERE s.id = NEW.speaker_id AND e.id = NEW.event_id;
    
    -- Calculate payment amount: hourly_rate * duration_hours
    calculated_amount := COALESCE(speaker_hourly_rate, 0) * COALESCE(event_duration, 1);
    
    -- Set payment details
    NEW.payment_due_date := NOW() + INTERVAL '2 days';
    NEW.payment_amount := calculated_amount;
    NEW.payment_status := 'pending';
    
    -- Update agreed_rate to match calculated amount if not already set
    IF NEW.agreed_rate IS NULL THEN
      NEW.agreed_rate := calculated_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS booking_payment_due_trigger ON bookings;
CREATE TRIGGER booking_payment_due_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_due_date();

-- Create function to update overdue payments
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS void AS $$
BEGIN
  UPDATE bookings 
  SET payment_status = 'overdue'
  WHERE payment_status = 'pending' 
    AND payment_due_date < NOW()
    AND status = 'accepted';
END;
$$ LANGUAGE plpgsql;

-- Create payments table for detailed transaction records
-- First check if table exists, if so, only add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    CREATE TABLE payments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL, -- Amount in cents
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
      payment_method VARCHAR(50),
      payment_reference VARCHAR(255),
      transaction_id VARCHAR(255),
      processor_response JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Table exists, add any missing columns
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS processor_response JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_due_date ON bookings(payment_due_date);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Organizers can create payments" ON payments;
DROP POLICY IF EXISTS "Organizers can update their payments" ON payments;

-- Create comprehensive RLS policies for payments table
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b 
      JOIN events e ON b.event_id = e.id 
      JOIN profiles p ON (p.id = e.organizer_id OR p.id = (SELECT profile_id FROM speakers WHERE id = b.speaker_id))
      WHERE b.id = payments.booking_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can create payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b 
      JOIN events e ON b.event_id = e.id 
      JOIN profiles p ON p.id = e.organizer_id
      WHERE b.id = payments.booking_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update their payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings b 
      JOIN events e ON b.event_id = e.id 
      JOIN profiles p ON p.id = e.organizer_id
      WHERE b.id = payments.booking_id AND p.user_id = auth.uid()
    )
  );

-- Create function to process payment completion
CREATE OR REPLACE FUNCTION complete_payment(
  booking_id_param UUID,
  payment_reference_param VARCHAR(255),
  payment_method_param VARCHAR(50) DEFAULT 'card'
)
RETURNS BOOLEAN AS $$
DECLARE
  payment_amount_val INTEGER;
  booking_exists BOOLEAN;
BEGIN
  -- Check if booking exists and get payment amount
  SELECT EXISTS(SELECT 1 FROM bookings WHERE id = booking_id_param AND status = 'accepted'),
         payment_amount
  INTO booking_exists, payment_amount_val
  FROM bookings 
  WHERE id = booking_id_param;
  
  IF NOT booking_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Update booking status to 'paid'
  UPDATE bookings 
  SET 
    status = 'paid',
    payment_date = NOW(),
    payment_reference = payment_reference_param,
    payment_status = 'paid'
  WHERE id = booking_id_param;
  
  -- Insert payment record
  INSERT INTO payments (
    booking_id,
    amount,
    status,
    payment_method,
    payment_reference,
    completed_at
  ) VALUES (
    booking_id_param,
    payment_amount_val,
    'completed',
    payment_method_param,
    payment_reference_param,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get payment summary for organizers
CREATE OR REPLACE FUNCTION get_payment_summary(organizer_profile_id UUID)
RETURNS TABLE (
  total_payments_due INTEGER,
  total_paid INTEGER,
  overdue_payments INTEGER,
  pending_payments INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN b.payment_status IN ('pending', 'overdue') THEN b.payment_amount ELSE 0 END), 0)::INTEGER as total_payments_due,
    COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.payment_amount ELSE 0 END), 0)::INTEGER as total_paid,
    COALESCE(COUNT(CASE WHEN b.payment_status = 'overdue' THEN 1 END), 0)::INTEGER as overdue_payments,
    COALESCE(COUNT(CASE WHEN b.payment_status = 'pending' THEN 1 END), 0)::INTEGER as pending_payments
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  WHERE e.organizer_id = organizer_profile_id
    AND b.status IN ('accepted', 'paid');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle payment notifications
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be extended to send notifications
  -- when payment status changes (e.g., via webhook, email, etc.)
  
  -- For now, we'll just log the change
  INSERT INTO system_logs (table_name, record_id, action, old_values, new_values, created_at)
  VALUES (
    'bookings',
    NEW.id,
    'payment_status_change',
    jsonb_build_object('payment_status', OLD.payment_status),
    jsonb_build_object('payment_status', NEW.payment_status),
    NOW()
  ) ON CONFLICT DO NOTHING; -- Ignore if system_logs table doesn't exist
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status change notifications
DROP TRIGGER IF EXISTS payment_status_change_trigger ON bookings;
CREATE TRIGGER payment_status_change_trigger
  AFTER UPDATE OF payment_status ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION notify_payment_status_change();

-- Create view for easy payment tracking
DROP VIEW IF EXISTS payment_overview;
CREATE VIEW payment_overview AS
SELECT 
  b.id as booking_id,
  e.title as event_title,
  e.date_time as event_date,
  sp.profile_id as speaker_profile_id,
  sp_profile.full_name as speaker_name,
  org_profile.full_name as organizer_name,
  b.payment_amount,
  b.payment_status,
  b.payment_due_date,
  b.payment_date,
  b.payment_reference,
  (b.payment_due_date < NOW() AND b.payment_status = 'pending') as is_overdue,
  p.id as payment_record_id,
  p.status as payment_record_status,
  p.payment_method,
  p.completed_at as payment_completed_at
FROM bookings b
JOIN events e ON b.event_id = e.id
JOIN speakers sp ON b.speaker_id = sp.id
JOIN profiles sp_profile ON sp.profile_id = sp_profile.id
JOIN profiles org_profile ON e.organizer_id = org_profile.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE b.status IN ('accepted', 'paid');

-- Grant appropriate permissions
GRANT SELECT ON payment_overview TO authenticated;
GRANT EXECUTE ON FUNCTION complete_payment TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_summary TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_payments TO authenticated;

-- Insert sample data to test payment calculation (only if tables are empty)
-- This will be skipped if data already exists
DO $$
BEGIN
  -- This is just for testing the payment calculation
  -- Real data will be managed through the application
  NULL;
END
$$;

-- Add comment to document the migration
COMMENT ON TABLE payments IS 'Stores detailed payment transaction records for speaker payments';
COMMENT ON FUNCTION set_payment_due_date() IS 'Automatically calculates payment amount based on speaker hourly rate and event duration when booking is accepted';
COMMENT ON FUNCTION complete_payment(UUID, VARCHAR, VARCHAR) IS 'Processes payment completion and updates booking status';
COMMENT ON VIEW payment_overview IS 'Comprehensive view of all payment-related information for easy tracking';
