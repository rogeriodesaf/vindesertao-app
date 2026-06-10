CREATE TABLE social_assistance_records (
  id BIGSERIAL PRIMARY KEY,
  assisted_person_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  age INTEGER,
  neighborhood VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  service_type VARCHAR(60) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  responsible_user_id BIGINT NOT NULL REFERENCES app_users(id),
  team_id BIGINT NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(180) NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(180)
);

CREATE INDEX idx_social_assistance_created_at ON social_assistance_records(created_at);
CREATE INDEX idx_social_assistance_team ON social_assistance_records(team_id);
CREATE INDEX idx_social_assistance_responsible ON social_assistance_records(responsible_user_id);
CREATE INDEX idx_social_assistance_service_type ON social_assistance_records(service_type);
CREATE INDEX idx_social_assistance_neighborhood ON social_assistance_records(neighborhood);

INSERT INTO teams(name, team_type, can_register_visits)
VALUES ('Equipe Ação Social', 'SOCIAL_ACTION', FALSE)
ON CONFLICT (name) DO UPDATE
SET team_type = EXCLUDED.team_type,
    can_register_visits = EXCLUDED.can_register_visits;

INSERT INTO user_team_memberships(user_id, team_id)
SELECT user_data.user_id, social_team.id
FROM (
  SELECT id AS user_id
  FROM app_users
  WHERE email IN (
    'filipe@gmail.com',
    'johnknox@gmail.com',
    'martin@gmail.com',
    'jan@gmail.com',
    'johnwycliffe@gmail.com',
    'teodoro@gmail.com',
    'ulrico@gmail.com',
    'george@gmail.com',
    'charles@gmail.com',
    'jhon@gmail.com',
    'awpink@gmail.com',
    'dietrich@gmail.com'
  )
) user_data
CROSS JOIN (SELECT id FROM teams WHERE name = 'Equipe Ação Social') social_team
ON CONFLICT (user_id, team_id) DO NOTHING;
