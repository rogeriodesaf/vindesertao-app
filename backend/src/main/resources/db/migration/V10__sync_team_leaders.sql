UPDATE app_users user_account
SET
  team_id = team.id,
  can_register_visits = team.can_register_visits,
  can_view_reports = TRUE
FROM teams team
WHERE team.leader_id = user_account.id
  AND user_account.team_id IS NULL;
