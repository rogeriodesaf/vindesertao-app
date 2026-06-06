INSERT INTO app_users(
  id,
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
VALUES (
  2,
  'Lider Equipe Inicial',
  'lider@vindesertao.local',
  '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq',
  'lider',
  1,
  TRUE,
  CURRENT_TIMESTAMP,
  FALSE,
  TRUE,
  TRUE
);

UPDATE teams
SET leader_id = 2
WHERE id = 1;
