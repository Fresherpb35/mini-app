-- ========================================
-- APPS TABLE SEEDER
-- Insert 5 sample apps with realistic data
-- ========================================

-- Note: Replace 'YOUR_USER_ID_HERE' with an actual user UUID from your auth.users table
-- You can get a valid UUID by running: SELECT id FROM auth.users LIMIT 1;

-- Alternative: If you want to create a test developer user first, uncomment below:
/*
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'developer@test.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456',  -- dummy hash
  NOW(),
  '{"role": "developer"}'::jsonb,
  NOW(),
  NOW()
);
*/

INSERT INTO public.apps (
  name,
  description,
  short_description,
  version,
  mini_android_version,
  min_sdk_version,
  target_sdk_version,
  package_name,
  category,
  price,
  is_premium,
  changelog,
  icon_url,
  screenshots,
  file_path,
  download_url,
  file_size,
  downloads,
  views,
  average_rating,
  review_count,
  status,
  developer_id
) VALUES

-- App 1: Social Media App
(
  'SocialHub',
  'Connect with friends and family through photos, videos, and messages. Share your moments and stay updated with what matters most to you. SocialHub brings people together with an easy-to-use interface and powerful features.',
  'Connect and share with friends',
  '2.5.0',
  '6.0',
  23,
  33,
  'com.socialhub.app',
  'Social',
  0.00,
  false,
  'Bug fixes and performance improvements. Added dark mode support.',
  'https://placehold.co/512x512/4F46E5/fff?text=SH',
  ARRAY[
    'https://placehold.co/1080x1920/4F46E5/fff?text=Screenshot+1',
    'https://placehold.co/1080x1920/7C3AED/fff?text=Screenshot+2',
    'https://placehold.co/1080x1920/DB2777/fff?text=Screenshot+3'
  ],
  'apps/socialhub-v2.5.0.apk',
  'https://storage.example.com/apps/socialhub-v2.5.0.apk',
  25600000,
  15420,
  48320,
  4.6,
  1250,
  'published',
  '9cb00872-24d8-4e2a-ab7f-66d103b6bdbc'
),

-- App 2: Productivity App
(
  'TaskMaster Pro',
  'Boost your productivity with TaskMaster Pro. Organize tasks, set reminders, collaborate with teams, and track your progress. Features include project management, time tracking, and calendar integration.',
  'Ultimate task management tool',
  '3.1.2',
  '7.0',
  24,
  33,
  'com.taskmaster.pro',
  'Productivity',
  4.99,
  true,
  'New features: Kanban boards, team collaboration, recurring tasks.',
  'https://placehold.co/512x512/10B981/fff?text=TM',
  ARRAY[
    'https://placehold.co/1080x1920/10B981/fff?text=Tasks',
    'https://placehold.co/1080x1920/059669/fff?text=Projects',
    'https://placehold.co/1080x1920/047857/fff?text=Calendar'
  ],
  'apps/taskmaster-v3.1.2.apk',
  'https://storage.example.com/apps/taskmaster-v3.1.2.apk',
  18900000,
  8750,
  22100,
  4.8,
  890,
  'published',
  '9cb00872-24d8-4e2a-ab7f-66d103b6bdbc'
),

-- App 3: Entertainment App
(
  'MusicFlow',
  'Stream millions of songs with MusicFlow. Create playlists, discover new artists, and enjoy high-quality audio streaming. Features offline mode, lyrics display, and personalized recommendations.',
  'Your music, your way',
  '5.0.1',
  '6.0',
  23,
  34,
  'com.musicflow.player',
  'Entertainment',
  0.00,
  false,
  'Major update: New UI design, improved audio quality, added podcast support.',
  'https://placehold.co/512x512/F59E0B/fff?text=MF',
  ARRAY[
    'https://placehold.co/1080x1920/F59E0B/fff?text=Player',
    'https://placehold.co/1080x1920/D97706/fff?text=Playlists',
    'https://placehold.co/1080x1920/B45309/fff?text=Discover',
    'https://placehold.co/1080x1920/92400E/fff?text=Library'
  ],
  'apps/musicflow-v5.0.1.apk',
  'https://storage.example.com/apps/musicflow-v5.0.1.apk',
  42300000,
  32150,
  95400,
  4.5,
  2840,
  'published',
  '9cb00872-24d8-4e2a-ab7f-66d103b6bdbc'
),

-- App 4: Health & Fitness App
(
  'FitTracker',
  'Track your fitness journey with FitTracker. Monitor workouts, count calories, set fitness goals, and analyze your progress. Integrates with popular fitness devices and provides personalized workout plans.',
  'Your personal fitness companion',
  '1.8.0',
  '8.0',
  26,
  33,
  'com.fittracker.health',
  'Health',
  2.99,
  true,
  'Added: Yoga routines, meditation timer, water intake tracking.',
  'https://placehold.co/512x512/EF4444/fff?text=FT',
  ARRAY[
    'https://placehold.co/1080x1920/EF4444/fff?text=Dashboard',
    'https://placehold.co/1080x1920/DC2626/fff?text=Workouts',
    'https://placehold.co/1080x1920/B91C1C/fff?text=Stats'
  ],
  'apps/fittracker-v1.8.0.apk',
  'https://storage.example.com/apps/fittracker-v1.8.0.apk',
  15200000,
  5680,
  14200,
  4.7,
  456,
  'published',
  '9cb00872-24d8-4e2a-ab7f-66d103b6bdbc'
),

-- App 5: Education App
(
  'LearnQuick',
  'Master new skills with LearnQuick. Access thousands of courses on programming, design, business, and more. Interactive lessons, quizzes, and certificates. Learn at your own pace with offline support.',
  'Learn anything, anytime',
  '2.0.3',
  '6.0',
  23,
  33,
  'com.learnquick.education',
  'Education',
  0.00,
  false,
  'New: AI-powered learning paths, progress tracking, community forums.',
  'https://placehold.co/512x512/3B82F6/fff?text=LQ',
  ARRAY[
    'https://placehold.co/1080x1920/3B82F6/fff?text=Courses',
    'https://placehold.co/1080x1920/2563EB/fff?text=Learning',
    'https://placehold.co/1080x1920/1D4ED8/fff?text=Progress',
    'https://placehold.co/1080x1920/1E40AF/fff?text=Certificates'
  ],
  'apps/learnquick-v2.0.3.apk',
  'https://storage.example.com/apps/learnquick-v2.0.3.apk',
  28700000,
  12350,
  35600,
  4.4,
  1120,
  'published',
  '9cb00872-24d8-4e2a-ab7f-66d103b6bdbc'
);

-- ========================================
-- VERIFICATION QUERY
-- Run this after inserting to verify the data
-- ========================================
-- SELECT 
--   name, 
--   version, 
--   category, 
--   status, 
--   downloads,
--   average_rating,
--   price
-- FROM public.apps
-- ORDER BY created_at DESC
-- LIMIT 5;
