CREATE TABLE IF NOT EXISTS public.apps (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT NULL,
    version TEXT NOT NULL,
    min_sdk_version INTEGER NULL,
    target_sdk_version INTEGER NULL,
    package_name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NULL DEFAULT 0,
    is_premium BOOLEAN NULL DEFAULT false,
    changelog TEXT NULL,
    icon_url TEXT NULL,
    screenshots TEXT[] NULL,
    file_path TEXT NOT NULL,
    download_url TEXT NOT NULL,
    file_size BIGINT NULL,
    downloads INTEGER NULL DEFAULT 0,
    views INTEGER NULL DEFAULT 0,
    average_rating NUMERIC(3, 2) NULL DEFAULT 0,
    review_count INTEGER NULL DEFAULT 0,
    status TEXT NULL DEFAULT 'pending'::text,
    rejection_reason TEXT NULL,
    developer_id UUID NOT NULL,
    reviewed_by UUID NULL,
    reviewed_at TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    

    CONSTRAINT apps_pkey PRIMARY KEY (id),
    CONSTRAINT apps_package_name_key UNIQUE (package_name),
    CONSTRAINT apps_developer_id_fkey FOREIGN KEY (developer_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE,
    CONSTRAINT apps_reviewed_by_fkey FOREIGN KEY (reviewed_by) 
        REFERENCES auth.users (id),
    CONSTRAINT apps_status_check CHECK (
        status = ANY (
            ARRAY[
                'pending'::text,
                'published'::text,
                'rejected'::text,
                'suspended'::text
            ]
        )
    )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_apps_status 
    ON public.apps USING btree (status) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_apps_category 
    ON public.apps USING btree (category) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_apps_developer 
    ON public.apps USING btree (developer_id) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_apps_created_at 
    ON public.apps USING btree (created_at DESC) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_apps_rating 
    ON public.apps USING btree (average_rating DESC) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_apps_downloads 
    ON public.apps USING btree (downloads DESC) 
    TABLESPACE pg_default;

-- Create the trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_apps_updated_at'
    ) THEN
        CREATE TRIGGER trigger_apps_updated_at
        BEFORE UPDATE ON public.apps
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.apps IS 'Stores application information and metadata';
COMMENT ON COLUMN public.apps.status IS 'App status: pending, published, rejected, or suspended';
COMMENT ON COLUMN public.apps.developer_id IS 'Reference to the developer/user who owns this app';
COMMENT ON COLUMN public.apps.reviewed_by IS 'Admin who reviewed the app';
COMMENT ON COLUMN public.apps.package_name IS 'Unique package identifier (e.g., com.example.app)';
COMMENT ON COLUMN public.apps.screenshots IS 'Array of screenshot URLs';
COMMENT ON COLUMN public.apps.file_path IS 'Path to the APK file in storage';
COMMENT ON COLUMN public.apps.download_url IS 'Public URL for downloading the app';
COMMENT ON COLUMN public.apps.average_rating IS 'Cached average rating (1-5)';
COMMENT ON COLUMN public.apps.is_premium IS 'Whether the app requires payment';
COMMENT ON COLUMN public.apps.price IS 'Price in the base currency (0 for free apps)';
COMMENT ON COLUMN public.apps.min_sdk_version IS 'Minimum Android SDK version required';
COMMENT ON COLUMN public.apps.target_sdk_version IS 'Target Android SDK version';
