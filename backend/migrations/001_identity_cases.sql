BEGIN;
SELECT pg_advisory_xact_lock(610018);
CREATE TABLE IF NOT EXISTS schema_versions (
    version integer PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'buyer'
        CHECK (role IN ('buyer','professional','evaluator','admin','super_admin')),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS one_super_admin ON users (role) WHERE role = 'super_admin';
CREATE TABLE IF NOT EXISTS cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id),
    reference text NOT NULL,
    mouza text NOT NULL,
    survey_type text NOT NULL CHECK (survey_type IN ('CS','SA','RS','BS')),
    jl_number text,
    plot_fingerprint text,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','queued','processing','needs_verification','ready','failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS cases_owner_created ON cases(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type text NOT NULL CHECK (document_type IN ('deed','mutation','khatian')),
    object_key text NOT NULL UNIQUE,
    sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
    byte_size bigint NOT NULL CHECK (byte_size > 0),
    verified_content boolean NOT NULL DEFAULT false,
    superseded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS documents_one_active_type
    ON documents(case_id, document_type) WHERE superseded_at IS NULL;
CREATE TABLE IF NOT EXISTS auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_versions(version) VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
