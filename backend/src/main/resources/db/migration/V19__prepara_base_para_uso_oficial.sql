-- Limpeza única dos dados de demonstração antes do uso oficial.
-- As estruturas, migrations e configurações do sistema são preservadas.

DELETE FROM password_reset_tokens;
DELETE FROM inscricoes;
DELETE FROM children_ministry_records;
DELETE FROM financial_transactions;
DELETE FROM social_assistance_records;
DELETE FROM household_visits;
DELETE FROM territories;
DELETE FROM user_team_history;
DELETE FROM user_team_memberships;
DELETE FROM audit_logs;

-- A equipe referencia seu líder; o vínculo precisa ser removido antes dos usuários.
UPDATE teams SET leader_id = NULL;
DELETE FROM app_users;
DELETE FROM teams;

INSERT INTO app_users (
  name,
  email,
  password_hash,
  roles,
  team_id,
  active,
  created_at,
  updated_at,
  must_change_password,
  can_register_visits,
  can_view_reports,
  can_access_finance,
  can_access_children
) VALUES (
  'Rogério de Sá',
  'rogeriodesaf@gmail.com',
  '$2a$10$TvpvwNbiyim2DbOP.9Ae..7Jz75plmlvwV0Cw.eUFkPlGgzKrKtkS',
  'admin',
  NULL,
  TRUE,
  now(),
  NULL,
  FALSE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
);
