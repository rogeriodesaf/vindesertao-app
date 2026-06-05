ALTER TABLE teams ADD COLUMN leader_id BIGINT;

ALTER TABLE household_visits ADD COLUMN person_age INTEGER;
ALTER TABLE household_visits ADD COLUMN household_size INTEGER;
ALTER TABLE household_visits ADD COLUMN reference_point CLOB;
ALTER TABLE household_visits ADD COLUMN prayer_request CLOB;
ALTER TABLE household_visits ADD COLUMN next_visit_at TIMESTAMP;

UPDATE teams SET leader_id = 1 WHERE id = 1;
