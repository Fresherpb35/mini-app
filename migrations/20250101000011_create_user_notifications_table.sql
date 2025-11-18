CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL,
    user_id UUID NOT NULL,
    read BOOLEAN NULL DEFAULT false,
    read_at TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    
    
    CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT user_notifications_notification_id_user_id_key UNIQUE (notification_id, user_id),
    CONSTRAINT user_notifications_notification_id_fkey FOREIGN KEY (notification_id) 
        REFERENCES public.notifications (id) 
        ON DELETE CASCADE,
    CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE
) TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_user_notifications_user 
    ON public.user_notifications (user_id) 
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_user_notifications_read 
    ON public.user_notifications (read) 
    WHERE read = false
    TABLESPACE pg_default;


CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
    ON public.user_notifications (created_at DESC) 
    TABLESPACE pg_default;


COMMENT ON TABLE public.user_notifications IS 'Maps notifications to users and tracks read status';
COMMENT ON COLUMN public.user_notifications.notification_id IS 'Reference to the notification';
COMMENT ON COLUMN public.user_notifications.user_id IS 'User who received the notification';
COMMENT ON COLUMN public.user_notifications.read IS 'Whether the user has read the notification';
COMMENT ON COLUMN public.user_notifications.read_at IS 'When the notification was read (NULL if unread)';
COMMENT ON COLUMN public.user_notifications.created_at IS 'When the notification was sent to the user';


CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_notifications
    SET 
        read = true,
        read_at = NOW()
    WHERE 
        notification_id = p_notification_id
        AND user_id = p_user_id
        AND read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE public.user_notifications
        SET 
            read = true,
            read_at = NOW()
        WHERE 
            user_id = p_user_id
            AND read = false
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.user_notifications
    WHERE user_id = p_user_id AND read = false;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
) RETURNS TABLE (
    id UUID,
    notification_id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    is_read BOOLEAN,
    read_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        un.id,
        un.notification_id,
        n.title,
        n.message,
        n.type,
        un.read AS is_read,
        un.read_at,
        un.created_at,
        n.metadata
    FROM 
        public.user_notifications un
    JOIN 
        public.notifications n ON un.notification_id = n.id
    WHERE 
        un.user_id = p_user_id
        AND (p_unread_only = false OR un.read = false)
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY 
        un.read ASC,
        un.created_at DESC
    LIMIT 
        p_limit
    OFFSET 
        p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.send_notification_to_users(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_user_ids UUID[],
    p_metadata JSONB DEFAULT NULL,
    p_expires_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_user_id UUID;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_error_messages TEXT[] := '{}';
    v_error_message TEXT;
    v_result RECORD;
BEGIN
    INSERT INTO public.notifications (
        title,
        message,
        type,
        metadata,
        expires_at
    ) VALUES (
        p_title,
        p_message,
        p_type,
        p_metadata,
        p_expires_at
    )
    RETURNING id INTO v_notification_id;
    
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        BEGIN
            INSERT INTO public.user_notifications (
                notification_id,
                user_id
            ) VALUES (
                v_notification_id,
                v_user_id
            );
            
            v_success_count := v_success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_error_message := format('User %s: %s', v_user_id, SQLERRM);
            v_error_messages := array_append(v_error_messages, v_error_message);
        END;
    END LOOP;
    
    INSERT INTO public.notification_delivery_log (
        notification_id,
        total_recipients,
        successful_deliveries,
        failed_deliveries,
        error_messages
    ) VALUES (
        v_notification_id,
        array_length(p_user_ids, 1),
        v_success_count,
        v_error_count,
        v_error_messages
    );
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.update_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.read = true AND (OLD.read = false OR OLD.read IS NULL) THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_update_read_at'
    ) THEN
        CREATE TRIGGER trigger_update_read_at
        BEFORE UPDATE ON public.user_notifications
        FOR EACH ROW
        WHEN (NEW.read = true AND (OLD.read IS DISTINCT FROM NEW.read))
        EXECUTE FUNCTION public.update_read_at();
    END IF;
END $$;
