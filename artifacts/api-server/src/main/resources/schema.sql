CREATE TABLE IF NOT EXISTS url_mappings (
    id SERIAL PRIMARY KEY,
    short_code VARCHAR(32) NOT NULL UNIQUE,
    original_url VARCHAR(2048) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    click_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS url_mappings_created_at_idx ON url_mappings (created_at);
CREATE INDEX IF NOT EXISTS url_mappings_expires_at_idx ON url_mappings (expires_at);
CREATE INDEX IF NOT EXISTS url_mappings_active_idx ON url_mappings (active);