BEGIN;
SELECT pg_advisory_xact_lock(610018);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count integer CHECK (page_count > 0);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_key_id text;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (
 status IN ('draft','documents_ready','queued','processing','needs_verification','ready','failed')
);
INSERT INTO schema_versions(version) VALUES (2) ON CONFLICT DO NOTHING;
COMMIT;
