ALTER TABLE household_visits ADD COLUMN photo_data CLOB;
ALTER TABLE household_visits ADD COLUMN photo_content_type VARCHAR(80);
ALTER TABLE household_visits ADD COLUMN photo_file_name VARCHAR(180);
