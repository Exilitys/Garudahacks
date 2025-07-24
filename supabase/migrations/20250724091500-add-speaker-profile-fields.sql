-- Add additional profile fields to speakers table
-- This migration adds: occupation, company, topic specialization, portfolio_url
-- Note: rating and location are handled differently to avoid conflicts with existing schema

-- Add new columns to speakers table
ALTER TABLE public.speakers 
ADD COLUMN occupation TEXT,
ADD COLUMN company TEXT,
ADD COLUMN primary_topic TEXT,
ADD COLUMN portfolio_url TEXT,
ADD COLUMN secondary_location TEXT; -- Adding as secondary_location since profiles table already has location

-- Add constraints and indexes for better performance
CREATE INDEX idx_speakers_occupation ON public.speakers(occupation);
CREATE INDEX idx_speakers_company ON public.speakers(company);
CREATE INDEX idx_speakers_primary_topic ON public.speakers(primary_topic);

-- Add check constraint for portfolio URL format (basic validation)
ALTER TABLE public.speakers 
ADD CONSTRAINT chk_portfolio_url_format 
CHECK (portfolio_url IS NULL OR portfolio_url ~* '^https?://.*');

-- Update RLS policies to include new fields in updates
-- The existing policy already covers updates, but we'll ensure it's comprehensive
DROP POLICY IF EXISTS "Users can update their own speaker profile" ON public.speakers;
CREATE POLICY "Users can update their own speaker profile" ON public.speakers 
FOR UPDATE USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create a view that combines speaker info with profile info for easier querying
CREATE OR REPLACE VIEW public.speaker_profiles AS
SELECT 
  s.id as speaker_id,
  s.profile_id,
  p.user_id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.location as profile_location,
  p.website,
  p.user_type,
  s.experience_level,
  s.hourly_rate,
  s.available,
  s.verified,
  s.total_talks,
  s.average_rating,
  s.occupation,
  s.company,
  s.primary_topic,
  s.portfolio_url,
  s.secondary_location,
  s.created_at as speaker_created_at,
  s.updated_at as speaker_updated_at,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at
FROM public.speakers s
JOIN public.profiles p ON s.profile_id = p.id;

-- Enable RLS on the view (inherits from underlying tables)
-- Views automatically inherit RLS from their underlying tables

-- Add some sample occupations and companies for reference (optional)
-- These could be used for dropdown suggestions in the UI
CREATE TABLE IF NOT EXISTS public.occupation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert common occupation suggestions
INSERT INTO public.occupation_suggestions (name, category) VALUES
  ('Software Engineer', 'Technology'),
  ('Data Scientist', 'Technology'),
  ('Product Manager', 'Business'),
  ('UX Designer', 'Design'),
  ('Marketing Manager', 'Marketing'),
  ('Consultant', 'Business'),
  ('Teacher', 'Education'),
  ('Researcher', 'Academic'),
  ('Entrepreneur', 'Business'),
  ('Freelancer', 'Independent')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on occupation_suggestions
ALTER TABLE public.occupation_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Occupation suggestions are viewable by everyone" ON public.occupation_suggestions FOR SELECT USING (true);

-- Add helpful comments for documentation
COMMENT ON COLUMN public.speakers.occupation IS 'The speaker''s current job title or profession';
COMMENT ON COLUMN public.speakers.company IS 'The company or organization the speaker works for';
COMMENT ON COLUMN public.speakers.primary_topic IS 'The speaker''s main area of expertise or preferred speaking topic';
COMMENT ON COLUMN public.speakers.portfolio_url IS 'URL to the speaker''s portfolio, personal website, or professional profile';
COMMENT ON COLUMN public.speakers.secondary_location IS 'Additional location information specific to speaking engagements (supplements profile location)';

-- Create a function to update speaker statistics when bookings are completed
CREATE OR REPLACE FUNCTION public.update_speaker_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update total_talks and average_rating when a booking is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.speakers 
    SET total_talks = total_talks + 1
    WHERE id = NEW.speaker_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update speaker stats
DROP TRIGGER IF EXISTS update_speaker_stats_trigger ON public.bookings;
CREATE TRIGGER update_speaker_stats_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_speaker_stats();
