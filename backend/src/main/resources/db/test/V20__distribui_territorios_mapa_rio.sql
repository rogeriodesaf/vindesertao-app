-- Equivalente H2 da distribuicao de producao. As equipes oficiais nao fazem
-- parte do seed de testes, portanto a instrucao valida o SQL sem inserir linhas.

INSERT INTO territories (
  name, team_id, color, polygon_geojson, active, enforce_for_projectists,
  generated, distribution_version, published_at, created_at
)
SELECT
  seed.territory_name, team.id, seed.color, seed.polygon_geojson,
  TRUE, FALSE, TRUE, 'mapa-rio-2026-07-31-v1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('Territorio 01 - Equipe Apoio 1', 'Equipe Apoio 1', '#0EA5E9', '{"type":"Polygon","coordinates":[[[-35.07920,-6.78090],[-35.07465,-6.78090],[-35.07465,-6.78543],[-35.07920,-6.78543],[-35.07920,-6.78090]]]}')
) AS seed(territory_name, team_name, color, polygon_geojson)
JOIN teams team ON team.name = seed.team_name
WHERE team.can_register_visits = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM territories existing
    WHERE existing.team_id = team.id
      AND existing.active = TRUE
  );
