CREATE TABLE IF NOT EXISTS public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NULL,
    icon_url TEXT NULL,
    color TEXT NULL,
    sort_order INTEGER NULL DEFAULT 0,
    is_active BOOLEAN NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
) TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_categories_sort_order 
    ON public.categories (sort_order, name) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_categories_is_active 
    ON public.categories (is_active) 
    WHERE is_active = true
    TABLESPACE pg_default;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_categories_updated_at'
    ) THEN
        CREATE TRIGGER trigger_categories_updated_at
        BEFORE UPDATE ON public.categories
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;


COMMENT ON TABLE public.categories IS 'Stores application categories for organization and filtering';
COMMENT ON COLUMN public.categories.name IS 'Unique name of the category';
COMMENT ON COLUMN public.categories.description IS 'Description of the category';
COMMENT ON COLUMN public.categories.icon_url IS 'URL to the category icon';
COMMENT ON COLUMN public.categories.color IS 'Hex color code for the category';
COMMENT ON COLUMN public.categories.sort_order IS 'Order in which categories should be displayed';
COMMENT ON COLUMN public.categories.is_active IS 'Whether the category is active and visible to users';
