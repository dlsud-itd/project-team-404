insert into public.tbl_project (
  user_id,
  name,
  description,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  archived_at,
  sort_order
)
select
  profile.user_id,
  'Archive fixture - Archived project',
  'Archived project containing active tasks for archive checks.',
  '#6B7280',
  false,
  false,
  true,
  now() - interval '4 days',
  90
from public.tbl_user as profile
where profile.email = 'harvey@example.com'
  and not exists (
    select 1
    from public.tbl_project as existing
    where existing.user_id = profile.user_id
      and existing.name = 'Archive fixture - Archived project'
      and existing.deleted_at is null
  );

update public.tbl_project as project
set is_archived = true,
    archived_at = now() - interval '4 days',
    is_inbox = false
from public.tbl_user as profile
where profile.email = 'harvey@example.com'
  and project.user_id = profile.user_id
  and project.name = 'Archive fixture - Archived project'
  and project.deleted_at is null;

insert into public.tbl_label (user_id, name, color, sort_order, archived_at)
select profile.user_id, fixture.name, fixture.color, fixture.sort_order, fixture.archived_at
from public.tbl_user as profile
cross join (
  values
    ('Archive fixture - Active task label', '#0284C7'::char(7), 90, null::timestamptz),
    ('Archive fixture - Archived label', '#7C3AED'::char(7), 91, now() - interval '2 days')
) as fixture(name, color, sort_order, archived_at)
where profile.email = 'harvey@example.com'
on conflict (user_id, name) do update
set color = excluded.color,
    sort_order = excluded.sort_order,
    archived_at = excluded.archived_at,
    updated_at = now();

insert into public.tbl_label (user_id, name, color, sort_order, archived_at)
select
  profile.user_id,
  'Archive fixture - Archived label',
  '#7C3AED',
  90,
  now() - interval '1 day'
from public.tbl_user as profile
where profile.email = 'james@example.com'
on conflict (user_id, name) do update
set color = excluded.color,
    sort_order = excluded.sort_order,
    archived_at = excluded.archived_at,
    updated_at = now();

with fixtures(
  email,
  project_name,
  title,
  description,
  priority_name,
  recurrence,
  is_done,
  archived_days
) as (
  values
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - active task',
      'Active task used to verify archive and restore mutations.',
      'Medium',
      'none',
      false,
      null
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - completed task',
      'Completed task retained in the archive.',
      'Medium',
      'none',
      true,
      5
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - recurring task',
      'Recurring task retained in the archive.',
      'Medium',
      'weekly',
      false,
      3
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture ArchiveNeedle - labeled task',
      'Distinctive search term for archive exclusion checks.',
      'Medium',
      'none',
      false,
      1
    ),
    (
      'harvey@example.com',
      'Archive fixture - Archived project',
      'Archive fixture - active task in archived project',
      'Active task kept in an archived project.',
      'Medium',
      'none',
      false,
      null
    ),
    (
      'james@example.com',
      'Home',
      'Archive fixture - second user task',
      'Second user archive fixture for ownership isolation.',
      'Medium',
      'none',
      false,
      1
    )
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  recurrence,
  is_done,
  done_at,
  archived_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  fixture.description,
  priority.priority_id,
  fixture.recurrence::public.task_recurrence,
  fixture.is_done,
  case when fixture.is_done then now() else null end,
  case
    when fixture.archived_days is null then null
    else now() - fixture.archived_days * interval '1 day'
  end
from fixtures as fixture
join public.tbl_user as profile on profile.email = fixture.email
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = fixture.project_name
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.name = fixture.priority_name
  and priority.deleted_at is null
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = profile.user_id
    and existing.title = fixture.title
    and existing.deleted_at is null
);

with fixtures(
  email,
  project_name,
  title,
  description,
  priority_name,
  recurrence,
  is_done,
  archived_days
) as (
  values
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - active task',
      'Active task used to verify archive and restore mutations.',
      'Medium',
      'none',
      false,
      null
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - completed task',
      'Completed task retained in the archive.',
      'Medium',
      'none',
      true,
      5
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture - recurring task',
      'Recurring task retained in the archive.',
      'Medium',
      'weekly',
      false,
      3
    ),
    (
      'harvey@example.com',
      'Filtering - Client Work',
      'Archive fixture ArchiveNeedle - labeled task',
      'Distinctive search term for archive exclusion checks.',
      'Medium',
      'none',
      false,
      1
    ),
    (
      'harvey@example.com',
      'Archive fixture - Archived project',
      'Archive fixture - active task in archived project',
      'Active task kept in an archived project.',
      'Medium',
      'none',
      false,
      null
    ),
    (
      'james@example.com',
      'Home',
      'Archive fixture - second user task',
      'Second user archive fixture for ownership isolation.',
      'Medium',
      'none',
      false,
      1
    )
)
update public.tbl_task as task
set project_id = project.project_id,
    description = fixture.description,
    priority_id = priority.priority_id,
    recurrence = fixture.recurrence::public.task_recurrence,
    is_done = fixture.is_done,
    done_at = case when fixture.is_done then now() else null end,
    archived_at = case
      when fixture.archived_days is null then null
      else now() - fixture.archived_days * interval '1 day'
    end
from fixtures as fixture
join public.tbl_user as profile on profile.email = fixture.email
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = fixture.project_name
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and priority.name = fixture.priority_name
  and priority.deleted_at is null
where task.user_id = profile.user_id
  and task.title = fixture.title
  and task.deleted_at is null;

with task_label_fixtures(email, task_title, label_name) as (
  values
    (
      'harvey@example.com',
      'Archive fixture ArchiveNeedle - labeled task',
      'Archive fixture - Active task label'
    ),
    (
      'harvey@example.com',
      'Archive fixture - active task in archived project',
      'Archive fixture - Archived label'
    ),
    (
      'james@example.com',
      'Archive fixture - second user task',
      'Archive fixture - Archived label'
    )
)
insert into public.tbl_task_label (task_id, label_id)
select task.task_id, label.label_id
from task_label_fixtures as fixture
join public.tbl_user as profile on profile.email = fixture.email
join public.tbl_task as task
  on task.user_id = profile.user_id
  and task.title = fixture.task_title
  and task.deleted_at is null
join public.tbl_label as label
  on label.user_id = profile.user_id
  and label.name = fixture.label_name
on conflict (task_id, label_id) do nothing;
