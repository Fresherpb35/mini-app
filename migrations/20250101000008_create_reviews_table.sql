CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    app_id UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NULL,
    is_flagged BOOLEAN NULL DEFAULT false,
    flagged_reason TEXT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),

    CONSTRAINT reviews_pkey PRIMARY KEY (id),
    CONSTRAINT reviews_user_id_app_id_key UNIQUE (user_id, app_id),
    CONSTRAINT reviews_app_id_fkey FOREIGN KEY (app_id) 
        REFERENCES public.apps (id) 
        ON DELETE CASCADE,
    CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE,
    CONSTRAINT reviews_rating_check CHECK (
        (rating >= 1) AND (rating <= 5)
    )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_app 
    ON public.reviews (app_id) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_user 
    ON public.reviews (user_id) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_rating 
    ON public.reviews (rating) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_flagged 
    ON public.reviews (is_flagged) 
    WHERE is_flagged = true
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
    ON public.reviews (created_at DESC) 
    TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION public.update_app_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating NUMERIC;
    total_reviews INTEGER;
BEGIN

    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO 
        avg_rating,
        total_reviews
    FROM 
        public.reviews
    WHERE 
        app_id = COALESCE(NEW.app_id, OLD.app_id)
        AND is_flagged = false;  

    UPDATE public.apps
    SET 
        average_rating = ROUND(avg_rating::numeric, 2),
        review_count = total_reviews,
        updated_at = NOW()
    WHERE 
        id = COALESCE(NEW.app_id, OLD.app_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_update_app_rating_delete'
    ) THEN
        CREATE TRIGGER trigger_update_app_rating_delete
        AFTER DELETE ON public.reviews
        FOR EACH ROW
        EXECUTE FUNCTION public.update_app_rating();
    END IF;


    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_update_app_rating_insert'
    ) THEN
        CREATE TRIGGER trigger_update_app_rating_insert
        AFTER INSERT ON public.reviews
        FOR EACH ROW
        EXECUTE FUNCTION public.update_app_rating();
    END IF;


    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_update_app_rating_update'
    ) THEN
        CREATE TRIGGER trigger_update_app_rating_update
        AFTER UPDATE ON public.reviews
        FOR EACH ROW
        WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.is_flagged IS DISTINCT FROM NEW.is_flagged)
        EXECUTE FUNCTION public.update_app_rating();
    END IF;
END $$;


COMMENT ON TABLE public.reviews IS 'Stores user reviews and ratings for apps';
COMMENT ON COLUMN public.reviews.user_id IS 'User who wrote the review';
COMMENT ON COLUMN public.reviews.app_id IS 'App being reviewed';
COMMENT ON COLUMN public.reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN public.reviews.comment IS 'Optional review text';
COMMENT ON COLUMN public.reviews.is_flagged IS 'Whether the review has been flagged for moderation';
COMMENT ON COLUMN public.reviews.flagged_reason IS 'Reason for flagging the review';
COMMENT ON COLUMN public.reviews.created_at IS 'When the review was created';
COMMENT ON COLUMN public.reviews.updated_at IS 'When the review was last updated';


DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_reviews_updated_at'
    ) THEN
        CREATE TRIGGER trigger_reviews_updated_at
        BEFORE UPDATE ON public.reviews
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
