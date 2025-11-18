CREATE TABLE IF NOT EXISTS public.featured_apps (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL,
    feature_type TEXT NULL DEFAULT 'homepage'::text,
    sort_order INTEGER NULL DEFAULT 0,
    start_date TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    end_date TIMESTAMP WITHOUT TIME ZONE NULL,
    is_active BOOLEAN NULL DEFAULT true,
    created_by UUID NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT featured_apps_pkey PRIMARY KEY (id),
    CONSTRAINT featured_apps_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE CASCADE,
    CONSTRAINT featured_apps_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES auth.users (id),
    CONSTRAINT featured_apps_feature_type_check CHECK (
        feature_type = ANY (
            ARRAY[
                'homepage'::text,
                'category'::text,
                'editor_choice'::text,
                'trending'::text
            ]
        )
    )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_featured_apps_feature_type 
    ON public.featured_apps (feature_type) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_featured_apps_sort_order 
    ON public.featured_apps (feature_type, sort_order, is_active) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_featured_apps_date_range 
    ON public.featured_apps (is_active, start_date, end_date) 
    WHERE is_active = true
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_featured_apps_app 
    ON public.featured_apps (app_id) 
    TABLESPACE pg_default;

COMMENT ON TABLE public.featured_apps IS 'Manages featured apps in different sections of the store';
COMMENT ON COLUMN public.featured_apps.app_id IS 'Reference to the featured app';
COMMENT ON COLUMN public.featured_apps.feature_type IS 'Type of feature: homepage, category, editor_choice, trending';
COMMENT ON COLUMN public.featured_apps.sort_order IS 'Order in which features should be displayed';
COMMENT ON COLUMN public.featured_apps.start_date IS 'When the feature should start being displayed';
COMMENT ON COLUMN public.featured_apps.end_date IS 'When the feature should stop being displayed (NULL for no end date)';
COMMENT ON COLUMN public.featured_apps.is_active IS 'Whether the feature is currently active';
COMMENT ON COLUMN public.featured_apps.created_by IS 'Admin user who created this feature';

CREATE OR REPLACE FUNCTION public.check_feature_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.featured_apps
        WHERE app_id = NEW.app_id
        AND feature_type = NEW.feature_type
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
        AND (
            (start_date <= COALESCE(NEW.end_date, 'infinity'::timestamp))
            AND 
            (COALESCE(end_date, 'infinity'::timestamp) >= NEW.start_date)
        )
    ) THEN
        RAISE EXCEPTION 'This app already has an active feature of type % in the specified date range', NEW.feature_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_check_feature_overlap'
    ) THEN
        CREATE TRIGGER trigger_check_feature_overlap
        BEFORE INSERT OR UPDATE ON public.featured_apps
        FOR EACH ROW
        EXECUTE FUNCTION public.check_feature_overlap();
    END IF;
END $$;
