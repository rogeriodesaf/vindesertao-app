CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES app_users(id),
  actor_email VARCHAR(180),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT,
  before_data TEXT,
  after_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);

CREATE TABLE user_team_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id),
  old_team_id BIGINT REFERENCES teams(id),
  old_team_name VARCHAR(120),
  new_team_id BIGINT REFERENCES teams(id),
  new_team_name VARCHAR(120),
  changed_by_user_id BIGINT REFERENCES app_users(id),
  changed_by_email VARCHAR(180),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_team_history_user ON user_team_history(user_id);
CREATE INDEX idx_user_team_history_changed_at ON user_team_history(changed_at);

CREATE TABLE territories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  color VARCHAR(20) NOT NULL DEFAULT '#276749',
  polygon_geojson TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  enforce_for_projectists BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_territories_team ON territories(team_id);
CREATE INDEX idx_territories_active ON territories(active);
