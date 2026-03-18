-- Add `cgm_settings` JSONB column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cgm_settings JSONB DEFAULT '{"type": "none", "nightscout_url": "", "nightscout_token": ""}'::jsonb;
