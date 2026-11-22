with fixtures(name, description, archived, deleted) as (
  values
    ('Orbit', 'Exact project name search fixture.', false, false),
    ('Orbit launch workspace', 'Prefix project name search fixture.', false, false),
    ('Planning around Orbit', 'Contains project name search fixture.', false, false),
    ('Weekly Notes', 'Orbit appears only in this project description.', false, false),
    ('Deleted Orbit project fixture', 'Soft-deleted search fixture.', false, true),
    ('ArchiveNeedle archived project', 'Archived project search fixture.', true, false)
)
insert into public.tbl_project (
  user_id,
  name,
  description,
  color,
  is_inbox,
  is_favorite,
  is_archived,
  archived_at,
  sort_order,
  deleted_at
)
select
  profile.user_id,
  fixture.name,
  fixture.description,
  '#6B7280',
  false,
  false,
  fixture.archived,
  case when fixture.archived then now() - interval '2 days' else null end,
  95,
  case when fixture.deleted then now() - interval '1 day' else null end
from public.tbl_user as profile
cross join fixtures as fixture
where profile.email = 'harvey@example.com'
  and not exists (
    select 1
    from public.tbl_project as existing
    where existing.user_id = profile.user_id
      and existing.name = fixture.name
  );

with fixtures(name, description, archived, deleted) as (
  values
    ('Orbit', 'Exact project name search fixture.', false, false),
    ('Orbit launch workspace', 'Prefix project name search fixture.', false, false),
    ('Planning around Orbit', 'Contains project name search fixture.', false, false),
    ('Weekly Notes', 'Orbit appears only in this project description.', false, false),
    ('Deleted Orbit project fixture', 'Soft-deleted search fixture.', false, true),
    ('ArchiveNeedle archived project', 'Archived project search fixture.', true, false)
)
update public.tbl_project as project
set description = fixture.description,
    color = '#6B7280',
    is_inbox = false,
    is_archived = fixture.archived,
    archived_at = case
      when fixture.archived then now() - interval '2 days'
      else null
    end,
    sort_order = 95,
    deleted_at = case
      when fixture.deleted then now() - interval '1 day'
      else null
    end,
    updated_at = now()
from public.tbl_user as profile
cross join fixtures as fixture
where profile.email = 'harvey@example.com'
  and project.user_id = profile.user_id
  and project.name = fixture.name;

with fixtures(
  email,
  project_name,
  title,
  description,
  archived,
  deleted
) as (
  values
    (
      'harvey@example.com',
      'Orbit',
      'Orbit',
      'An exact title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit launch workspace',
      'Orbit launch checklist',
      'A prefix title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Planning around Orbit',
      'Planning around Orbit',
      'A contains title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Planning around Orbit',
      'Quarterly review notes',
      'Orbit appears only in this task description.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Weekly Notes',
      'Search fixture - Café run',
      'Mixed-case accented search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Literal 50%_done marker',
      'Fixture for literal percent and underscore searches.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Literal \x marker',
      'Fixture for literal backslash searches.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Deleted Orbit task fixture',
      'Soft-deleted task search fixture.',
      false,
      true
    ),
    (
      'harvey@example.com',
      'ArchiveNeedle archived project',
      'ArchiveNeedle archived task fixture',
      'Archived task search fixture.',
      true,
      false
    ),
    (
      'harvey@example.com',
      'ArchiveNeedle archived project',
      'Active ArchiveNeedle task in archived project',
      'Active task in an archived project search fixture.',
      false,
      false
    ),
    (
      'james@example.com',
      'Home',
      'James ArchiveNeedle task fixture',
      'Second user search fixture.',
      false,
      false
    ),
    (
      'james@example.com',
      'Home',
      'James Orbit task fixture',
      'Second user Orbit ownership fixture.',
      false,
      false
    )
)
insert into public.tbl_task (
  user_id,
  project_id,
  title,
  description,
  priority_id,
  recurrence,
  archived_at,
  deleted_at
)
select
  profile.user_id,
  project.project_id,
  fixture.title,
  fixture.description,
  priority.priority_id,
  'none'::public.task_recurrence,
  case when fixture.archived then now() - interval '3 days' else null end,
  case when fixture.deleted then now() - interval '1 day' else null end
from fixtures as fixture
join public.tbl_user as profile on profile.email = fixture.email
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = fixture.project_name
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and lower(priority.name) = 'medium'
  and priority.deleted_at is null
where not exists (
  select 1
  from public.tbl_task as existing
  where existing.user_id = profile.user_id
    and existing.title = fixture.title
);

with fixtures(
  email,
  project_name,
  title,
  description,
  archived,
  deleted
) as (
  values
    (
      'harvey@example.com',
      'Orbit',
      'Orbit',
      'An exact title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit launch workspace',
      'Orbit launch checklist',
      'A prefix title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Planning around Orbit',
      'Planning around Orbit',
      'A contains title search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Planning around Orbit',
      'Quarterly review notes',
      'Orbit appears only in this task description.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Weekly Notes',
      'Search fixture - Café run',
      'Mixed-case accented search fixture.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Literal 50%_done marker',
      'Fixture for literal percent and underscore searches.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Literal \x marker',
      'Fixture for literal backslash searches.',
      false,
      false
    ),
    (
      'harvey@example.com',
      'Orbit',
      'Deleted Orbit task fixture',
      'Soft-deleted task search fixture.',
      false,
      true
    ),
    (
      'harvey@example.com',
      'ArchiveNeedle archived project',
      'ArchiveNeedle archived task fixture',
      'Archived task search fixture.',
      true,
      false
    ),
    (
      'harvey@example.com',
      'ArchiveNeedle archived project',
      'Active ArchiveNeedle task in archived project',
      'Active task in an archived project search fixture.',
      false,
      false
    ),
    (
      'james@example.com',
      'Home',
      'James ArchiveNeedle task fixture',
      'Second user search fixture.',
      false,
      false
    ),
    (
      'james@example.com',
      'Home',
      'James Orbit task fixture',
      'Second user Orbit ownership fixture.',
      false,
      false
    )
)
update public.tbl_task as task
set project_id = project.project_id,
    description = fixture.description,
    priority_id = priority.priority_id,
    recurrence = 'none'::public.task_recurrence,
    archived_at = case
      when fixture.archived then now() - interval '3 days'
      else null
    end,
    deleted_at = case
      when fixture.deleted then now() - interval '1 day'
      else null
    end,
    updated_at = now()
from fixtures as fixture
join public.tbl_user as profile on profile.email = fixture.email
join public.tbl_project as project
  on project.user_id = profile.user_id
  and project.name = fixture.project_name
  and project.deleted_at is null
join public.tbl_priority_level as priority
  on priority.user_id = profile.user_id
  and lower(priority.name) = 'medium'
  and priority.deleted_at is null
where task.user_id = profile.user_id
  and task.title = fixture.title;
