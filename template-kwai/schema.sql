-- Execute no SQL Editor do Supabase
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  value REAL,
  currency TEXT DEFAULT 'BRL',
  order_id TEXT,
  click_id TEXT,
  utms JSONB DEFAULT '{}',
  url TEXT,
  user_agent TEXT,
  timestamp BIGINT NOT NULL,
  kwai_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kwai_status IN ('pending','sent','error','skipped')),
  kwai_response TEXT,
  retries INTEGER DEFAULT 0,
  page TEXT,
  pixel_id TEXT,
  product_slug TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_status ON tracking_events(kwai_status);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp DESC);
