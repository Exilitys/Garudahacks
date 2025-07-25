-- Add image support to events table
-- Add images column to store multiple event images
ALTER TABLE public.events ADD COLUMN images TEXT[] DEFAULT '{}';

-- Create event_images storage bucket for event photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for event-images bucket
-- Allow authenticated users to view all event images
CREATE POLICY "Event images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'event-images');

-- Allow event organizers to upload images for their events
CREATE POLICY "Event organizers can upload event images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow event organizers to update their event images
CREATE POLICY "Event organizers can update their event images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow event organizers to delete their event images
CREATE POLICY "Event organizers can delete their event images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
