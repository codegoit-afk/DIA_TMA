-- Create my_foods table for user's personal food database
CREATE TABLE IF NOT EXISTS my_foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  xe NUMERIC(4,1) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_foods_telegram_id ON my_foods(telegram_id);

-- Add xe_corrected column to food_logs to store manual AI corrections
ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS xe_corrected NUMERIC(4,1);
