CREATE TABLE IF NOT EXISTS facebook_pages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  facebook_page_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  topic TEXT NOT NULL,
  language TEXT NOT NULL,
  brand_voice TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_posts_per_day INTEGER NOT NULL DEFAULT 1 CHECK (schedule_posts_per_day BETWEEN 1 AND 24),
  schedule_interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (schedule_interval_minutes BETWEEN 5 AND 1440),
  schedule_start_time_local TEXT NOT NULL DEFAULT '09:00' CHECK (schedule_start_time_local ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  schedule_timezone TEXT NOT NULL DEFAULT 'Asia/Saigon',
  encrypted_page_access_token TEXT,
  page_access_token_mask TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  last_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO facebook_pages (
  id,
  campaign_id,
  name,
  facebook_page_id,
  environment,
  topic,
  language,
  brand_voice,
  llm_provider,
  llm_model,
  status,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  campaigns.id,
  campaigns.name,
  campaigns.target_page_id,
  'production',
  campaigns.topic,
  campaigns.language,
  campaigns.brand_voice,
  campaigns.llm_provider,
  campaigns.llm_model,
  campaigns.status,
  campaigns.created_at,
  campaigns.updated_at
FROM campaigns
WHERE NOT EXISTS (
  SELECT 1
  FROM facebook_pages
  WHERE facebook_pages.campaign_id = campaigns.id
);

CREATE INDEX IF NOT EXISTS facebook_pages_environment_status_idx ON facebook_pages (environment, status);
CREATE INDEX IF NOT EXISTS facebook_pages_schedule_idx
  ON facebook_pages (schedule_enabled, status, last_scheduled_at)
  WHERE schedule_enabled = true;
CREATE INDEX IF NOT EXISTS facebook_pages_campaign_id_idx ON facebook_pages (campaign_id);

ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
