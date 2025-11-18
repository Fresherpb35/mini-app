CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT NULL,
    is_public BOOLEAN NULL DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT system_settings_pkey PRIMARY KEY (id),
    CONSTRAINT system_settings_key_key UNIQUE (key)
) TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_system_settings_public 
    ON public.system_settings (is_public) 
    WHERE is_public = true
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_system_settings_created_at 
    ON public.system_settings (created_at DESC) 
    TABLESPACE pg_default;


COMMENT ON TABLE public.system_settings IS 'Stores system-wide configuration settings';
COMMENT ON COLUMN public.system_settings.key IS 'Unique key for the setting';
COMMENT ON COLUMN public.system_settings.value IS 'JSON value of the setting (can be any valid JSON type)';
COMMENT ON COLUMN public.system_settings.description IS 'Description of what this setting controls';
COMMENT ON COLUMN public.system_settings.is_public IS 'Whether this setting can be read without authentication';
COMMENT ON COLUMN public.system_settings.created_at IS 'When the setting was created';
COMMENT ON COLUMN public.system_settings.updated_at IS 'When the setting was last updated';


DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_system_settings_updated_at'
    ) THEN
        CREATE TRIGGER trigger_system_settings_updated_at
        BEFORE UPDATE ON public.system_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;


CREATE OR REPLACE FUNCTION public.get_setting(setting_key TEXT, default_value JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT value INTO setting_value
    FROM public.system_settings
    WHERE key = setting_key
    AND (is_public = true OR current_setting('role') = 'service_role');
    
    RETURN COALESCE(setting_value, default_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.set_setting(
    setting_key TEXT,
    setting_value JSONB,
    setting_description TEXT DEFAULT NULL,
    setting_is_public BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.system_settings (key, value, description, is_public)
    VALUES (setting_key, setting_value, setting_description, setting_is_public)
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        is_public = EXCLUDED.is_public,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
