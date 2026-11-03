ALTER TABLE app_users ALTER COLUMN can_register_visits SET DEFAULT FALSE;

ALTER TABLE app_users
ADD CONSTRAINT ck_viewer_read_only CHECK (
  roles NOT LIKE '%visualizador%'
  OR (roles = 'visualizador'
      AND can_register_visits = FALSE
      AND can_view_reports = FALSE
      AND can_access_finance = FALSE
      AND can_access_children = FALSE)
);
