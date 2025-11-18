CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NULL DEFAULT 'general'::text,
    app_id UUID NULL,
    sent_by UUID NULL,
    target_audience TEXT NULL DEFAULT 'all'::text,
    sent_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITHOUT TIME ZONE NULL,
    status TEXT NULL DEFAULT 'sent'::text,
    
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE SET NULL,
    CONSTRAINT notifications_sent_by_fkey FOREIGN KEY (sent_by) 
        REFERENCES auth.users (id) 
        ON DELETE SET NULL,
    CONSTRAINT notifications_status_check CHECK (
        status = ANY (
            ARRAY[
                'draft'::text,
                'sent'::text,
                'failed'::text,
                'cancelled'::text
            ]
        )
    ),
    CONSTRAINT notifications_target_audience_check CHECK (
        target_audience = ANY (
            ARRAY[
                'all'::text,
                'users'::text,
                'developers'::text,
                'specific'::text
            ]
        )
    ),
    CONSTRAINT notifications_type_check CHECK (
        type = ANY (
            ARRAY[
                'general'::text,
                'app_update'::text,
                'app_approved'::text,
                'app_rejected'::text,
                'system'::text,
                'promotional'::text
            ]
        )
    )
) TABLESPACE pg_default;

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON public.notifications (type) 
    TABLESPACE pg_default;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_status 
    ON public.notifications (status) 
    TABLESPACE pg_default;

-- Create index on sent_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at 
    ON public.notifications (sent_at DESC) 
    TABLESPACE pg_default;

-- Create index on expires_at for expiring notifications
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
    ON public.notifications (expires_at) 
    WHERE expires_at IS NOT NULL
    TABLESPACE pg_default;

-- Create index on app_id for app-specific notifications
CREATE INDEX IF NOT EXISTS idx_notifications_app 
    ON public.notifications (app_id) 
    WHERE app_id IS NOT NULL
    TABLESPACE pg_default;

-- Create index on sent_by for admin tracking
CREATE INDEX IF NOT EXISTS idx_notifications_sender 
    ON public.notifications (sent_by) 
    WHERE sent_by IS NOT NULL
    TABLESPACE pg_default;

-- Create index on target_audience for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_audience 
    ON public.notifications (target_audience) 
    TABLESPACE pg_default;

-- Add comments
COMMENT ON TABLE public.notifications IS 'Stores system and user notifications';
COMMENT ON COLUMN public.notifications.title IS 'Notification title';
COMMENT ON COLUMN public.notifications.message IS 'Full notification message';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification (general, app_update, app_approved, etc.)';
COMMENT ON COLUMN public.notifications.app_id IS 'Reference to the related app (if any)';
COMMENT ON COLUMN public.notifications.sent_by IS 'Admin who sent the notification';
COMMENT ON COLUMN public.notifications.target_audience IS 'Intended recipients (all, users, developers, specific)';
COMMENT ON COLUMN public.notifications.sent_at IS 'When the notification was sent';
COMMENT ON COLUMN public.notifications.expires_at IS 'When the notification expires (NULL for no expiration)';
COMMENT ON COLUMN public.notifications.status IS 'Current status of the notification';

-- Create a function to handle notification expiration
CREATE OR REPLACE FUNCTION public.check_notification_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is not set, default to 'sent'
    IF NEW.status IS NULL THEN
        NEW.status = 'sent';
    END IF;
    
    -- If expires_at is not set and status is 'sent', set default expiry (30 days)
    IF NEW.expires_at IS NULL AND NEW.status = 'sent' THEN
        NEW.expires_at = NOW() + INTERVAL '30 days';
    END IF;
    
    -- If notification is expired, update status
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status = 'sent' THEN
        NEW.status = 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for notification expiry
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_notification_expiry'
    ) THEN
        CREATE TRIGGER trigger_notification_expiry
        BEFORE INSERT OR UPDATE ON public.notifications
        FOR EACH ROW
        EXECUTE FUNCTION public.check_notification_expiry();
    END IF;
END $$;
