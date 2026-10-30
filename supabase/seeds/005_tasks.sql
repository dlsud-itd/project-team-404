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
  join public.tbl_project as project_row
    on project_row.user_id = user_profile.user_id
   and project_row.name = expected.project_name
   and project_row.deleted_at is null
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
);
