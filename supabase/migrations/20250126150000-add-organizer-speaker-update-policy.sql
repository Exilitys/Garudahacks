-- Add RLS policy to allow event organizers to update speaker statistics after event completion
-- This policy allows organizers to update speaker profiles (specifically statistics) 
-- when they have a paid or completed booking with that speaker

CREATE POLICY "Event organizers can update speaker stats for their events" ON public.speakers FOR UPDATE USING (
  -- Allow update if the current user is an organizer who has a paid or completed booking with this speaker
  EXISTS (
    SELECT 1 
    FROM public.bookings b
    JOIN public.events e ON b.event_id = e.id
    JOIN public.profiles p ON e.organizer_id = p.id
    WHERE b.speaker_id = speakers.id
    AND p.user_id = auth.uid()
    AND b.status IN ('paid', 'completed')
  )
);

-- Also add a policy for service role to update speaker stats (for functions)
CREATE POLICY "Service role can update speaker stats" ON public.speakers FOR UPDATE USING (
  auth.role() = 'service_role'
);
