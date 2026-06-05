ALTER TABLE teams
ADD COLUMN team_type VARCHAR(40) NOT NULL DEFAULT 'EVANGELISM';

ALTER TABLE teams
ADD COLUMN can_register_visits BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE app_users
ADD COLUMN can_register_visits BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE app_users
ADD COLUMN can_view_reports BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET can_view_reports = TRUE
WHERE roles LIKE '%admin%' OR roles LIKE '%lider%';
