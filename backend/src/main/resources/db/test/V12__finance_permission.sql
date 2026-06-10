ALTER TABLE app_users
ADD COLUMN can_access_finance BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET can_access_finance = TRUE
WHERE roles LIKE '%admin%';
