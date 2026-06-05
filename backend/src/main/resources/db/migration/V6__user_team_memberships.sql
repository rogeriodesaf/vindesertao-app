CREATE TABLE user_team_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id),
  team_id BIGINT NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id)
);

CREATE INDEX idx_user_team_memberships_user ON user_team_memberships(user_id);
CREATE INDEX idx_user_team_memberships_team ON user_team_memberships(team_id);
