insert into public.tbl_user_setting (
  user_id,
  dashboard_task_limit,
  dashboard_project_limit,
  font_size,
  font_family
)
select
  user_profile.user_id,
  3,
  4,
  'large',
  'serif'
from public.tbl_user as user_profile
where user_profile.email = 'james@example.com'
on conflict (user_id) do update
set
  dashboard_task_limit = excluded.dashboard_task_limit,
  dashboard_project_limit = excluded.dashboard_project_limit,
  font_size = excluded.font_size,
  font_family = excluded.font_family,
  updated_at = now();

insert into public.tbl_user_setting (
  user_id,
  dashboard_task_limit,
  dashboard_project_limit,
  font_size,
  font_family
)
select
  user_profile.user_id,
  5,
  5,
  'medium',
  'system'
from public.tbl_user as user_profile
where user_profile.email = 'harvey@example.com'
on conflict (user_id) do update
set
  dashboard_task_limit = excluded.dashboard_task_limit,
  dashboard_project_limit = excluded.dashboard_project_limit,
  font_size = excluded.font_size,
  font_family = excluded.font_family,
  updated_at = now();
