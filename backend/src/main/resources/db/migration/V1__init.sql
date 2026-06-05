CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE app_users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  roles VARCHAR(255) NOT NULL,
  team_id BIGINT REFERENCES teams(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE household_visits (
  id BIGSERIAL PRIMARY KEY,
  person_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  street VARCHAR(180),
  number VARCHAR(40),
  neighborhood VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  manual_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  wants_visits BOOLEAN NOT NULL,
  notes TEXT,
  responsible_user_id BIGINT NOT NULL REFERENCES app_users(id),
  team_id BIGINT REFERENCES teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(180) NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(180)
);

CREATE OR REPLACE FUNCTION set_visit_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visit_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON household_visits
FOR EACH ROW EXECUTE FUNCTION set_visit_location();

CREATE INDEX idx_visits_created_at ON household_visits(created_at);
CREATE INDEX idx_visits_responsible ON household_visits(responsible_user_id);
CREATE INDEX idx_visits_team ON household_visits(team_id);
CREATE INDEX idx_visits_neighborhood ON household_visits(neighborhood);
CREATE INDEX idx_visits_wants_visits ON household_visits(wants_visits);
CREATE INDEX idx_visits_location ON household_visits USING GIST(location);

INSERT INTO teams(name) VALUES ('Equipe Inicial') ON CONFLICT DO NOTHING;

INSERT INTO app_users(name, email, password_hash, roles, team_id, active, created_at)
VALUES (
  'Administrador',
  'admin@vindesertao.local',
  '$2a$10$A2xXsxJ5ArnHMGfdsRlsBeGI25JAR1NbQwCqj5N7iL3VZor5Q38jq',
  'admin',
  (SELECT id FROM teams WHERE name = 'Equipe Inicial'),
  TRUE,
  now()
) ON CONFLICT (email) DO NOTHING;
