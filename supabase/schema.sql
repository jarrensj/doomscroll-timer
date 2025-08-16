-- Create date_entries table
CREATE TABLE IF NOT EXISTS date_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_time_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create an index for faster queries by user_id and date
CREATE INDEX IF NOT EXISTS idx_date_entries_user_date 
ON date_entries(user_id, date);

-- Create an index for faster queries by user_id only
CREATE INDEX IF NOT EXISTS idx_date_entries_user 
ON date_entries(user_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_date_entries_updated_at ON date_entries;
CREATE TRIGGER update_date_entries_updated_at
    BEFORE UPDATE ON date_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS disabled since we're using Clerk auth in API routes
-- ALTER TABLE date_entries ENABLE ROW LEVEL SECURITY;
