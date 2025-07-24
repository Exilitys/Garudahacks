-- Fix booking status constraint to include 'paid' status
-- This migration updates the check constraint on bookings.status to include 'paid'
-- which is required for the payment system to work correctly

-- Drop the existing check constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the updated check constraint that includes 'paid'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'paid'));

-- Add comment to document the change
COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS 'Updated to include paid status for payment system compatibility';
