with fixture_projects(name, color, sort_order) as (
  values
    ('Board Status - Project', '#0F766E', 80)
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

with fixture_project(name, color) as (
  values ('Board Status - Project', '#0F766E'::char(7))
)
update public.tbl_project as project
set
  color = fixture.color,
  is_archived = false,
  archived_at = null,
  updated_at = now()
from fixture_project as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
where project.user_id = profile.user_id
  and project.name = fixture.name
  and project.deleted_at is null;

with task_fixtures(title, board_status, position) as (
  values
    ('Board status seed - Todo 01', 'todo', 1),
    ('Board status seed - Todo 02', 'todo', 2),
    ('Board status seed - Todo 03', 'todo', 3),
    ('Board status seed - In Progress 01', 'in_progress', 4),
    ('Board status seed - In Progress 02', 'in_progress', 5),
    ('Board status seed - Done 01', 'done', 6),
    ('Board status seed - Done 02', 'done', 7),
    ('Board status seed - Done 03', 'done', 8)
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  board_status,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  'Seed task for board status verification.',
  priority.priority_id,
  fixture.position,
  fixture.board_status::public.task_board_status,
  fixture.board_status = 'done',
  case when fixture.board_status = 'done' then now() else null end
from task_fixtures as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Board Status - Project'
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

with task_fixtures(title, board_status, position) as (
  values
    ('Board status seed - Todo 01', 'todo', 1),
    ('Board status seed - Todo 02', 'todo', 2),
    ('Board status seed - Todo 03', 'todo', 3),
    ('Board status seed - In Progress 01', 'in_progress', 4),
    ('Board status seed - In Progress 02', 'in_progress', 5),
    ('Board status seed - Done 01', 'done', 6),
    ('Board status seed - Done 02', 'done', 7),
    ('Board status seed - Done 03', 'done', 8)
)
update public.tbl_task as task
set
  board_status = fixture.board_status::public.task_board_status,
  is_done = fixture.board_status = 'done',
  done_at = case
    when fixture.board_status = 'done' then coalesce(task.done_at, now())
    else null
  end,
  position = fixture.position,
  description = 'Seed task for board status verification.',
  archived_at = null,
  updated_at = now()
from task_fixtures as fixture
join public.tbl_user as profile on profile.email = 'james@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Board Status - Project'
  and project.deleted_at is null
where task.user_id = profile.user_id
  and task.project_id = project.project_id
  and task.title = fixture.title
  and task.deleted_at is null;
