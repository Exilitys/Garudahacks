-- Insert speaker data from CSV into profiles and speakers tables
-- This migration creates profiles and corresponding speaker records

-- First, let's add a unique constraint on email if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_unique'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    END IF;
END $$;

-- Add unique constraint on speakers.profile_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'speakers_profile_id_unique'
    ) THEN
        ALTER TABLE public.speakers ADD CONSTRAINT speakers_profile_id_unique UNIQUE (profile_id);
    END IF;
END $$;

-- Create auth users first (required for profiles foreign key)
-- These will be inserted into auth.users with proper UUIDs
-- We'll use a safer approach that checks for existing users first
DO $$
DECLARE
    user_record RECORD;
    user_data RECORD;
BEGIN
    -- Create users one by one to handle conflicts properly
    FOR user_data IN 
        SELECT * FROM (VALUES 
            ('00000000-0000-0000-0000-000000000001'::uuid, 'balidin.dongoran@gmail.com', 'Balidin Dongoran'),
            ('00000000-0000-0000-0000-000000000002'::uuid, 'darmana.mandala@gmail.com', 'Darmana Mandala'),
            ('00000000-0000-0000-0000-000000000003'::uuid, 'ciaobella.wastutid@gmail.com', 'Ciaobella Wastutid'),
            ('00000000-0000-0000-0000-000000000004'::uuid, 'lantar.anggraini@gmail.com', 'Lantar Anggraini'),
            ('00000000-0000-0000-0000-000000000005'::uuid, 'among.iswahyudi@gmail.com', 'Among Iswahyudi'),
            ('00000000-0000-0000-0000-000000000006'::uuid, 'daruna.mayasari@gmail.com', 'Daruna Mayasari'),
            ('00000000-0000-0000-0000-000000000007'::uuid, 'cut.putri.napitupulu@gmail.com', 'Cut Putri Napitupulu'),
            ('00000000-0000-0000-0000-000000000008'::uuid, 'sadina.palastriarm@gmail.com', 'Sadina Palastriarm'),
            ('00000000-0000-0000-0000-000000000009'::uuid, 'ikin.rahmawati@gmail.com', 'Ikin Rahmawati'),
            ('00000000-0000-0000-0000-000000000010'::uuid, 'yessi.ardianto@gmail.com', 'Yessi Ardianto'),
            ('00000000-0000-0000-0000-000000000011'::uuid, '.capa.anggrainisi@gmail.com', 'Capa Anggrainisi'),
            ('00000000-0000-0000-0000-000000000012'::uuid, 'eva.pratama@gmail.com', 'Eva Pratama'),
            ('00000000-0000-0000-0000-000000000013'::uuid, 'tgk..baktiono.iswahyudios@gmail.com', 'Tgk. Baktiono Iswahyudios'),
            ('00000000-0000-0000-0000-000000000014'::uuid, 'gatot.situmorang@gmail.com', 'Gatot Situmorang'),
            ('00000000-0000-0000-0000-000000000015'::uuid, 'tgk..yani.gunawan@gmail.com', 'Tgk. Yani Gunawan'),
            ('00000000-0000-0000-0000-000000000016'::uuid, 'michelle.nasyiah@gmail.com', 'Michelle Nasyiah'),
            ('00000000-0000-0000-0000-000000000017'::uuid, 'cindy.puspasari@gmail.com', 'Cindy Puspasari'),
            ('00000000-0000-0000-0000-000000000018'::uuid, 'yance.utami@gmail.com', 'Yance Utami'),
            ('00000000-0000-0000-0000-000000000019'::uuid, 'dr..ratih.nababan@gmail.com', 'dr. Ratih Nababan'),
            ('00000000-0000-0000-0000-000000000020'::uuid, 'betania.gunawan@gmail.com', 'Betania Gunawan')
        ) AS users(id, email, full_name)
    LOOP
        -- Check if user already exists
        SELECT * INTO user_record FROM auth.users WHERE id = user_data.id OR email = user_data.email;
        
        IF NOT FOUND THEN
            -- Insert new user
            INSERT INTO auth.users (
                id, 
                instance_id, 
                email, 
                raw_app_meta_data, 
                raw_user_meta_data, 
                is_super_admin, 
                created_at, 
                updated_at, 
                email_confirmed_at,
                role,
                aud
            ) VALUES (
                user_data.id, 
                '00000000-0000-0000-0000-000000000000'::uuid, 
                user_data.email, 
                '{"provider":"email","providers":["email"]}', 
                json_build_object('full_name', user_data.full_name), 
                false, 
                now(), 
                now(), 
                now(), 
                'authenticated', 
                'authenticated'
            );
        ELSE
            -- Update existing user
            UPDATE auth.users SET
                email = user_data.email,
                raw_user_meta_data = json_build_object('full_name', user_data.full_name),
                updated_at = now()
            WHERE id = user_record.id;
        END IF;
    END LOOP;
END $$;

-- Insert profiles first (speakers will reference these)
INSERT INTO public.profiles (
  user_id, email, full_name, bio, location, website, user_type, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'balidin.dongoran@gmail.com', 'Balidin Dongoran', 
   'Experienced Lead Data Scientist with expertise in AI and machine learning. Passionate about transforming data into actionable insights and driving innovation in financial technology.', 
   'Gading Serpong, Tangerang', 'https://portofolio.andi.tech', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000002'::uuid, 'darmana.mandala@gmail.com', 'Darmana Mandala', 
   'Senior Developer specializing in AI and backend systems. Expert in building scalable solutions for telecommunications and enterprise applications.', 
   'Bandung, Jawa Barat', 'https://rina-ai.net', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000003'::uuid, 'ciaobella.wastutid@gmail.com', 'Ciaobella Wastutid', 
   'Creative UX Designer focused on user-centered design and product innovation. Experienced in creating intuitive digital experiences for e-commerce platforms.', 
   'Alam Sutera, Tangerang', 'https://budihealth.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000004'::uuid, 'lantar.anggraini@gmail.com', 'Lantar Anggraini', 
   'Strategic Product Manager with deep expertise in fintech and technology strategy. Proven track record in launching successful financial products.', 
   'Jakarta Selatan', 'https://dewimanager.com', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000005'::uuid, 'among.iswahyudi@gmail.com', 'Among Iswahyudi', 
   'Data-driven Product Manager with international experience. Expert in product strategy, analytics, and building products that scale globally.', 
   'Depok, Jawa Barat', 'https://fahmisec.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000006'::uuid, 'daruna.mayasari@gmail.com', 'Daruna Mayasari', 
   'AI Researcher specializing in deep learning and natural language processing. Passionate about advancing AI technology in e-commerce and consumer applications.', 
   'BSD City, Tangerang', 'https://lilisux.my.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000007'::uuid, 'cut.putri.napitupulu@gmail.com', 'Cut Putri Napitupulu', 
   'Lead Data Scientist in academia with expertise in big data analytics and AI research. Dedicated to advancing data science education and research methodologies.', 
   'Tebet, Jakarta Selatan', 'https://yusufdev.web.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000008'::uuid, 'sadina.palastriarm@gmail.com', 'Sadina Palastriarm', 
   'Professional Motivator and Leadership Coach with corporate experience. Specializes in personal development, team building, and organizational transformation.', 
   'Bekasi, Jawa Barat', 'https://megadata.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000009'::uuid, 'ikin.rahmawati@gmail.com', 'Ikin Rahmawati', 
   'Lead Data Scientist in travel technology with expertise in analytics and AI-driven solutions. Experienced in building data products for consumer-facing applications.', 
   'Gading Serpong, Tangerang', 'https://rizkyhealth.com', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000010'::uuid, 'yessi.ardianto@gmail.com', 'Yessi Ardianto', 
   'Law Professor specializing in technology law and digital ethics. Expert in legal frameworks for emerging technologies and digital transformation.', 
   'Yogyakarta', 'https://tanialearn.ml', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000011'::uuid, '.capa.anggrainisi@gmail.com', 'Capa Anggrainisi', 
   'Professional Public Speaking Trainer and Communication Expert. Specializes in leadership development and executive communication training.', 
   'Serpong, Tangerang Selatan', 'https://agusrobot.tech', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000012'::uuid, 'eva.pratama@gmail.com', 'Eva Pratama', 
   'Senior Developer with expertise in biotech and healthtech solutions. Passionate about using technology to improve healthcare and life sciences.', 
   'Bandung, Jawa Barat', 'https://sintabio.net', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000013'::uuid, 'tgk..baktiono.iswahyudios@gmail.com', 'Tgk. Baktiono Iswahyudios', 
   'Senior Developer and AI Ethics Advocate. Expert in technology policy, data governance, and ethical AI implementation in enterprise environments.', 
   'Jakarta Pusat', 'https://danietics.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000014'::uuid, 'gatot.situmorang@gmail.com', 'Gatot Situmorang', 
   'Lead Data Scientist specializing in healthcare analytics. Expert in applying data science to improve healthcare outcomes and medical research.', 
   'BSD City, Tangerang', 'https://nurulnutrition.com', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000015'::uuid, 'tgk..yani.gunawan@gmail.com', 'Tgk. Yani Gunawan', 
   'Senior Product Manager and Backend Developer with consulting experience. Expert in product strategy, technical architecture, and digital transformation.', 
   'Kuningan, Jakarta Selatan', 'https://indra-code.io', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000016'::uuid, 'michelle.nasyiah@gmail.com', 'Michelle Nasyiah', 
   'Product Manager specializing in healthcare technology and product research. Expert in building user-centric health solutions and strategic product development.', 
   'Ciputat, Tangerang Selatan', 'https://maria-epi.org', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000017'::uuid, 'cindy.puspasari@gmail.com', 'Cindy Puspasari', 
   'Leadership Motivator and Blockchain Technology Advocate. Specializes in emerging technology awareness, personal development, and innovation leadership.', 
   'Jakarta Utara', 'https://rezablock.id', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000018'::uuid, 'yance.utami@gmail.com', 'Yance Utami', 
   'Law Professor specializing in health law and technology regulation. Expert in legal frameworks for healthcare technology and digital health compliance.', 
   'Bogor, Jawa Barat', 'https://fitrihealth.gov', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000019'::uuid, 'dr..ratih.nababan@gmail.com', 'dr. Ratih Nababan', 
   'Senior Developer and Cloud Computing Expert. Specializes in DevOps, software architecture, and scalable cloud solutions for enterprise applications.', 
   'Jakarta Barat', 'https://adityacloud.com', 'speaker', now(), now()),
   
  ('00000000-0000-0000-0000-000000000020'::uuid, 'betania.gunawan@gmail.com', 'Betania Gunawan', 
   'Professional Motivator and Leadership Development Expert. Specializes in organizational development, team leadership, and personal transformation coaching.', 
   'Jakarta Timur', 'https://selvi-ai.edu', 'speaker', now(), now())

ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  website = EXCLUDED.website,
  user_type = EXCLUDED.user_type,
  updated_at = now();

-- Now insert speaker records that reference the profiles
INSERT INTO public.speakers (
  profile_id, 
  experience_level, 
  hourly_rate, 
  available, 
  verified, 
  total_talks, 
  average_rating,
  occupation,
  company,
  primary_topic,
  portfolio_url,
  secondary_location,
  created_at,
  updated_at
) 
SELECT 
  p.id as profile_id,
  CASE 
    WHEN speaker_data.rating >= 4.8 THEN 'expert'
    WHEN speaker_data.rating >= 4.5 THEN 'intermediate'
    ELSE 'beginner'
  END as experience_level,
  speaker_data.hourly_rate as hourly_rate, -- Store in Rupiah directly (no conversion)
  true as available,
  CASE WHEN speaker_data.rating >= 4.7 THEN true ELSE false END as verified,
  speaker_data.frequency as total_talks,
  speaker_data.rating as average_rating,
  speaker_data.occupation,
  speaker_data.company,
  speaker_data.primary_topic,
  speaker_data.portfolio_url,
  speaker_data.location as secondary_location,
  now() as created_at,
  now() as updated_at
FROM public.profiles p
JOIN (VALUES 
  ('balidin.dongoran@gmail.com', 4.8, 750000, 12, 'Lead Data Scientist', 'Bank Mandiri', 'data science, AI, machine learning', 'https://portofolio.andi.tech', 'Gading Serpong, Tangerang'),
  ('darmana.mandala@gmail.com', 4.7, 800000, 10, 'Senior Developer', 'Telkomsel', 'software engineering, AI, backend', 'https://rina-ai.net', 'Bandung, Jawa Barat'),
  ('ciaobella.wastutid@gmail.com', 4.6, 900000, 8, 'UX Designer', 'Shopee', 'UX design, product design, user research', 'https://budihealth.id', 'Alam Sutera, Tangerang'),
  ('lantar.anggraini@gmail.com', 4.5, 850000, 15, 'Product Manager', 'Bank Mandiri', 'product management, tech strategy, fintech', 'https://dewimanager.com', 'Jakarta Selatan'),
  ('among.iswahyudi@gmail.com', 4.9, 950000, 11, 'Product Manager', 'Etsy', 'product management, data-driven strategy', 'https://fahmisec.id', 'Depok, Jawa Barat'),
  ('daruna.mayasari@gmail.com', 4.4, 700000, 9, 'AI Researcher', 'Bukalapak', 'AI research, deep learning, NLP', 'https://lilisux.my.id', 'BSD City, Tangerang'),
  ('cut.putri.napitupulu@gmail.com', 4.8, 880000, 14, 'Lead Data Scientist', 'Universitas Indonesia', 'data analytics, AI, big data', 'https://yusufdev.web.id', 'Tebet, Jakarta Selatan'),
  ('sadina.palastriarm@gmail.com', 4.6, 770000, 13, 'Motivator', 'Tokopedia', 'leadership, motivation, personal development', 'https://megadata.id', 'Bekasi, Jawa Barat'),
  ('ikin.rahmawati@gmail.com', 4.5, 720000, 7, 'Lead Data Scientist', 'Traveloka', 'data science, analytics, AI', 'https://rizkyhealth.com', 'Gading Serpong, Tangerang'),
  ('yessi.ardianto@gmail.com', 4.7, 890000, 10, 'Dosen Hukum', 'Shopee', 'legal studies, technology law, ethics', 'https://tanialearn.ml', 'Yogyakarta'),
  ('.capa.anggrainisi@gmail.com', 4.8, 920000, 6, 'Trainer Public Speaking', 'McKinsey', 'public speaking, communication, leadership', 'https://agusrobot.tech', 'Serpong, Tangerang Selatan'),
  ('eva.pratama@gmail.com', 4.6, 860000, 5, 'Senior Developer', 'Universitas Indonesia', 'software engineering, biotech, healthtech', 'https://sintabio.net', 'Bandung, Jawa Barat'),
  ('tgk..baktiono.iswahyudios@gmail.com', 4.7, 910000, 4, 'Senior Developer', 'Traveloka', 'AI ethics, data policy, technology', 'https://danietics.id', 'Jakarta Pusat'),
  ('gatot.situmorang@gmail.com', 4.5, 690000, 6, 'Lead Data Scientist', 'Bank Mandiri', 'healthcare analytics, data science', 'https://nurulnutrition.com', 'BSD City, Tangerang'),
  ('tgk..yani.gunawan@gmail.com', 4.9, 1000000, 8, 'Product Manager', 'McKinsey', 'product strategy, backend development', 'https://indra-code.io', 'Kuningan, Jakarta Selatan'),
  ('michelle.nasyiah@gmail.com', 4.7, 980000, 9, 'Product Manager', 'Gojek', 'product research, healthtech, strategy', 'https://maria-epi.org', 'Ciputat, Tangerang Selatan'),
  ('cindy.puspasari@gmail.com', 4.6, 970000, 7, 'Motivator', 'Gojek', 'leadership, blockchain awareness, personal development', 'https://rezablock.id', 'Jakarta Utara'),
  ('yance.utami@gmail.com', 4.5, 740000, 10, 'Dosen Hukum', 'Shopee', 'hukum kesehatan, regulasi teknologi', 'https://fitrihealth.gov', 'Bogor, Jawa Barat'),
  ('dr..ratih.nababan@gmail.com', 4.9, 990000, 12, 'Senior Developer', 'Gojek', 'cloud computing, DevOps, software architecture', 'https://adityacloud.com', 'Jakarta Barat'),
  ('betania.gunawan@gmail.com', 4.6, 780000, 11, 'Motivator', 'McKinsey', 'leadership, motivation, personal development', 'https://selvi-ai.edu', 'Jakarta Timur')
) AS speaker_data(email, rating, hourly_rate, frequency, occupation, company, primary_topic, portfolio_url, location)
ON p.email = speaker_data.email
ON CONFLICT (profile_id) DO UPDATE SET
  experience_level = EXCLUDED.experience_level,
  hourly_rate = EXCLUDED.hourly_rate,
  average_rating = EXCLUDED.average_rating,
  total_talks = EXCLUDED.total_talks,
  occupation = EXCLUDED.occupation,
  company = EXCLUDED.company,
  primary_topic = EXCLUDED.primary_topic,
  portfolio_url = EXCLUDED.portfolio_url,
  secondary_location = EXCLUDED.secondary_location,
  updated_at = now();

-- Insert some common topics if they don't exist
INSERT INTO public.topics (name, description) VALUES
  ('Data Science', 'Statistical analysis, machine learning, and data-driven insights'),
  ('Artificial Intelligence', 'AI technologies, machine learning algorithms, and automation'),
  ('Machine Learning', 'Supervised, unsupervised, and reinforcement learning techniques'),
  ('Software Engineering', 'Software development practices, architecture, and methodologies'),
  ('Backend Development', 'Server-side development, APIs, and system architecture'),
  ('UX Design', 'User experience design, usability, and human-computer interaction'),
  ('Product Design', 'Product development, design thinking, and user-centered design'),
  ('User Research', 'User behavior analysis, usability testing, and research methodologies'),
  ('Product Management', 'Product strategy, roadmap planning, and cross-functional leadership'),
  ('Tech Strategy', 'Technology planning, digital transformation, and strategic decision making'),
  ('Fintech', 'Financial technology, digital payments, and banking innovation'),
  ('Data-driven Strategy', 'Analytics-based decision making and strategic planning'),
  ('AI Research', 'Advanced AI research, neural networks, and computational intelligence'),
  ('Deep Learning', 'Neural networks, deep neural architectures, and advanced AI'),
  ('Natural Language Processing', 'Text analysis, language models, and computational linguistics'),
  ('Data Analytics', 'Data analysis, visualization, and business intelligence'),
  ('Big Data', 'Large-scale data processing, distributed systems, and data infrastructure'),
  ('Leadership', 'Team management, organizational development, and executive skills'),
  ('Motivation', 'Personal development, team motivation, and performance enhancement'),
  ('Personal Development', 'Self-improvement, career growth, and skill development'),
  ('Legal Studies', 'Legal frameworks, compliance, and regulatory affairs'),
  ('Technology Law', 'Legal aspects of technology, digital rights, and cyber law'),
  ('Ethics', 'Professional ethics, technology ethics, and moral philosophy'),
  ('Public Speaking', 'Presentation skills, communication, and audience engagement'),
  ('Communication', 'Interpersonal communication, business communication, and rhetoric'),
  ('Biotech', 'Biotechnology, life sciences, and biological research'),
  ('Healthtech', 'Healthcare technology, medical devices, and health informatics'),
  ('AI Ethics', 'Ethical AI development, bias mitigation, and responsible technology'),
  ('Data Policy', 'Data governance, privacy regulations, and policy development'),
  ('Healthcare Analytics', 'Medical data analysis, health outcomes research, and clinical analytics'),
  ('Product Research', 'Market research, user studies, and product validation'),
  ('Blockchain', 'Distributed ledger technology, cryptocurrencies, and decentralized systems'),
  ('Cloud Computing', 'Cloud infrastructure, distributed systems, and cloud-native development'),
  ('DevOps', 'Development operations, CI/CD, and infrastructure automation'),
  ('Software Architecture', 'System design, architectural patterns, and scalable systems')
ON CONFLICT (name) DO NOTHING;

-- Link speakers to their topics (parse the primary_topic field and create associations)
-- This creates speaker-topic associations based on the primary_topic field
WITH speaker_topic_mapping AS (
  SELECT 
    s.id as speaker_id,
    t.id as topic_id
  FROM public.speakers s
  JOIN public.profiles p ON s.profile_id = p.id
  JOIN public.topics t ON (
    LOWER(s.primary_topic) LIKE '%' || LOWER(t.name) || '%' OR
    LOWER(t.name) LIKE '%' || LOWER(s.primary_topic) || '%' OR
    CASE 
      WHEN LOWER(s.primary_topic) LIKE '%data science%' AND LOWER(t.name) = 'data science' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%machine learning%' AND LOWER(t.name) = 'machine learning' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%ai%' AND LOWER(t.name) = 'artificial intelligence' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%ux%' AND LOWER(t.name) = 'ux design' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%product%' AND LOWER(t.name) LIKE '%product%' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%leadership%' AND LOWER(t.name) = 'leadership' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%software%' AND LOWER(t.name) = 'software engineering' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%backend%' AND LOWER(t.name) = 'backend development' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%legal%' AND LOWER(t.name) = 'legal studies' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%law%' AND LOWER(t.name) LIKE '%law%' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%cloud%' AND LOWER(t.name) = 'cloud computing' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%devops%' AND LOWER(t.name) = 'devops' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%blockchain%' AND LOWER(t.name) = 'blockchain' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%research%' AND LOWER(t.name) LIKE '%research%' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%analytics%' AND LOWER(t.name) LIKE '%analytics%' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%health%' AND LOWER(t.name) LIKE '%health%' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%motivation%' AND LOWER(t.name) = 'motivation' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%communication%' AND LOWER(t.name) = 'communication' THEN true
      WHEN LOWER(s.primary_topic) LIKE '%speaking%' AND LOWER(t.name) = 'public speaking' THEN true
      ELSE false
    END
  )
  WHERE p.email IN (
    'balidin.dongoran@gmail.com', 'darmana.mandala@gmail.com', 'ciaobella.wastutid@gmail.com', 
    'lantar.anggraini@gmail.com', 'among.iswahyudi@gmail.com', 'daruna.mayasari@gmail.com',
    'cut.putri.napitupulu@gmail.com', 'sadina.palastriarm@gmail.com', 'ikin.rahmawati@gmail.com',
    'yessi.ardianto@gmail.com', '.capa.anggrainisi@gmail.com', 'eva.pratama@gmail.com',
    'tgk..baktiono.iswahyudios@gmail.com', 'gatot.situmorang@gmail.com', 'tgk..yani.gunawan@gmail.com',
    'michelle.nasyiah@gmail.com', 'cindy.puspasari@gmail.com', 'yance.utami@gmail.com',
    'dr..ratih.nababan@gmail.com', 'betania.gunawan@gmail.com'
  )
)
INSERT INTO public.speaker_topics (speaker_id, topic_id)
SELECT DISTINCT speaker_id, topic_id
FROM speaker_topic_mapping
ON CONFLICT (speaker_id, topic_id) DO NOTHING;

-- Update the statistics to reflect the inserted data
-- This ensures any triggers or computed fields are properly updated
UPDATE public.speakers 
SET updated_at = now()
WHERE profile_id IN (
  SELECT id FROM public.profiles 
  WHERE email IN (
    'balidin.dongoran@gmail.com', 'darmana.mandala@gmail.com', 'ciaobella.wastutid@gmail.com', 
    'lantar.anggraini@gmail.com', 'among.iswahyudi@gmail.com', 'daruna.mayasari@gmail.com',
    'cut.putri.napitupulu@gmail.com', 'sadina.palastriarm@gmail.com', 'ikin.rahmawati@gmail.com',
    'yessi.ardianto@gmail.com', '.capa.anggrainisi@gmail.com', 'eva.pratama@gmail.com',
    'tgk..baktiono.iswahyudios@gmail.com', 'gatot.situmorang@gmail.com', 'tgk..yani.gunawan@gmail.com',
    'michelle.nasyiah@gmail.com', 'cindy.puspasari@gmail.com', 'yance.utami@gmail.com',
    'dr..ratih.nababan@gmail.com', 'betania.gunawan@gmail.com'
  )
);
