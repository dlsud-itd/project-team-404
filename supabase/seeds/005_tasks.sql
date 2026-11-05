with expected_tasks(email, project_name, title, description, priority, due_date, is_done) as (
  values
    (
      'james@example.com',
      'Work',
      'Prepare sprint notes',
      'Summarize blockers, wins, and next steps for the team sync.',
      'high',
      '2026-10-31',
      false
    ),
    (
      'james@example.com',
      'Home',
      'Book weekend groceries',
      'Finalize the shopping list and place the order before Saturday morning.',
      'medium',
      '2026-11-02',
      false
    ),
    (
      'harvey@example.com',
      'Client Projects',
      'Send client recap',
      'Share the status update and next milestone notes with the client.',
      'high',
      '2026-10-29',
      true
    ),
    (
      'alex@example.com',
      'Learning',
      'Finish chapter review',
      'Capture the key takeaways and finish the final recap question.',
      'low',
      '2026-11-05',
      false
    )
),
seeded_tasks as (
  select
    expected.email,
    expected.project_name,
    expected.title,
    expected.description,
    priority_level.priority_id,
    expected.due_date::date as due_date,
    expected.is_done,
    user_profile.user_id,
    project_row.project_id
  from expected_tasks as expected
  join public.tbl_user as user_profile on user_profile.email = expected.email
  join lateral (
    select project.project_id
    from public.tbl_project as project
    where project.user_id = user_profile.user_id
      and project.name = expected.project_name
      and project.deleted_at is null
    order by project.project_id
    limit 1
  ) as project_row on true
  join public.tbl_priority_level as priority_level
    on priority_level.name = expected.priority
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  due_date,
  is_done,
  done_at
)
select
  user_id,
  project_id,
  title,
  description,
  priority_id,
  due_date,
  is_done,
  case when is_done then now() else null end as done_at
from seeded_tasks
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = seeded_tasks.user_id
    and existing.project_id is not distinct from seeded_tasks.project_id
    and existing.title = seeded_tasks.title
    and existing.deleted_at is null
);

with additional_users(username, email, person_number) as (
  values
    ('olivia', 'olivia@example.com', 1),
    ('ethan', 'ethan@example.com', 2),
    ('mia', 'mia@example.com', 3),
    ('rafael', 'rafael@example.com', 4),
    ('grace', 'grace@example.com', 5),
    ('felix', 'felix@example.com', 6),
    ('amina', 'amina@example.com', 7),
    ('priya', 'priya@example.com', 8),
    ('kenji', 'kenji@example.com', 9),
    ('sofia', 'sofia@example.com', 10),
    ('ava', 'ava@example.com', 11),
    ('noah', 'noah@example.com', 12)
),
task_fixtures(task_number, title, description) as (
  values
    (1, 'Prepare the sprint plan', 'Outline goals, owners, milestones, and project risks.'),
    (2, 'Review the client proposal', 'Check the latest draft and share feedback with the team.'),
    (3, 'Schedule a project check-in', 'Confirm the agenda and availability with key stakeholders.'),
    (4, 'Organize weekend errands', 'Update the household list and plan around the weekend.'),
    (5, 'Prepare the monthly progress report', 'Summarize completed work, open decisions, and next steps.'),
    (6, 'Complete the course module', 'Finish the lesson and capture the key takeaways.')
),
task_fixtures_data as (
  select
    auth_user.id as user_id,
    additional_users.username,
    task_fixtures.task_number,
    case
      when task_fixtures.task_number in (1, 4) then 'Work'
      when task_fixtures.task_number in (2, 5) then 'Home'
      else 'Learning'
    end as project_name,
    task_fixtures.title,
    task_fixtures.description,
    case (additional_users.person_number + task_fixtures.task_number) % 3
      when 0 then 'low'
      when 1 then 'medium'
      else 'high'
    end as priority_name,
    current_date + (task_fixtures.task_number - 4) as due_date,
    current_date + (task_fixtures.task_number - 2) as scheduled_date,
    case task_fixtures.task_number
      when 1 then now() - interval '3 days'
      when 2 then now() - interval '30 minutes'
      when 3 then now() + interval '1 day'
      when 4 then null::timestamptz
      when 5 then now() - interval '2 hours'
      else now() - interval '2 days'
    end as deadline,
    task_fixtures.task_number = 6 as is_done,
    case task_fixtures.task_number % 4
      when 0 then 'none'
      when 1 then 'daily'
      when 2 then 'weekly'
      else 'monthly'
    end as recurrence
  from additional_users
  join auth.users as auth_user on auth_user.email = additional_users.email
  cross join task_fixtures
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
  task_fixtures_data.user_id,
  project.project_id,
  task_fixtures_data.title,
  task_fixtures_data.description,
  priority.priority_id,
  task_fixtures_data.scheduled_date,
  task_fixtures_data.due_date,
  task_fixtures_data.deadline,
  task_fixtures_data.recurrence::public.task_recurrence,
  task_fixtures_data.is_done,
  case when task_fixtures_data.is_done then now() else null end
from task_fixtures_data
join public.tbl_project as project
  on project.user_id = task_fixtures_data.user_id
  and project.name = task_fixtures_data.project_name
join public.tbl_priority_level as priority
  on priority.name = task_fixtures_data.priority_name
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = task_fixtures_data.user_id
    and existing.title = task_fixtures_data.title
);

with additional_users(email) as (
  values
    ('olivia@example.com'),
    ('ethan@example.com'),
    ('mia@example.com'),
    ('rafael@example.com'),
    ('grace@example.com'),
    ('felix@example.com'),
    ('amina@example.com'),
    ('priya@example.com'),
    ('kenji@example.com'),
    ('sofia@example.com'),
    ('ava@example.com'),
    ('noah@example.com')
),
label_fixtures(name, color) as (
  values
    ('Planning', '#2563eb'),
    ('Follow-up', '#d97706'),
    ('Personal', '#16a34a'),
    ('Ideas', '#9333ea')
)
insert into public.tbl_label (user_id, name, color)
select auth_user.id, label_fixtures.name, label_fixtures.color
from additional_users
join auth.users as auth_user on auth_user.email = additional_users.email
cross join label_fixtures
on conflict (user_id, name) do update
set
  color = excluded.color,
  updated_at = now();

with additional_users(username, email) as (
  values
    ('olivia', 'olivia@example.com'),
    ('ethan', 'ethan@example.com'),
    ('mia', 'mia@example.com'),
    ('rafael', 'rafael@example.com'),
    ('grace', 'grace@example.com'),
    ('felix', 'felix@example.com'),
    ('amina', 'amina@example.com'),
    ('priya', 'priya@example.com'),
    ('kenji', 'kenji@example.com'),
    ('sofia', 'sofia@example.com'),
    ('ava', 'ava@example.com'),
    ('noah', 'noah@example.com')
),
task_label_fixtures as (
  select
    task.task_id,
    selected_labels.name as label_name
  from additional_users
  join auth.users as auth_user on auth_user.email = additional_users.email
  join public.tbl_task as task
    on task.user_id = auth_user.id
    and task.title in (
      'Prepare the sprint plan',
      'Review the client proposal',
      'Schedule a project check-in',
      'Organize weekend errands',
      'Prepare the monthly progress report',
      'Complete the course module'
    )
  cross join lateral (
    values
      ('Planning'),
      (
        case task.title
          when 'Prepare the sprint plan' then 'Follow-up'
          when 'Review the client proposal' then 'Personal'
          when 'Schedule a project check-in' then 'Ideas'
          when 'Organize weekend errands' then 'Follow-up'
          when 'Prepare the monthly progress report' then 'Personal'
          else 'Ideas'
        end
      )
  ) as selected_labels(name)
)
insert into public.tbl_task_label (task_id, label_id)
select task_label_fixtures.task_id, label.label_id
from task_label_fixtures
join public.tbl_label as label
  on label.name = task_label_fixtures.label_name
join public.tbl_task as task
  on task.task_id = task_label_fixtures.task_id
  and task.user_id = label.user_id
on conflict (task_id, label_id) do nothing;
