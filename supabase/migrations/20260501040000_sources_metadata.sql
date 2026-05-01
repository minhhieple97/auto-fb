-- Add metadata column to sources table for storing cURL commands and search metadata
ALTER TABLE sources ADD COLUMN metadata jsonb DEFAULT NULL;

COMMENT ON COLUMN sources.metadata IS 'Optional JSONB metadata for source-specific data (e.g., cURL command, search query/snippet)';
