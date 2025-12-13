-- Table for tracking active users and crash rates
CREATE TABLE IF NOT EXISTS public.app_usage_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    sessions_count INTEGER NULL DEFAULT 1,
    crash_count INTEGER NULL DEFAULT 0,
    total_usage_minutes INTEGER NULL DEFAULT 0,
    last_active_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT app_usage_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT app_usage_analytics_app_user_date_key UNIQUE (app_id, user_id, date),
    CONSTRAINT app_usage_analytics_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE CASCADE,
    CONSTRAINT app_usage_analytics_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_app_id 
    ON public.app_usage_analytics (app_id) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_date 
    ON public.app_usage_analytics (date DESC) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_app_date 
    ON public.app_usage_analytics (app_id, date DESC) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_app_usage_analytics_user 
    ON public.app_usage_analytics (user_id) 
    TABLESPACE pg_default;

-- Add updated_at column to app_analytics if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='app_analytics' AND column_name='updated_at'
    ) THEN
        ALTER TABLE public.app_analytics ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW();
    END IF;
END $$;

-- Add active_users_count column to app_analytics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='app_analytics' AND column_name='active_users_count'
    ) THEN
        ALTER TABLE public.app_analytics ADD COLUMN active_users_count INTEGER NULL DEFAULT 0;
    END IF;
END $$;

-- Add crash_count column to app_analytics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='app_analytics' AND column_name='crash_count'
    ) THEN
        ALTER TABLE public.app_analytics ADD COLUMN crash_count INTEGER NULL DEFAULT 0;
    END IF;
END $$;

-- Add session_count column to app_analytics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='app_analytics' AND column_name='session_count'
    ) THEN
        ALTER TABLE public.app_analytics ADD COLUMN session_count INTEGER NULL DEFAULT 0;
    END IF;
END $$;

-- Comments
COMMENT ON TABLE public.app_usage_analytics IS 'Tracks individual user activity for apps including crashes and sessions';
COMMENT ON COLUMN public.app_usage_analytics.app_id IS 'Reference to the app';
COMMENT ON COLUMN public.app_usage_analytics.user_id IS 'Reference to the user';
COMMENT ON COLUMN public.app_usage_analytics.date IS 'The date of the usage data';
COMMENT ON COLUMN public.app_usage_analytics.sessions_count IS 'Number of sessions/app opens on this day';
COMMENT ON COLUMN public.app_usage_analytics.crash_count IS 'Number of crashes on this day';
COMMENT ON COLUMN public.app_usage_analytics.total_usage_minutes IS 'Total usage time in minutes';
COMMENT ON COLUMN public.app_usage_analytics.last_active_at IS 'Last time the user was active';
