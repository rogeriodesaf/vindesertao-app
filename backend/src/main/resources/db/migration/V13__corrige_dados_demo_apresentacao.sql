UPDATE teams
SET name = 'Equipe Azul - Filipe Melanchton'
WHERE name = 'Equipe Azul'
  AND NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton');

UPDATE teams
SET name = 'Equipe Amarela - Jan Hus'
WHERE name = 'Equipe Amarela'
  AND NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Equipe Amarela - Jan Hus');

INSERT INTO teams(name, team_type, can_register_visits)
VALUES
  ('Equipe Azul - Filipe Melanchton', 'EVANGELISM', TRUE),
  ('Equipe Amarela - Jan Hus', 'EVANGELISM', TRUE),
  ('Equipe Verde - Ulrico Zuínglio', 'EVANGELISM', TRUE),
  ('Equipe Marron - Jhon Owen', 'EVANGELISM', TRUE)
ON CONFLICT (name) DO UPDATE
SET team_type = EXCLUDED.team_type,
    can_register_visits = EXCLUDED.can_register_visits;

DELETE FROM household_visits
WHERE created_by IN (
  'joao.azul@vindesertao.local',
  'maria.azul@vindesertao.local',
  'pedro.azul@vindesertao.local',
  'ana.amarela@vindesertao.local',
  'lucas.amarela@vindesertao.local'
)
OR person_name IN (
  'Dona Francisca',
  'Seu Antonio',
  'Familia Oliveira',
  'Rita Almeida',
  'Carlos Mendes'
);

DELETE FROM territories
WHERE name IN ('Regiao Azul - Centro', 'Regiao Amarela - Norte');

UPDATE teams
SET leader_id = NULL
WHERE leader_id IN (
  SELECT id
  FROM app_users
  WHERE email IN (
    'joao.azul@vindesertao.local',
    'maria.azul@vindesertao.local',
    'pedro.azul@vindesertao.local',
    'ana.amarela@vindesertao.local',
    'lucas.amarela@vindesertao.local',
    'helena.social@vindesertao.local',
    'rafael.musica@vindesertao.local'
  )
);

DELETE FROM user_team_memberships
WHERE user_id IN (
  SELECT id
  FROM app_users
  WHERE email IN (
    'joao.azul@vindesertao.local',
    'maria.azul@vindesertao.local',
    'pedro.azul@vindesertao.local',
    'ana.amarela@vindesertao.local',
    'lucas.amarela@vindesertao.local',
    'helena.social@vindesertao.local',
    'rafael.musica@vindesertao.local'
  )
);

DELETE FROM app_users
WHERE email IN (
  'joao.azul@vindesertao.local',
  'maria.azul@vindesertao.local',
  'pedro.azul@vindesertao.local',
  'ana.amarela@vindesertao.local',
  'lucas.amarela@vindesertao.local',
  'helena.social@vindesertao.local',
  'rafael.musica@vindesertao.local'
);

DELETE FROM teams
WHERE name IN ('Equipe Acao Social', 'Equipe Musica');

INSERT INTO app_users(name, email, password_hash, roles, team_id, active, created_at, must_change_password, can_register_visits, can_view_reports)
VALUES
  ('Filipe Melanchton', 'filipe@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), TRUE, now(), FALSE, TRUE, TRUE),
  ('John Knox', 'johnknox@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Martin Bucer', 'martin@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Jan Hus', 'jan@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Amarela - Jan Hus'), TRUE, now(), FALSE, TRUE, TRUE),
  ('John Wycliffe', 'johnwycliffe@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Amarela - Jan Hus'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Teodoro de Beza', 'teodoro@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Amarela - Jan Hus'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Ulrico Zuínglio', 'ulrico@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Verde - Ulrico Zuínglio'), TRUE, now(), FALSE, TRUE, TRUE),
  ('George Whitefield', 'george@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Verde - Ulrico Zuínglio'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Charles Haddon Spurgeon', 'charles@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Verde - Ulrico Zuínglio'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Jhon Owen', 'jhon@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'lider', (SELECT id FROM teams WHERE name = 'Equipe Marron - Jhon Owen'), TRUE, now(), FALSE, TRUE, TRUE),
  ('A. W. Pink', 'awpink@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Marron - Jhon Owen'), TRUE, now(), FALSE, TRUE, FALSE),
  ('Dietrich Bonhoeffer', 'dietrich@gmail.com', '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq', 'projetista', (SELECT id FROM teams WHERE name = 'Equipe Marron - Jhon Owen'), TRUE, now(), FALSE, TRUE, FALSE)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    roles = EXCLUDED.roles,
    team_id = EXCLUDED.team_id,
    active = TRUE,
    must_change_password = FALSE,
    can_register_visits = EXCLUDED.can_register_visits,
    can_view_reports = EXCLUDED.can_view_reports;

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'filipe@gmail.com')
WHERE name = 'Equipe Azul - Filipe Melanchton';

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'jan@gmail.com')
WHERE name = 'Equipe Amarela - Jan Hus';

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'ulrico@gmail.com')
WHERE name = 'Equipe Verde - Ulrico Zuínglio';

UPDATE teams
SET leader_id = (SELECT id FROM app_users WHERE email = 'jhon@gmail.com')
WHERE name = 'Equipe Marron - Jhon Owen';

INSERT INTO user_team_memberships(user_id, team_id)
SELECT u.id, u.team_id
FROM app_users u
WHERE u.email IN (
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
ON CONFLICT (user_id, team_id) DO NOTHING;

INSERT INTO territories(name, team_id, color, polygon_geojson, active, enforce_for_projectists)
VALUES
  ('Territorio Azul', (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), '#2563eb',
   '{"type":"Polygon","coordinates":[[[-39.317,-7.231],[-39.309,-7.231],[-39.309,-7.224],[-39.317,-7.224],[-39.317,-7.231]]]}', TRUE, FALSE),
  ('Territorio Amarelo', (SELECT id FROM teams WHERE name = 'Equipe Amarela - Jan Hus'), '#d9a400',
   '{"type":"Polygon","coordinates":[[[-39.311,-7.222],[-39.303,-7.222],[-39.303,-7.216],[-39.311,-7.216],[-39.311,-7.222]]]}', TRUE, FALSE),
  ('Territorio Verde', (SELECT id FROM teams WHERE name = 'Equipe Verde - Ulrico Zuínglio'), '#16a34a',
   '{"type":"Polygon","coordinates":[[[-39.323,-7.226],[-39.316,-7.226],[-39.316,-7.219],[-39.323,-7.219],[-39.323,-7.226]]]}', TRUE, FALSE),
  ('Territorio Marron', (SELECT id FROM teams WHERE name = 'Equipe Marron - Jhon Owen'), '#92400e',
   '{"type":"Polygon","coordinates":[[[-39.306,-7.232],[-39.299,-7.232],[-39.299,-7.225],[-39.306,-7.225],[-39.306,-7.232]]]}', TRUE, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO household_visits(
  person_name, phone, street, number, neighborhood, city, manual_address, latitude, longitude,
  wants_visits, person_age, household_size, reference_point, prayer_request, next_visit_at, notes,
  responsible_user_id, team_id, created_at, created_by, street_view_url
)
SELECT *
FROM (
  VALUES
    ('Dona Maria do Carmo', '(88) 98888-3001', 'Rua Sao Jose', '42', 'Centro', 'Sertao', 'Rua Sao Jose, Centro', -7.2278, -39.3135, TRUE, 58, 3, 'Casa azul perto da praca', 'Saude da familia', now() + interval '7 days', 'Recebeu bem a equipe e pediu retorno.', (SELECT id FROM app_users WHERE email = 'filipe@gmail.com'), (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), now() - interval '2 days', 'filipe@gmail.com', 'https://www.google.com/maps'),
    ('Seu Antonio Ferreira', '(88) 98888-3002', 'Rua das Flores', '18', 'Centro', 'Sertao', 'Rua das Flores, Centro', -7.2264, -39.3147, FALSE, 70, 2, 'Portao verde', NULL, NULL, 'Agradeceu, mas nao deseja novas visitas por enquanto.', (SELECT id FROM app_users WHERE email = 'johnknox@gmail.com'), (SELECT id FROM teams WHERE name = 'Equipe Azul - Filipe Melanchton'), now() - interval '1 day', 'johnknox@gmail.com', NULL),
    ('Rita Almeida', '(88) 98888-4001', 'Rua Nova', '77', 'Norte', 'Sertao', 'Rua Nova, Norte', -7.2194, -39.3077, TRUE, 45, 4, 'Ao lado da escola', 'Filho enfermo', now() + interval '5 days', 'Solicitou retorno com a equipe feminina.', (SELECT id FROM app_users WHERE email = 'jan@gmail.com'), (SELECT id FROM teams WHERE name = 'Equipe Amarela - Jan Hus'), now() - interval '3 days', 'jan@gmail.com', NULL),
    ('Familia Oliveira', '(88) 98888-5001', 'Travessa Esperanca', '103', 'Alto Verde', 'Sertao', 'Travessa Esperanca, Alto Verde', -7.2226, -39.3198, TRUE, 38, 5, 'Proximo ao mercadinho', 'Emprego e reconciliacao familiar', now() + interval '10 days', 'Familia demonstrou interesse em estudo biblico.', (SELECT id FROM app_users WHERE email = 'ulrico@gmail.com'), (SELECT id FROM teams WHERE name = 'Equipe Verde - Ulrico Zuínglio'), now(), 'ulrico@gmail.com', NULL),
    ('Carlos Mendes', '(88) 98888-6001', 'Rua Projetada', '12', 'Bairro Novo', 'Sertao', 'Rua Projetada, Bairro Novo', -7.2285, -39.3024, FALSE, 33, 1, 'Casa sem muro', NULL, NULL, 'Informou que nao deseja visita, mas aceitou material informativo.', (SELECT id FROM app_users WHERE email = 'jhon@gmail.com'), (SELECT id FROM teams WHERE name = 'Equipe Marron - Jhon Owen'), now() - interval '1 day', 'jhon@gmail.com', NULL)
) AS visit(person_name, phone, street, number, neighborhood, city, manual_address, latitude, longitude, wants_visits, person_age, household_size, reference_point, prayer_request, next_visit_at, notes, responsible_user_id, team_id, created_at, created_by, street_view_url)
WHERE NOT EXISTS (
  SELECT 1
  FROM household_visits existing
  WHERE existing.person_name = visit.person_name
    AND existing.phone = visit.phone
);
