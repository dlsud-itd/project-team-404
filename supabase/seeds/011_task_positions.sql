with fixture_projects(name, color, sort_order) as (
  values
    ('Reorder - Project One', '#246B5E', 20),
    ('Reorder - Project Two', '#D97706', 21)
)
insert into public.tbl_project (
  user_id,
  name,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  sort_order
)
select
  profile.user_id,
  fixture.name,
  fixture.color,
  false,
  false,
  false,
  fixture.sort_order
from fixture_projects as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
where not exists (
  select 1
  from public.tbl_project as existing
  where existing.user_id = profile.user_id
    and existing.name = fixture.name
    and existing.deleted_at is null
);

with project_one_tasks(title, position, created_at) as (
  values
    ('Reorder seed 01', 1, now() - interval '2 days'),
    ('Reorder seed 02', 2, now() - interval '5 days'),
    ('Reorder seed 03', 3, now() - interval '1 day'),
    ('Reorder seed 04', 4, now() - interval '6 days'),
    ('Reorder seed 05', 5, now() - interval '3 days'),
    ('Reorder seed 06', 6, now() - interval '4 days')
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  created_at,
  updated_at,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  'Seed task for project-wide custom ordering.',
  priority.priority_id,
  fixture.position,
  fixture.created_at,
  fixture.created_at,
  false,
  null
from project_one_tasks as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Reorder - Project One'
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.is_default
  and priority.deleted_at is null
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = profile.user_id
    and existing.project_id = project.project_id
    and existing.title = fixture.title
    and existing.deleted_at is null
);

update public.tbl_task as task
set
  position = fixture.position,
  created_at = fixture.created_at,
  updated_at = fixture.created_at
from (
  values
    ('Reorder seed 01', 1, now() - interval '2 days'),
    ('Reorder seed 02', 2, now() - interval '5 days'),
    ('Reorder seed 03', 3, now() - interval '1 day'),
    ('Reorder seed 04', 4, now() - interval '6 days'),
    ('Reorder seed 05', 5, now() - interval '3 days'),
    ('Reorder seed 06', 6, now() - interval '4 days')
) as fixture(title, position, created_at)
join public.tbl_project as project
  on project.name = 'Reorder - Project One'
join public.tbl_user as profile on profile.email = 'james@example.com'
where task.user_id = profile.user_id
  and task.project_id = project.project_id
  and task.title = fixture.title
  and task.deleted_at is null;

with project_two_tasks(title, position, created_at) as (
  values
    ('Reorder second 01', 1, now() - interval '4 days'),
    ('Reorder second 02', 2, now() - interval '1 day'),
    ('Reorder second 03', 3, now() - interval '3 days')
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  created_at,
  updated_at,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  'Seed task proving positions are scoped per project.',
  priority.priority_id,
  fixture.position,
  fixture.created_at,
  fixture.created_at,
  false,
  null
from project_two_tasks as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Reorder - Project Two'
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.is_default
  and priority.deleted_at is null
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = profile.user_id
    and existing.project_id = project.project_id
    and existing.title = fixture.title
    and existing.deleted_at is null
);

update public.tbl_task as task
set
  position = fixture.position,
  created_at = fixture.created_at,
  updated_at = fixture.created_at
from (
  values
    ('Reorder second 01', 1, now() - interval '4 days'),
    ('Reorder second 02', 2, now() - interval '1 day'),
    ('Reorder second 03', 3, now() - interval '3 days')
) as fixture(title, position, created_at)
join public.tbl_project as project
  on project.name = 'Reorder - Project Two'
join public.tbl_user as profile on profile.email = 'james@example.com'
where task.user_id = profile.user_id
  and task.project_id = project.project_id
  and task.title = fixture.title
  and task.deleted_at is null;
