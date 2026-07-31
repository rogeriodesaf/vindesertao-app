-- Equivalente H2 da atualizacao da geometria em producao.
UPDATE territories
SET polygon_geojson = '{"type":"Polygon","coordinates":[[[-35.075279,-6.784567],[-35.074709,-6.780900],[-35.079200,-6.780900],[-35.079200,-6.785010],[-35.075279,-6.784567]]]}',
    distribution_version = 'mapa-rio-2026-07-31-v2',
    published_at = CURRENT_TIMESTAMP
WHERE distribution_version = 'mapa-rio-2026-07-31-v1'
  AND team_id IN (SELECT id FROM teams WHERE name = 'Equipe Apoio 1');
