CREATE TABLE IF NOT EXISTS public.app_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL,
    date DATE NOT NULL,
    downloads_count INTEGER NULL DEFAULT 0,
    views_count INTEGER NULL DEFAULT 0,
    rating_sum INTEGER NULL DEFAULT 0,
    rating_count INTEGER NULL DEFAULT 0,
    revenue NUMERIC(10, 2) NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT app_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT app_analytics_app_id_date_key UNIQUE (app_id, date),
    CONSTRAINT app_analytics_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE CASCADE
) TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_app_analytics_app_id 
    ON public.app_analytics (app_id) 
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_app_analytics_date 
    ON public.app_analytics (date) 
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_app_analytics_app_id_date 
    ON public.app_analytics (app_id, date) 
    TABLESPACE pg_default;


COMMENT ON TABLE public.app_analytics IS 'Stores daily analytics data for applications';
COMMENT ON COLUMN public.app_analytics.app_id IS 'Reference to the app this analytics data belongs to';
COMMENT ON COLUMN public.app_analytics.date IS 'The date this analytics data represents';
COMMENT ON COLUMN public.app_analytics.downloads_count IS 'Number of downloads on this day';
COMMENT ON COLUMN public.app_analytics.views_count IS 'Number of views on this day';
COMMENT ON COLUMN public.app_analytics.rating_sum IS 'Sum of all ratings given on this day (for calculating averages)';
COMMENT ON COLUMN public.app_analytics.rating_count IS 'Number of ratings given on this day';
COMMENT ON COLUMN public.app_analytics.revenue IS 'Revenue generated on this day (in base currency)';
COMMENT ON COLUMN public.app_analytics.created_at IS 'When this record was created';
