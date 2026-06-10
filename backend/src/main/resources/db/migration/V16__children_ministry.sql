ALTER TABLE app_users
ADD COLUMN can_access_children BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET can_access_children = TRUE
WHERE roles LIKE '%admin%'
   OR email = 'admin@vindesertao.local';

INSERT INTO teams(name, team_type, can_register_visits)
VALUES ('Equipe Infantil', 'CHILDREN', FALSE)
ON CONFLICT (name) DO UPDATE
SET team_type = EXCLUDED.team_type,
    can_register_visits = EXCLUDED.can_register_visits;

CREATE TABLE children_ministry_records (
  id BIGSERIAL PRIMARY KEY,
  child_name VARCHAR(160) NOT NULL,
  guardian_name VARCHAR(160),
  guardian_phone VARCHAR(40),
  age INTEGER,
  neighborhood VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  activity_name VARCHAR(160),
  notes TEXT,
  responsible_user_id BIGINT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(180) NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(180)
);

CREATE INDEX idx_children_ministry_created_at ON children_ministry_records(created_at);
CREATE INDEX idx_children_ministry_responsible ON children_ministry_records(responsible_user_id);
CREATE INDEX idx_children_ministry_neighborhood ON children_ministry_records(neighborhood);
CREATE INDEX idx_children_ministry_activity ON children_ministry_records(activity_name);
