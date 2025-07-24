-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('speaker', 'organizer', 'both')) DEFAULT 'speaker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create speakers table for speaker-specific information
CREATE TABLE public.speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'expert')) DEFAULT 'beginner',
  hourly_rate INTEGER, -- in cents
  available BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN NOT NULL DEFAULT false,
  total_talks INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create speaker_topics junction table
CREATE TABLE public.speaker_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  UNIQUE(speaker_id, topic_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('lecture', 'seminar', 'workshop', 'webinar', 'conference', 'other')),
  format TEXT NOT NULL CHECK (format IN ('in-person', 'virtual', 'hybrid')),
  location TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  duration_hours INTEGER NOT NULL,
  budget_min INTEGER, -- in cents
  budget_max INTEGER, -- in cents
  required_topics TEXT[], -- array of topic names
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
  agreed_rate INTEGER, -- in cents
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, speaker_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for speakers
CREATE POLICY "Speakers are viewable by everyone" ON public.speakers FOR SELECT USING (true);
CREATE POLICY "Users can update their own speaker profile" ON public.speakers FOR UPDATE USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert their own speaker profile" ON public.speakers FOR INSERT WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for topics
CREATE POLICY "Topics are viewable by everyone" ON public.topics FOR SELECT USING (true);

-- RLS Policies for speaker_topics
CREATE POLICY "Speaker topics are viewable by everyone" ON public.speaker_topics FOR SELECT USING (true);
CREATE POLICY "Users can manage their own speaker topics" ON public.speaker_topics FOR ALL USING (
  speaker_id IN (
    SELECT s.id FROM public.speakers s 
    JOIN public.profiles p ON s.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (
  organizer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert their own events" ON public.events FOR INSERT WITH CHECK (
  organizer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for bookings
CREATE POLICY "Users can view bookings they're involved in" ON public.bookings FOR SELECT USING (
  organizer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  speaker_id IN (
    SELECT s.id FROM public.speakers s 
    JOIN public.profiles p ON s.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (
  speaker_id IN (
    SELECT s.id FROM public.speakers s 
    JOIN public.profiles p ON s.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update bookings they're involved in" ON public.bookings FOR UPDATE USING (
  organizer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  speaker_id IN (
    SELECT s.id FROM public.speakers s 
    JOIN public.profiles p ON s.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (
  reviewer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample topics
INSERT INTO public.topics (name, description) VALUES
  ('Technology', 'Software development, AI, cybersecurity, and tech trends'),
  ('Business', 'Entrepreneurship, leadership, marketing, and business strategy'),
  ('Education', 'Teaching methods, educational technology, and learning strategies'),
  ('Health & Wellness', 'Mental health, fitness, nutrition, and medical topics'),
  ('Personal Development', 'Self-improvement, productivity, and life skills'),
  ('Science', 'Research, discoveries, and scientific methodology'),
  ('Arts & Culture', 'Creative arts, cultural studies, and artistic expression'),
  ('Environment', 'Sustainability, climate change, and environmental conservation'),
  ('Social Issues', 'Community development, social justice, and advocacy'),
  ('Career Development', 'Professional growth, networking, and job skills');