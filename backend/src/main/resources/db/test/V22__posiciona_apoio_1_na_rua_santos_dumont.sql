-- Equivalente H2 do reposicionamento em producao.
UPDATE territories
SET polygon_geojson = CASE
      WHEN team_id IN (SELECT id FROM teams WHERE name = 'Equipe Apoio 1')
        THEN '{"type":"Polygon","coordinates":[[[-35.060144,-6.789774],[-35.061333,-6.785316],[-35.064853,-6.785654],[-35.065928,-6.789538],[-35.060566,-6.790151],[-35.060144,-6.789774]]]}'
      WHEN team_id IN (SELECT id FROM teams WHERE name = 'Equipe Roxa')
        THEN '{"type":"Polygon","coordinates":[[[-35.075279,-6.784567],[-35.074709,-6.780900],[-35.079200,-6.780900],[-35.079200,-6.785010],[-35.075279,-6.784567]]]}'
      ELSE polygon_geojson
    END,
    distribution_version = 'mapa-rio-2026-07-31-v3',
    published_at = CURRENT_TIMESTAMP
WHERE distribution_version = 'mapa-rio-2026-07-31-v2'
  AND team_id IN (
    SELECT id FROM teams WHERE name IN ('Equipe Apoio 1', 'Equipe Roxa')
  );
