-- Add payment tracking fields to bookings table
ALTER TABLE bookings 
ADD COLUMN payment_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
ADD COLUMN payment_amount INTEGER, -- Amount in cents
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_reference VARCHAR(255);

-- Create function to automatically set payment due date when booking is accepted
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

-- Create trigger to automatically set payment due date
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

-- Create payments table for transaction records
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
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
