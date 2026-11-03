CREATE TABLE editions (
  id BIGSERIAL PRIMARY KEY, year INTEGER NOT NULL, name VARCHAR(160) NOT NULL, locality VARCHAR(160) NOT NULL,
  starts_on DATE, ends_on DATE, status VARCHAR(20) NOT NULL DEFAULT 'PREPARATION', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ,
  CONSTRAINT ck_editions_status CHECK (status IN ('PREPARATION','ACTIVE','CLOSED'))
);
CREATE TABLE edition_access (
  id BIGSERIAL PRIMARY KEY, edition_id BIGINT NOT NULL REFERENCES editions(id), user_id BIGINT NOT NULL REFERENCES app_users(id), team_id BIGINT REFERENCES teams(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_edition_access UNIQUE (edition_id, user_id)
);
INSERT INTO editions(year, name, locality, status) VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 'Edição atual', 'Localidade atual', 'ACTIVE');
ALTER TABLE teams ADD COLUMN edition_id BIGINT REFERENCES editions(id);
ALTER TABLE household_visits ADD COLUMN edition_id BIGINT REFERENCES editions(id);
ALTER TABLE territories ADD COLUMN edition_id BIGINT REFERENCES editions(id);
UPDATE teams SET edition_id = (SELECT id FROM editions WHERE status = 'ACTIVE' ORDER BY id LIMIT 1);
UPDATE household_visits SET edition_id = (SELECT id FROM editions WHERE status = 'ACTIVE' ORDER BY id LIMIT 1);
UPDATE territories SET edition_id = (SELECT id FROM editions WHERE status = 'ACTIVE' ORDER BY id LIMIT 1);
INSERT INTO edition_access(edition_id, user_id, team_id)
SELECT e.id, u.id, u.team_id FROM editions e CROSS JOIN app_users u WHERE e.status = 'ACTIVE';
CREATE INDEX idx_teams_edition ON teams(edition_id);
CREATE INDEX idx_visits_edition ON household_visits(edition_id);
CREATE INDEX idx_territories_edition ON territories(edition_id);
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_name_key;
CREATE UNIQUE INDEX uq_teams_edition_name ON teams(edition_id, name);
CREATE UNIQUE INDEX uq_one_active_edition ON editions(status) WHERE status = 'ACTIVE';
