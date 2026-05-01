ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_status_check;
ALTER TABLE agent_runs
  ADD CONSTRAINT agent_runs_status_check CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'));

CREATE TABLE IF NOT EXISTS agent_workflow_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  graph_run_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED')),
  current_node_name TEXT,
  triggered_by_user_id TEXT NOT NULL,
  triggered_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_runs_graph_run_id_created_at_idx ON agent_runs (graph_run_id, created_at ASC);
CREATE INDEX IF NOT EXISTS agent_workflow_runs_campaign_id_created_at_idx ON agent_workflow_runs (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_workflow_runs_status_created_at_idx ON agent_workflow_runs (status, created_at DESC);

ALTER TABLE agent_workflow_runs ENABLE ROW LEVEL SECURITY;
