-- Create `reminders` table for Smart Telegram Notifications
CREATE TABLE reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cron job performance
CREATE INDEX idx_reminders_status_scheduled ON reminders (status, scheduled_for);
