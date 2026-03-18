-- Add DIA (Duration of Insulin Action) to profiles, default 4 hours
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS insulin_dia NUMERIC(3,1) DEFAULT 4.0;

-- Create basal_logs table for long-acting insulin tracking
CREATE TABLE IF NOT EXISTS basal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  dose NUMERIC(5,1) NOT NULL,
  insulin_name TEXT DEFAULT 'Lantus',
  injected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_basal_logs_telegram_id ON basal_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_basal_logs_injected_at ON basal_logs(injected_at);
