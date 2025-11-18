CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    entity_type TEXT NULL,
    entity_id UUID NULL,
    description TEXT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    CONSTRAINT user_activities_pkey PRIMARY KEY (id),
    CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE,
    CONSTRAINT user_activities_activity_type_check CHECK (
        activity_type = ANY (
            ARRAY[
                'login'::text,
                'logout'::text,
                'download'::text,
                'review'::text,
                'upload'::text,
                'update'::text,
                'delete'::text
            ]
        )
    ),
    CONSTRAINT user_activities_entity_type_check CHECK (
        entity_type = ANY (
            ARRAY[
                'app'::text,
                'review'::text,
                'user'::text,
                'notification'::text
            ]
        ) OR entity_type IS NULL
    )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_activities_user 
    ON public.user_activities (user_id) 
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_user_activities_type 
    ON public.user_activities (activity_type) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_activities_created_at 
    ON public.user_activities (created_at DESC) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_activities_entity 
    ON public.user_activities (entity_type, entity_id) 
    WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL
    TABLESPACE pg_default;

COMMENT ON TABLE public.user_activities IS 'Tracks user activities for auditing and analytics';
COMMENT ON COLUMN public.user_activities.user_id IS 'User who performed the activity';
COMMENT ON COLUMN public.user_activities.activity_type IS 'Type of activity performed';
COMMENT ON COLUMN public.user_activities.entity_type IS 'Type of entity the activity relates to';
COMMENT ON COLUMN public.user_activities.entity_id IS 'ID of the entity the activity relates to';
COMMENT ON COLUMN public.user_activities.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN public.user_activities.ip_address IS 'IP address of the user when the activity occurred';
COMMENT ON COLUMN public.user_activities.user_agent IS 'User agent string of the user''s device';
COMMENT ON COLUMN public.user_activities.created_at IS 'When the activity occurred';

CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO public.user_activities (
        user_id,
        activity_type,
        entity_type,
        entity_id,
        description,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_entity_type,
        p_entity_id,
        p_description,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_activity_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    activity_type TEXT,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.activity_type,
        ua.entity_type,
        ua.entity_id,
        ua.description,
        ua.created_at
    FROM 
        public.user_activities ua
    WHERE 
        ua.user_id = p_user_id
    ORDER BY 
        ua.created_at DESC
    LIMIT 
        p_limit
    OFFSET 
        p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
