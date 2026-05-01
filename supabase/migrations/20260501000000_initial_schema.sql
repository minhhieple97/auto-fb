CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  language TEXT NOT NULL,
  brand_voice TEXT NOT NULL,
  target_page_id TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rss', 'api', 'static_html')),
  url TEXT NOT NULL,
  crawl_policy TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  image_urls JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(image_urls) = 'array'),
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (campaign_id, hash)
);

CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_url TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS post_drafts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  image_asset_id TEXT REFERENCES image_assets(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED')),
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_flags JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(risk_flags) = 'array'),
  approval_status TEXT NOT NULL CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS published_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_draft_id TEXT NOT NULL REFERENCES post_drafts(id) ON DELETE CASCADE,
  facebook_page_id TEXT NOT NULL,
  facebook_post_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRY_RUN_PUBLISHED', 'PUBLISHED', 'FAILED')),
  publish_payload JSONB NOT NULL,
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  graph_run_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sources_campaign_id_created_at_idx ON sources (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_items_campaign_id_created_at_idx ON content_items (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_assets_campaign_id_created_at_idx ON image_assets (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_drafts_status_created_at_idx ON post_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS published_posts_created_at_idx ON published_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_campaign_id_created_at_idx ON agent_runs (campaign_id, created_at ASC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
