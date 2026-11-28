insert into public.tbl_project (
  user_id,
  name,
  description,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  sort_order
)
select
  profile.user_id,
  fixture.name,
  'Project for timeline range fixtures.',
  fixture.color,
  false,
  false,
  false,
  fixture.sort_order
from public.tbl_user as profile
cross join (
  values
    ('Timeline - Work', '#2563EB'::char(7), 70),
    ('Timeline - Personal', '#16A34A'::char(7), 71)
) as fixture(name, color, sort_order)
where profile.email = 'harvey@example.com'
  and not exists (
    select 1
    from public.tbl_project as existing
    where existing.user_id = profile.user_id
      and existing.name = fixture.name
      and existing.deleted_at is null
  );

update public.tbl_project as project
set color = fixture.color,
    is_archived = false,
    archived_at = null,
    updated_at = now()
from public.tbl_user as profile
cross join (
  values
    ('Timeline - Work', '#2563EB'::char(7)),
    ('Timeline - Personal', '#16A34A'::char(7))
) as fixture(name, color)
where profile.email = 'harvey@example.com'
  and project.user_id = profile.user_id
  and project.name = fixture.name
  and project.deleted_at is null;

with fixture_tasks(
  title,
  project_name,
  scheduled_offset,
  due_offset,
  is_done
) as (
  values
    ('Timeline fixture - Multi-day', 'Timeline - Work', 1, 4, false),
    ('Timeline fixture - Single-day', 'Timeline - Work', null, 2, false),
    ('Timeline fixture - Starts before week', 'Timeline - Personal', null, null, false),
    ('Timeline fixture - Ends after week', 'Timeline - Personal', null, null, false),
    ('Timeline fixture - Completed', 'Timeline - Work', null, 0, true),
    ('Timeline fixture - Overdue', 'Timeline - Personal', -4, -2, false),
    ('Timeline fixture - Undated', 'Timeline - Personal', null, null, false)
),
resolved_tasks as (
  select
    profile.user_id,
    project.project_id,
    fixture.title,
    fixture.is_done,
    case fixture.title
      when 'Timeline fixture - Starts before week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer - 2
      when 'Timeline fixture - Ends after week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 2
      else
        case when fixture.scheduled_offset is null then null
          else (now() at time zone profile.timezone)::date + fixture.scheduled_offset
        end
    end as scheduled_date,
    case
      when fixture.title = 'Timeline fixture - Starts before week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 2
      when fixture.title = 'Timeline fixture - Ends after week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 8
      when fixture.due_offset is null then null
      else (now() at time zone profile.timezone)::date + fixture.due_offset
    end as due_date
  from fixture_tasks as fixture
  join public.tbl_user as profile on profile.email = 'harvey@example.com'
  join public.tbl_project as project
    on project.user_id = profile.user_id
    and project.name = fixture.project_name
    and project.deleted_at is null
),
priority_tasks as (
  select resolved_tasks.*, priority.priority_id
  from resolved_tasks
  join public.tbl_priority_level as priority
    on priority.user_id = resolved_tasks.user_id
    and priority.is_default
    and priority.deleted_at is null
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  scheduled_date,
  due_date,
  is_done,
  board_status,
  done_at,
  archived_at,
  deleted_at
)
select
  fixture.user_id,
  fixture.project_id,
  fixture.title,
  'Relative-date task fixture for timeline API checks.',
  fixture.priority_id,
  fixture.scheduled_date,
  fixture.due_date,
  fixture.is_done,
  case when fixture.is_done then 'done'::public.task_board_status
       else 'todo'::public.task_board_status end,
  case when fixture.is_done then now() else null end,
  null,
  null
from priority_tasks as fixture
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = fixture.user_id
    and existing.project_id = fixture.project_id
    and existing.title = fixture.title
    and existing.deleted_at is null
);

with fixture_tasks(title, project_name, scheduled_offset, due_offset) as (
  values
    ('Timeline fixture - Multi-day', 'Timeline - Work', 1, 4),
    ('Timeline fixture - Single-day', 'Timeline - Work', null, 2),
    ('Timeline fixture - Starts before week', 'Timeline - Personal', null, null),
    ('Timeline fixture - Ends after week', 'Timeline - Personal', null, null),
    ('Timeline fixture - Completed', 'Timeline - Work', null, 0),
    ('Timeline fixture - Overdue', 'Timeline - Personal', -4, -2),
    ('Timeline fixture - Undated', 'Timeline - Personal', null, null)
),
resolved_tasks as (
  select
    profile.user_id,
    project.project_id,
    fixture.title,
    fixture.title = 'Timeline fixture - Completed' as is_done,
    case fixture.title
      when 'Timeline fixture - Starts before week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer - 2
      when 'Timeline fixture - Ends after week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 2
      else case when fixture.scheduled_offset is null then null
        else (now() at time zone profile.timezone)::date + fixture.scheduled_offset
      end
    end as scheduled_date,
    case
      when fixture.title = 'Timeline fixture - Starts before week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 2
      when fixture.title = 'Timeline fixture - Ends after week' then
        (now() at time zone profile.timezone)::date
          - extract(dow from (now() at time zone profile.timezone)::date)::integer + 8
      when fixture.due_offset is null then null
      else (now() at time zone profile.timezone)::date + fixture.due_offset
    end as due_date
  from fixture_tasks as fixture
  join public.tbl_user as profile on profile.email = 'harvey@example.com'
  join public.tbl_project as project
    on project.user_id = profile.user_id
    and project.name = fixture.project_name
    and project.deleted_at is null
)
update public.tbl_task as task
set
  scheduled_date = fixture.scheduled_date,
  due_date = fixture.due_date,
  is_done = fixture.is_done,
  board_status = case when fixture.is_done then 'done'::public.task_board_status
                      else 'todo'::public.task_board_status end,
  done_at = case when fixture.is_done then coalesce(task.done_at, now()) else null end,
  archived_at = null,
  deleted_at = null,
  updated_at = now()
from resolved_tasks as fixture
where task.user_id = fixture.user_id
  and task.project_id = fixture.project_id
  and task.title = fixture.title;
