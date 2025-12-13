-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_id)
);

-- Review helpful tracking table
CREATE TABLE IF NOT EXISTS review_helpful (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Review reports table
CREATE TABLE IF NOT EXISTS review_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, dismissed, action_taken
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add helpful_count column to reviews if it doesn't exist
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- Add updated_at column to reviews if it doesn't exist
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_app_id ON wishlists(app_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id ON review_helpful(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlists
CREATE POLICY "Users can view their own wishlist"
    ON wishlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
    ON wishlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
    ON wishlists FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for review_helpful
CREATE POLICY "Anyone can view review helpful marks"
    ON review_helpful FOR SELECT
    USING (true);

CREATE POLICY "Users can mark reviews as helpful"
    ON review_helpful FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmark their own helpful marks"
    ON review_helpful FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for review_reports
CREATE POLICY "Users can view their own reports"
    ON review_reports FOR SELECT
    USING (auth.uid() = reported_by);

CREATE POLICY "Users can create reports"
    ON review_reports FOR INSERT
    WITH CHECK (auth.uid() = reported_by);

-- Note: Admin access to all tables should be handled through service role or admin policies
