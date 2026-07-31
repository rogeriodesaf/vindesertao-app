ALTER TABLE territories ADD COLUMN generated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE territories ADD COLUMN distribution_version VARCHAR(80);
ALTER TABLE territories ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE household_visits ADD COLUMN client_reference VARCHAR(80);
CREATE UNIQUE INDEX uq_household_visits_client_reference ON household_visits(client_reference);

CREATE TABLE territory_distribution_drafts (
  id BIGSERIAL PRIMARY KEY,
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id),
  requested_team_count INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_territory_distribution_draft_user ON territory_distribution_drafts(created_by_user_id);
