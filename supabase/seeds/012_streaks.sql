with fixture_projects(name, color, sort_order) as (
  values
    ('Streak - Daily Review', '#7C3AED', 30)
)
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
  'Daily recurring task with seeded streak completion history.',
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

with streak_series(series_id) as (
  values ('9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1101'::uuid)
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  scheduled_date,
  due_date,
  recurrence,
  recurrence_days,
  recurrence_series_id,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  'Streak seed - Daily review',
  'Seeded daily series for streak API verification.',
  priority.priority_id,
  1,
  (now() at time zone profile.timezone)::date,
  (now() at time zone profile.timezone)::date,
  'daily',
  array[]::smallint[],
  streak_series.series_id,
  false,
  null
from streak_series
join public.tbl_user as profile on profile.email = 'james@example.com'
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Streak - Daily Review'
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
    and existing.title = 'Streak seed - Daily review'
    and existing.deleted_at is null
);

update public.tbl_task as task
set
  recurrence = 'daily',
  recurrence_days = array[]::smallint[],
  recurrence_series_id = '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1101'::uuid,
  scheduled_date = (now() at time zone profile.timezone)::date,
  due_date = (now() at time zone profile.timezone)::date,
  is_done = false,
  board_status = 'todo',
  done_at = null,
  archived_at = null,
  deleted_at = null
from public.tbl_project as project
join public.tbl_user as profile on profile.user_id = project.user_id
where task.project_id = project.project_id
  and task.user_id = profile.user_id
  and profile.email = 'james@example.com'
  and project.name = 'Streak - Daily Review'
  and task.title = 'Streak seed - Daily review';

delete from public.tbl_task_completion
-- The history is relative to the day the seed runs, so a re-seed replaces it rather than
-- adding to it.
where series_id = '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1101'::uuid;

insert into public.tbl_task_completion (
  -- Seven days (longest streak 7), a missed day (today - 5), then the four days up to
  -- yesterday (current streak 4). Today's occurrence is open, so completing it makes the
  -- streak 5.
  task_id,
  user_id,
  series_id,
  completed_on,
  completed_at
)
select
  task.task_id,
  task.user_id,
  task.recurrence_series_id,
  fixture.completed_on,
  fixture.completed_on::timestamp at time zone profile.timezone
from public.tbl_task as task
join public.tbl_project as project on project.project_id = task.project_id
join public.tbl_user as profile on profile.user_id = task.user_id
cross join lateral (
  select ((now() at time zone profile.timezone)::date - day_distance)
  from generate_series(12, 6, -1) as distances(day_distance)
  union all
  select ((now() at time zone profile.timezone)::date - day_distance)
  from generate_series(4, 1, -1) as distances(day_distance)
) as fixture(completed_on)
where profile.email = 'james@example.com'
  and project.name = 'Streak - Daily Review'
  and task.title = 'Streak seed - Daily review'
  and task.deleted_at is null
on conflict (task_id, completed_on) do update
set
  series_id = excluded.series_id,
  completed_at = excluded.completed_at;

insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  recurrence,
  recurrence_days,
  recurrence_series_id,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  'Streak seed - No completions',
  'Recurring task without completion events.',
  priority.priority_id,
  2,
  'daily',
  array[]::smallint[],
  '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1102'::uuid,
  false,
  null
from public.tbl_user as profile
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Streak - Daily Review'
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.is_default
  and priority.deleted_at is null
where profile.email = 'james@example.com'
  and not exists (
    select 1
    from public.tbl_task as existing
    where existing.user_id = profile.user_id
      and existing.project_id = project.project_id
      and existing.title = 'Streak seed - No completions'
      and existing.deleted_at is null
  );
insert into public.tbl_task (
  -- A daily series that missed the last two days: its open occurrence is today, its last
  -- completion was three days ago, so the current streak is 0 and the longest is 7.
  user_id,
  project_id,
  title,
  description,
  priority_id,
  position,
  scheduled_date,
  due_date,
  recurrence,
  recurrence_days,
  recurrence_series_id,
  is_done,
  done_at
)
select
  profile.user_id,
  project.project_id,
  'Streak seed - Missed day',
  'Daily series whose streak was broken by missed days.',
  priority.priority_id,
  3,
  (now() at time zone profile.timezone)::date,
  (now() at time zone profile.timezone)::date,
  'daily',
  array[]::smallint[],
  '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1103'::uuid,
  false,
  null
from public.tbl_user as profile
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = 'Streak - Daily Review'
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.is_default
  and priority.deleted_at is null
where profile.email = 'james@example.com'
  and not exists (
    select 1
    from public.tbl_task as existing
    where existing.user_id = profile.user_id
      and existing.project_id = project.project_id
      and existing.title = 'Streak seed - Missed day'
      and existing.deleted_at is null
  );

update public.tbl_task as task
set
  recurrence = 'daily',
  recurrence_days = array[]::smallint[],
  recurrence_series_id = '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1103'::uuid,
  scheduled_date = (now() at time zone profile.timezone)::date,
  due_date = (now() at time zone profile.timezone)::date,
  is_done = false,
  board_status = 'todo',
  done_at = null,
  archived_at = null,
  deleted_at = null
from public.tbl_project as project
join public.tbl_user as profile on profile.user_id = project.user_id
where task.project_id = project.project_id
  and task.user_id = profile.user_id
  and profile.email = 'james@example.com'
  and project.name = 'Streak - Daily Review'
  and task.title = 'Streak seed - Missed day';

delete from public.tbl_task_completion
where series_id = '9b9d0e1a-6d7d-4f4d-9f3e-9ebd4fbf1103'::uuid;

insert into public.tbl_task_completion (
  task_id,
  user_id,
  series_id,
  completed_on,
  completed_at
)
select
  task.task_id,
  task.user_id,
  task.recurrence_series_id,
  fixture.completed_on,
  fixture.completed_on::timestamp at time zone profile.timezone
from public.tbl_task as task
join public.tbl_project as project on project.project_id = task.project_id
join public.tbl_user as profile on profile.user_id = task.user_id
cross join lateral (
  select ((now() at time zone profile.timezone)::date - day_distance)
  from generate_series(9, 3, -1) as distances(day_distance)
) as fixture(completed_on)
where profile.email = 'james@example.com'
  and project.name = 'Streak - Daily Review'
  and task.title = 'Streak seed - Missed day'
  and task.deleted_at is null;

alter table public.tbl_task
  add column if not exists recurrence_series_id uuid;

create table if not exists public.tbl_task_completion (
  completion_id bigint generated always as identity primary key,
  task_id integer not null references public.tbl_task(task_id) on delete cascade,
  user_id uuid not null references public.tbl_user(user_id) on delete cascade,
  series_id uuid,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  constraint tbl_task_completion_task_date_key unique (task_id, completed_on)
);

