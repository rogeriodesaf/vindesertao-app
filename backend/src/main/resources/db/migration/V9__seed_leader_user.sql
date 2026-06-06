INSERT INTO app_users(
  name,
  email,
  password_hash,
  roles,
  team_id,
  active,
  created_at,
  must_change_password,
  can_register_visits,
  can_view_reports
)
SELECT
  'Lider Equipe Inicial',
  'lider@vindesertao.local',
  '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq',
  'lider',
  teams.id,
  TRUE,
  now(),
  FALSE,
  TRUE,
  TRUE
FROM teams
WHERE teams.name = 'Equipe Inicial'
ON CONFLICT (email) DO NOTHING;

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'lider@vindesertao.local')
WHERE name = 'Equipe Inicial'
  AND EXISTS (SELECT 1 FROM app_users WHERE email = 'lider@vindesertao.local');
