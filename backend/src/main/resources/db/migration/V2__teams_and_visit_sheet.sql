ALTER TABLE teams ADD COLUMN leader_id BIGINT REFERENCES app_users(id);

ALTER TABLE household_visits ADD COLUMN person_age INTEGER;
ALTER TABLE household_visits ADD COLUMN household_size INTEGER;
ALTER TABLE household_visits ADD COLUMN reference_point TEXT;
ALTER TABLE household_visits ADD COLUMN prayer_request TEXT;
ALTER TABLE household_visits ADD COLUMN next_visit_at TIMESTAMPTZ;

UPDATE teams
SET leader_id = (
  SELECT id FROM app_users
  WHERE email = 'admin@vindesertao.local'
)
WHERE name = 'Equipe Inicial'
  AND leader_id IS NULL;
