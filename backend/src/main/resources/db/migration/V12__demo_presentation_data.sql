INSERT INTO teams(name, team_type, can_register_visits)
VALUES
  ('Equipe Azul', 'EVANGELISM', TRUE),
  ('Equipe Amarela', 'EVANGELISM', TRUE),
  ('Equipe Acao Social', 'SOCIAL_ACTION', FALSE),
  ('Equipe Musica', 'MUSIC', FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO app_users(name, email, password_hash, roles, team_id, active, created_at, must_change_password, can_register_visits, can_view_reports)
VALUES
  ('Joao Oliveira', 'joao.azul@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Azul'), TRUE, now(), FALSE, TRUE, TRUE),
  ('Maria Santos', 'maria.azul@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Azul'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Pedro Lima', 'pedro.azul@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Azul'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Ana Costa', 'ana.amarela@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Amarela'), TRUE, now(), FALSE, TRUE, TRUE),
  ('Lucas Pereira', 'lucas.amarela@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Amarela'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Dra. Helena Rocha', 'helena.social@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Acao Social'), TRUE, now(), FALSE, FALSE, FALSE),
  ('Rafael Nunes', 'rafael.musica@vindesertao.local', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Musica'), TRUE, now(), FALSE, FALSE, FALSE)
ON CONFLICT (email) DO NOTHING;

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'joao.azul@vindesertao.local')
WHERE name = 'Equipe Azul';

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'ana.amarela@vindesertao.local')
WHERE name = 'Equipe Amarela';

INSERT INTO user_team_memberships(user_id, team_id)
SELECT (SELECT id FROM app_users WHERE email = 'rafael.musica@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Azul')
WHERE EXISTS (SELECT 1 FROM app_users WHERE email = 'rafael.musica@vindesertao.local')
  AND EXISTS (SELECT 1 FROM teams WHERE name = 'Equipe Azul')
ON CONFLICT (user_id, team_id) DO NOTHING;

INSERT INTO territories(name, team_id, color, polygon_geojson, active, enforce_for_projectists)
VALUES
  ('Regiao Azul - Centro', (SELECT id FROM teams WHERE name = 'Equipe Azul'), '#2563eb',
   '{"type":"Polygon","coordinates":[[[-39.317,-7.231],[-39.309,-7.231],[-39.309,-7.224],[-39.317,-7.224],[-39.317,-7.231]]]}', TRUE, FALSE),
  ('Regiao Amarela - Norte', (SELECT id FROM teams WHERE name = 'Equipe Amarela'), '#d9a400',
   '{"type":"Polygon","coordinates":[[[-39.311,-7.222],[-39.303,-7.222],[-39.303,-7.216],[-39.311,-7.216],[-39.311,-7.222]]]}', TRUE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO household_visits(
  person_name, phone, street, number, neighborhood, city, manual_address, latitude, longitude,
  wants_visits, person_age, household_size, reference_point, prayer_request, next_visit_at, notes,
  responsible_user_id, team_id, created_at, created_by, street_view_url
)
SELECT *
FROM (
  VALUES
    ('Dona Francisca', '(88) 98888-1001', 'Rua Sao Jose', '42', 'Centro', 'Sertao', 'Rua Sao Jose, Centro', -7.2278, -39.3135, TRUE, 62, 3, 'Casa azul perto da praca', 'Saude da familia', now() + interval '7 days', 'Recebeu bem a equipe e pediu retorno.', (SELECT id FROM app_users WHERE email = 'joao.azul@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Azul'), now() - interval '2 days', 'joao.azul@vindesertao.local', 'https://www.google.com/maps'),
    ('Seu Antonio', '(88) 98888-1002', 'Rua das Flores', '18', 'Centro', 'Sertao', 'Rua das Flores, Centro', -7.2264, -39.3147, FALSE, 70, 2, 'Portao verde', NULL, NULL, 'Agradeceu, mas nao deseja novas visitas por enquanto.', (SELECT id FROM app_users WHERE email = 'maria.azul@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Azul'), now() - interval '1 day', 'maria.azul@vindesertao.local', NULL),
    ('Familia Oliveira', '(88) 98888-1003', 'Travessa Esperanca', '103', 'Centro', 'Sertao', 'Travessa Esperanca, Centro', -7.2291, -39.3118, TRUE, 38, 5, 'Proximo ao mercadinho', 'Emprego e reconciliacao familiar', now() + interval '10 days', 'Familia demonstrou interesse em estudo biblico.', (SELECT id FROM app_users WHERE email = 'pedro.azul@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Azul'), now(), 'pedro.azul@vindesertao.local', NULL),
    ('Rita Almeida', '(88) 98888-2001', 'Rua Nova', '77', 'Norte', 'Sertao', 'Rua Nova, Norte', -7.2194, -39.3077, TRUE, 45, 4, 'Ao lado da escola', 'Filho enfermo', now() + interval '5 days', 'Solicitou retorno com a equipe feminina.', (SELECT id FROM app_users WHERE email = 'ana.amarela@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Amarela'), now() - interval '3 days', 'ana.amarela@vindesertao.local', NULL),
    ('Carlos Mendes', '(88) 98888-2002', 'Rua Projetada', '12', 'Norte', 'Sertao', 'Rua Projetada, Norte', -7.2182, -39.3056, FALSE, 33, 1, 'Casa sem muro', NULL, NULL, 'Informou que nao deseja visita, mas aceitou material informativo.', (SELECT id FROM app_users WHERE email = 'lucas.amarela@vindesertao.local'), (SELECT id FROM teams WHERE name = 'Equipe Amarela'), now() - interval '1 day', 'lucas.amarela@vindesertao.local', NULL)
) AS visit(person_name, phone, street, number, neighborhood, city, manual_address, latitude, longitude, wants_visits, person_age, household_size, reference_point, prayer_request, next_visit_at, notes, responsible_user_id, team_id, created_at, created_by, street_view_url)
WHERE NOT EXISTS (
  SELECT 1
  FROM household_visits existing
  WHERE existing.person_name = visit.person_name
    AND existing.phone = visit.phone
);
