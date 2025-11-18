CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NULL,
    phone TEXT NULL,
    role TEXT NULL DEFAULT 'user'::text,
    status TEXT NULL DEFAULT 'active'::text,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    website TEXT NULL,
    location TEXT NULL,
    date_of_birth DATE NULL,
    email_confirmed BOOLEAN NULL DEFAULT false,
    phone_confirmed BOOLEAN NULL DEFAULT false,
    last_login TIMESTAMP WITHOUT TIME ZONE NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT users_id_fkey FOREIGN KEY (id) 
        REFERENCES auth.users (id) 
        ON DELETE CASCADE,
    CONSTRAINT users_role_check CHECK (
        role = ANY (ARRAY['user'::text, 'developer'::text, 'admin'::text])
    ),
    CONSTRAINT users_status_check CHECK (
        status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text])
    )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role 
    ON public.users USING btree (role) 
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_users_status 
    ON public.users USING btree (status) 
    TABLESPACE pg_default;

-- Create the trigger
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_users_updated_at'
    ) THEN
        CREATE TRIGGER trigger_users_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.users IS 'Stores user profile information';
COMMENT ON COLUMN public.users.role IS 'User role: user, developer, or admin';
COMMENT ON COLUMN public.users.status IS 'User status: active, suspended, or banned';
