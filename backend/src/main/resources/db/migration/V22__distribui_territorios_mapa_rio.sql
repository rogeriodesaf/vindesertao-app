-- Distribuicao inicial da area exibida no mapa de Vila Regina/Monte-Mor.
-- A grade cobre integralmente a imagem, sem sobreposicoes, e exclui departamentos
-- que nao registram evangelismo (Acao Social e Infantil).
-- O bloqueio geografico permanece desligado ate validacao presencial dos limites.

INSERT INTO territories (
  name, team_id, color, polygon_geojson, active, enforce_for_projectists,
  generated, distribution_version, published_at, created_at
)
SELECT
  seed.territory_name,
  team.id,
  seed.color,
  seed.polygon_geojson,
  TRUE,
  FALSE,
  TRUE,
  'mapa-rio-2026-07-31-v1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('Territorio 01 - Equipe Apoio 1', 'Equipe Apoio 1', '#0EA5E9', '{"type":"Polygon","coordinates":[[[-35.07920,-6.78090],[-35.07465,-6.78090],[-35.07465,-6.78543],[-35.07920,-6.78543],[-35.07920,-6.78090]]]}'),
  ('Territorio 02 - Equipe Amarelo Claro', 'Equipe Amarelo Claro', '#EAB308', '{"type":"Polygon","coordinates":[[[-35.07465,-6.78090],[-35.07010,-6.78090],[-35.07010,-6.78543],[-35.07465,-6.78543],[-35.07465,-6.78090]]]}'),
  ('Territorio 03 - Equipe Amarela', 'Equipe Amarela', '#CA8A04', '{"type":"Polygon","coordinates":[[[-35.07010,-6.78090],[-35.06555,-6.78090],[-35.06555,-6.78543],[-35.07010,-6.78543],[-35.07010,-6.78090]]]}'),
  ('Territorio 04 - Equipe Azul', 'Equipe Azul', '#2563EB', '{"type":"Polygon","coordinates":[[[-35.06555,-6.78090],[-35.06100,-6.78090],[-35.06100,-6.78543],[-35.06555,-6.78543],[-35.06555,-6.78090]]]}'),
  ('Territorio 05 - Equipe Azul Escuro', 'Equipe Azul Escuro', '#1E3A8A', '{"type":"Polygon","coordinates":[[[-35.06100,-6.78090],[-35.05645,-6.78090],[-35.05645,-6.78543],[-35.06100,-6.78543],[-35.06100,-6.78090]]]}'),
  ('Territorio 06 - Equipe Apoio 2', 'Equipe Apoio 2', '#14B8A6', '{"type":"Polygon","coordinates":[[[-35.05645,-6.78090],[-35.05190,-6.78090],[-35.05190,-6.78543],[-35.05645,-6.78543],[-35.05645,-6.78090]]]}'),

  ('Territorio 07 - Equipe Apoio 3', 'Equipe Apoio 3', '#64748B', '{"type":"Polygon","coordinates":[[[-35.07920,-6.78543],[-35.07465,-6.78543],[-35.07465,-6.78996],[-35.07920,-6.78996],[-35.07920,-6.78543]]]}'),
  ('Territorio 08 - Equipe Verde Limao', 'Equipe Verde Limão', '#84CC16', '{"type":"Polygon","coordinates":[[[-35.07465,-6.78543],[-35.07010,-6.78543],[-35.07010,-6.78996],[-35.07465,-6.78996],[-35.07465,-6.78543]]]}'),
  ('Territorio 09 - Equipe Marron', 'Equipe Marron', '#92400E', '{"type":"Polygon","coordinates":[[[-35.07010,-6.78543],[-35.06555,-6.78543],[-35.06555,-6.78996],[-35.07010,-6.78996],[-35.07010,-6.78543]]]}'),
  ('Territorio 10 - Equipe Roxa', 'Equipe Roxa', '#7E22CE', '{"type":"Polygon","coordinates":[[[-35.06555,-6.78543],[-35.06100,-6.78543],[-35.06100,-6.78996],[-35.06555,-6.78996],[-35.06555,-6.78543]]]}'),
  ('Territorio 11 - Equipe Vermelha', 'Equipe Vermelha', '#DC2626', '{"type":"Polygon","coordinates":[[[-35.06100,-6.78543],[-35.05645,-6.78543],[-35.05645,-6.78996],[-35.06100,-6.78996],[-35.06100,-6.78543]]]}'),
  ('Territorio 12 - Equipe Violeta', 'Equipe Violeta', '#8B5CF6', '{"type":"Polygon","coordinates":[[[-35.05645,-6.78543],[-35.05190,-6.78543],[-35.05190,-6.78996],[-35.05645,-6.78996],[-35.05645,-6.78543]]]}'),

  ('Territorio 13 - Equipe Branca', 'Equipe Branca', '#94A3B8', '{"type":"Polygon","coordinates":[[[-35.07920,-6.78996],[-35.07465,-6.78996],[-35.07465,-6.79449],[-35.07920,-6.79449],[-35.07920,-6.78996]]]}'),
  ('Territorio 14 - Equipe Cinza', 'Equipe Cinza', '#4B5563', '{"type":"Polygon","coordinates":[[[-35.07465,-6.78996],[-35.07010,-6.78996],[-35.07010,-6.79449],[-35.07465,-6.79449],[-35.07465,-6.78996]]]}'),
  ('Territorio 15 - Equipe Laranja', 'Equipe Laranja', '#F97316', '{"type":"Polygon","coordinates":[[[-35.07010,-6.78996],[-35.06555,-6.78996],[-35.06555,-6.79449],[-35.07010,-6.79449],[-35.07010,-6.78996]]]}'),
  ('Territorio 16 - Equipe Verde', 'Equipe Verde', '#16A34A', '{"type":"Polygon","coordinates":[[[-35.06555,-6.78996],[-35.06100,-6.78996],[-35.06100,-6.79449],[-35.06555,-6.79449],[-35.06555,-6.78996]]]}'),
  ('Territorio 17 - Equipe Vinho', 'Equipe Vinho', '#881337', '{"type":"Polygon","coordinates":[[[-35.06100,-6.78996],[-35.05645,-6.78996],[-35.05645,-6.79449],[-35.06100,-6.79449],[-35.06100,-6.78996]]]}'),
  ('Territorio 18 - Equipe Rosa', 'Equipe Rosa', '#EC4899', '{"type":"Polygon","coordinates":[[[-35.05645,-6.78996],[-35.05190,-6.78996],[-35.05190,-6.79449],[-35.05645,-6.79449],[-35.05645,-6.78996]]]}')
) AS seed(territory_name, team_name, color, polygon_geojson)
JOIN teams team ON team.name = seed.team_name
WHERE team.can_register_visits = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM territories existing
    WHERE existing.team_id = team.id
      AND existing.active = TRUE
  );
