CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    app_id UUID NOT NULL,
    version_downloaded TEXT NULL,
    downloaded_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    ip_address INET NULL,
    user_agent TEXT NULL,
    
    CONSTRAINT downloads_pkey PRIMARY KEY (id),
    CONSTRAINT downloads_user_id_app_id_key UNIQUE (user_id, app_id),
    CONSTRAINT downloads_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE CASCADE,
    CONSTRAINT downloads_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE
) TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_downloads_date 
    ON public.downloads (downloaded_at DESC) 
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_downloads_user 
    ON public.downloads (user_id) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_downloads_app 
    ON public.downloads (app_id) 
    TABLESPACE pg_default;


COMMENT ON TABLE public.downloads IS 'Tracks app downloads by users';
COMMENT ON COLUMN public.downloads.user_id IS 'Reference to the user who downloaded the app';
COMMENT ON COLUMN public.downloads.app_id IS 'Reference to the downloaded app';
COMMENT ON COLUMN public.downloads.version_downloaded IS 'Version of the app that was downloaded';
COMMENT ON COLUMN public.downloads.downloaded_at IS 'When the download occurred';
COMMENT ON COLUMN public.downloads.ip_address IS 'IP address of the downloader';
COMMENT ON COLUMN public.downloads.user_agent IS 'User agent string of the downloader''s device';


CREATE OR REPLACE FUNCTION public.update_app_download_count()
RETURNS TRIGGER AS $$
BEGIN
    
    UPDATE public.apps 
    SET downloads = downloads + 1,
        updated_at = NOW()
    WHERE id = NEW.app_id;
    
    
    INSERT INTO public.app_analytics (app_id, date, downloads_count)
    VALUES (NEW.app_id, CURRENT_DATE, 1)
    ON CONFLICT (app_id, date) 
    DO UPDATE 
    SET downloads_count = app_analytics.downloads_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_update_download_count'
    ) THEN
        CREATE TRIGGER trigger_update_download_count
        AFTER INSERT ON public.downloads
        FOR EACH ROW
        EXECUTE FUNCTION public.update_app_download_count();
    END IF;
END $$;
