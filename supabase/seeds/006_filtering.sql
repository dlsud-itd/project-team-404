with expected_projects(name, color, is_favorite, is_archived, sort_order) as (
  values
    ('Filtering - Client Work', '#3C78D8', true, false, 10),
    ('Filtering - Personal', '#8B5CF6', false, false, 11),
    ('Filtering - Archived', '#6B7280', false, true, 12)
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
  expected.name,
  expected.color,
  false,
  expected.is_favorite,
  expected.is_archived,
  expected.sort_order
from expected_projects as expected
join public.tbl_user as profile on profile.email = 'harvey@example.com'
where not exists (
  select 1
  from public.tbl_project as existing
  where existing.user_id = profile.user_id
    and existing.name = expected.name
    and existing.deleted_at is null
);

insert into public.tbl_label (user_id, name, color)
select
  profile.user_id,
  expected.name,
  expected.color
from (
  values
    ('Filtering', '#2563EB'),
    ('Review', '#D97706'),
    ('Personal', '#16A34A')
) as expected(name, color)
join public.tbl_user as profile on profile.email = 'harvey@example.com'
on conflict (user_id, name) do nothing;

with task_fixtures(
  project_name,
  title,
  description,
  priority_name,
  due_day_offset,
  scheduled_day_offset,
  deadline_day_offset,
  recurrence,
  is_done
) as (
  values
    ('Filtering - Client Work', 'Filter fixture 01: overdue low', 'Overdue task with multiple labels.', 'low', -5, -4, -4, 'none', false),
    ('Filtering - Client Work', 'Filter fixture 02: due today medium', 'Task due today with a deadline.', 'medium', 0, -1, 1, 'daily', false),
    ('Filtering - Client Work', 'Filter fixture 03: future high', 'Upcoming task without a deadline.', 'high', 3, 0, null, 'weekly', false),
    ('Filtering - Client Work', 'Filter fixture 04: no date low', 'Completed recurring task with no due date.', 'low', null, null, null, 'monthly', true),
    ('Filtering - Client Work', 'Filter fixture 05: past medium', 'Past task with multiple labels.', 'medium', -1, 1, -1, 'none', false),
    ('Filtering - Client Work', 'Filter fixture 06: future high', 'Completed task with a future deadline.', 'high', 7, 3, 5, 'daily', true),
    ('Filtering - Personal', 'Filter fixture 07: due today low', 'Personal task due today.', 'low', 0, null, -1, 'monthly', false),
    ('Filtering - Personal', 'Filter fixture 08: no date medium', 'Recurring task without a due date.', 'medium', null, -2, 3, 'weekly', false),
    ('Filtering - Personal', 'Filter fixture 09: overdue high', 'Completed task with an overdue due date.', 'high', -7, 5, null, 'none', true),
    ('Filtering - Personal', 'Filter fixture 10: future low', 'Personal task due in the future.', 'low', 5, 2, 8, 'daily', false),
    ('Filtering - Personal', 'Filter fixture 11: past medium', 'Past task with multiple labels.', 'medium', -2, null, null, 'none', false),
    ('Filtering - Personal', 'Filter fixture 12: no date high', 'Recurring task without a due date.', 'high', null, 7, 2, 'monthly', false)
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  scheduled_date,
  due_date,
  deadline,
  recurrence,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  fixture.description,
  priority.priority_id,
  (now() at time zone profile.timezone)::date + fixture.scheduled_day_offset,
  (now() at time zone profile.timezone)::date + fixture.due_day_offset,
  now() + fixture.deadline_day_offset * interval '1 day',
  fixture.recurrence::public.task_recurrence,
  fixture.is_done,
  case when fixture.is_done then now() else null end
from task_fixtures as fixture
join public.tbl_user as profile on profile.email = 'harvey@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = fixture.project_name
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.name = fixture.priority_name
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = profile.user_id
    and existing.project_id = project.project_id
    and existing.title = fixture.title
    and existing.deleted_at is null
);

with task_schedule_fixtures(title, scheduled_day_offset) as (
  values
    ('Filter fixture 01: overdue low', -4),
    ('Filter fixture 02: due today medium', -1),
    ('Filter fixture 03: future high', 0),
    ('Filter fixture 04: no date low', null),
    ('Filter fixture 05: past medium', 1),
    ('Filter fixture 06: future high', 3),
    ('Filter fixture 07: due today low', null),
    ('Filter fixture 08: no date medium', -2),
    ('Filter fixture 09: overdue high', 5),
    ('Filter fixture 10: future low', 2),
    ('Filter fixture 11: past medium', null),
    ('Filter fixture 12: no date high', 7)
)
update public.tbl_task as task
set scheduled_date =
  (now() at time zone profile.timezone)::date
  + fixture.scheduled_day_offset
from task_schedule_fixtures as fixture
join public.tbl_user as profile on profile.email = 'harvey@example.com'
where task.user_id = profile.user_id
  and task.title = fixture.title
  and task.deleted_at is null
  and task.scheduled_date is distinct from
    (now() at time zone profile.timezone)::date + fixture.scheduled_day_offset;

with task_label_fixtures(title, label_name) as (
  values
    ('Filter fixture 01: overdue low', 'Filtering'),
    ('Filter fixture 01: overdue low', 'Review'),
    ('Filter fixture 02: due today medium', 'Filtering'),
    ('Filter fixture 03: future high', 'Review'),
    ('Filter fixture 04: no date low', 'Personal'),
    ('Filter fixture 05: past medium', 'Filtering'),
    ('Filter fixture 05: past medium', 'Personal'),
    ('Filter fixture 06: future high', 'Review'),
    ('Filter fixture 06: future high', 'Personal'),
    ('Filter fixture 07: due today low', 'Filtering'),
    ('Filter fixture 08: no date medium', 'Personal'),
    ('Filter fixture 09: overdue high', 'Filtering'),
    ('Filter fixture 09: overdue high', 'Review'),
    ('Filter fixture 10: future low', 'Review'),
    ('Filter fixture 11: past medium', 'Filtering'),
    ('Filter fixture 11: past medium', 'Personal'),
    ('Filter fixture 12: no date high', 'Personal'),
    ('Filter fixture 12: no date high', 'Review')
)
insert into public.tbl_task_label (task_id, label_id)
select task.task_id, label.label_id
from task_label_fixtures as fixture
join public.tbl_user as profile on profile.email = 'harvey@example.com'
join public.tbl_task as task
  on task.user_id = profile.user_id
  and task.title = fixture.title
  and task.deleted_at is null
join public.tbl_label as label
  on label.user_id = profile.user_id
  and label.name = fixture.label_name
on conflict (task_id, label_id) do nothing;
