do $$
declare
  fixture_user_id uuid;
  fixture_today date;
  actual_count integer;
  expected record;
begin
  select user_id
    , (now() at time zone profile.timezone)::date
  into fixture_user_id, fixture_today
  from public.tbl_user as profile
  where profile.email = 'harvey@example.com';

  if fixture_user_id is null then
    raise exception 'FAIL: filtering seed user harvey@example.com is missing';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null;

  if actual_count <> 12 then
    raise exception 'FAIL: expected 12 active filtering tasks, found %', actual_count;
  end if;
  raise notice 'PASS: 12 filtering tasks are present';

  select count(distinct task.project_id)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null;

  if actual_count <> 2 then
    raise exception 'FAIL: expected filtering tasks across 2 projects, found %', actual_count;
  end if;
  raise notice 'PASS: filtering tasks span 2 projects';

  for expected in
    select *
    from (values ('low', 4), ('medium', 4), ('high', 4)) as priorities(name, task_count)
  loop
    select count(*)
    into actual_count
    from public.tbl_task as task
    join public.tbl_priority_level as priority
      on priority.priority_id = task.priority_id
    where task.user_id = fixture_user_id
      and task.title like 'Filter fixture %'
      and task.deleted_at is null
      and lower(priority.name) = expected.name;

    if actual_count <> expected.task_count then
      raise exception 'FAIL: expected % % priority tasks, found %',
        expected.task_count, expected.name, actual_count;
    end if;
    raise notice 'PASS: % priority has % tasks', expected.name, actual_count;
  end loop;

  for expected in
    select *
    from (values ('Filtering', 6), ('Review', 6), ('Personal', 6)) as labels(name, task_count)
  loop
    select count(distinct task.task_id)
    into actual_count
    from public.tbl_task as task
    join public.tbl_task_label as task_label on task_label.task_id = task.task_id
    join public.tbl_label as label
      on label.label_id = task_label.label_id
      and label.user_id = fixture_user_id
    where task.user_id = fixture_user_id
      and task.title like 'Filter fixture %'
      and task.deleted_at is null
      and label.name = expected.name;

    if actual_count <> expected.task_count then
      raise exception 'FAIL: expected % tasks with label %, found %',
        expected.task_count, expected.name, actual_count;
    end if;
    raise notice 'PASS: label % has % tasks', expected.name, actual_count;
  end loop;

  select count(*)
  into actual_count
  from (
    select task.task_id
    from public.tbl_task as task
    join public.tbl_task_label as task_label on task_label.task_id = task.task_id
    where task.user_id = fixture_user_id
      and task.title like 'Filter fixture %'
      and task.deleted_at is null
    group by task.task_id
    having count(*) > 1
  ) as multi_labeled_tasks;

  if actual_count = 0 then
    raise exception 'FAIL: no filtering task has multiple labels';
  end if;
  raise notice 'PASS: at least one filtering task has multiple labels';

  select count(*)
  into actual_count
  from public.tbl_project as project
  where project.user_id = fixture_user_id
    and project.name like 'Filtering - %'
    and project.deleted_at is null;

  if actual_count <> 3 then
    raise exception 'FAIL: expected 3 filtering projects, found %', actual_count;
  end if;

  if not exists (
    select 1
    from public.tbl_project as project
    where project.user_id = fixture_user_id
      and project.name = 'Filtering - Client Work'
      and project.is_favorite
      and not project.is_archived
      and project.color = '#3C78D8'
  ) or not exists (
    select 1
    from public.tbl_project as project
    where project.user_id = fixture_user_id
      and project.name = 'Filtering - Archived'
      and not project.is_favorite
      and project.is_archived
      and project.color = '#6B7280'
  ) then
    raise exception 'FAIL: filtering project favorite/archive/color fixtures are incomplete';
  end if;
  raise notice 'PASS: filtering projects cover favorite, archive, and color values';

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.due_date < fixture_today;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no past due dates';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.due_date = fixture_today;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no due dates for today';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.due_date > fixture_today;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no future due dates';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.due_date is null;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no missing due dates';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.scheduled_date is not null;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no scheduled dates';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.scheduled_date is null;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no missing scheduled dates';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.deadline is not null;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no deadlines';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.deadline is null;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no missing deadlines';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.recurrence <> 'none'::public.task_recurrence;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no recurring tasks';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.recurrence = 'none'::public.task_recurrence;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no non-recurring tasks';
  end if;

  select count(*)
  into actual_count
  from public.tbl_task as task
  where task.user_id = fixture_user_id
    and task.title like 'Filter fixture %'
    and task.deleted_at is null
    and task.is_done;
  if actual_count = 0 then
    raise exception 'FAIL: filtering tasks have no completed tasks';
  end if;
  raise notice 'PASS: filtering tasks cover date, deadline, recurrence, and completion states';
end;
$$;

do $$
declare
  harvey_id uuid;
  james_id uuid;
  actual_count integer;
begin
  select user_id into harvey_id
  from public.tbl_user
  where email = 'harvey@example.com';

  select user_id into james_id
  from public.tbl_user
  where email = 'james@example.com';

  if harvey_id is null or james_id is null then
    raise exception 'FAIL: search seed users are missing';
  end if;

  select count(*) into actual_count
  from public.tbl_task
  where user_id = harvey_id
    and title = 'Orbit'
    and deleted_at is null
    and archived_at is null;
  if actual_count <> 1 then
    raise exception 'FAIL: expected one active exact Orbit task, found %', actual_count;
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Planning around Orbit'
      and deleted_at is null
      and archived_at is null
  ) then
    raise exception 'FAIL: contains-ranking task fixture is missing';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Quarterly review notes'
      and description ilike '%Orbit%'
      and title not ilike '%Orbit%'
      and deleted_at is null
  ) or not exists (
    select 1
    from public.tbl_project
    where user_id = harvey_id
      and name = 'Weekly Notes'
      and description ilike '%Orbit%'
      and name not ilike '%Orbit%'
      and deleted_at is null
  ) then
    raise exception 'FAIL: task/project description-only search fixtures are missing';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Search fixture - Café run'
      and deleted_at is null
  ) then
    raise exception 'FAIL: accented case-insensitive search fixture is missing';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Literal 50%_done marker'
      and deleted_at is null
  ) or not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Literal \x marker'
      and deleted_at is null
  ) then
    raise exception 'FAIL: literal wildcard/backslash search fixtures are missing';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = harvey_id
      and title = 'Deleted Orbit task fixture'
      and deleted_at is not null
  ) or not exists (
    select 1
    from public.tbl_project
    where user_id = harvey_id
      and name = 'Deleted Orbit project fixture'
      and deleted_at is not null
  ) then
    raise exception 'FAIL: soft-deleted search fixtures are missing';
  end if;

  if not exists (
    select 1
    from public.tbl_project as project
    join public.tbl_task as task on task.project_id = project.project_id
    where project.user_id = harvey_id
      and project.name = 'ArchiveNeedle archived project'
      and project.archived_at is not null
      and task.user_id = harvey_id
      and task.title = 'ArchiveNeedle archived task fixture'
      and task.archived_at is not null
      and task.deleted_at is null
  ) or not exists (
    select 1
    from public.tbl_task as task
    join public.tbl_project as project on project.project_id = task.project_id
    where task.user_id = harvey_id
      and task.title = 'Active ArchiveNeedle task in archived project'
      and task.archived_at is null
      and project.is_archived
      and task.deleted_at is null
  ) then
    raise exception 'FAIL: archived search fixtures are incomplete';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = james_id
      and title = 'James ArchiveNeedle task fixture'
      and deleted_at is null
  ) then
    raise exception 'FAIL: second-user search fixture is missing';
  end if;

  if not exists (
    select 1
    from public.tbl_task
    where user_id = james_id
      and title = 'James Orbit task fixture'
      and deleted_at is null
  ) then
    raise exception 'FAIL: second-user ownership search fixture is missing';
  end if;

  raise notice 'PASS: search fixtures cover ranking, descriptions, accents, deletion, archives, and ownership';
end;
$$;
select
  'three_defaults_per_user' as check_name,
  case
    when (
      select count(*) = 0
      from (
        select user_id, count(*) as level_count
        from public.tbl_priority_level
        where deleted_at is null
        group by user_id
        having count(*) <> 3
      ) as result
    )
      then 'PASS'
    else 'FAIL'
  end as result;

select
  'exactly_one_default_per_user' as check_name,
  case
    when (
      select count(*) = 0
      from (
        select user_id
        from public.tbl_priority_level
        where deleted_at is null and is_default = true
        group by user_id
        having count(*) <> 1
      ) as result
    )
      then 'PASS'
    else 'FAIL'
  end as result;

select
  'no_task_points_to_other_users_priority' as check_name,
  case
    when (
      select count(*) = 0
      from public.tbl_task as task
      join public.tbl_priority_level as priority_level
        on priority_level.priority_id = task.priority_id
      where task.user_id <> priority_level.user_id
    )
      then 'PASS'
    else 'FAIL'
  end as result;

select
  'label_sort_order_unique_per_user' as check_name,
  case
    when (
      select count(*) = 0
      from (
        select user_id, sort_order
        from public.tbl_label
        group by user_id, sort_order
        having count(*) > 1
      ) as result
    )
      then 'PASS'
    else 'FAIL'
  end as result;

select
  'settings_row_per_user' as check_name,
  case
    when (
      select count(*) = 0
      from (
        select user_id
        from public.tbl_user_setting
        group by user_id
        having count(*) <> 1
      ) as result
    )
      then 'PASS'
    else 'FAIL'
  end as result;

select
  'james_settings_seeded_values' as check_name,
  case
    when (
      select exists (
        select 1
        from public.tbl_user_setting as settings
        join public.tbl_user as user_profile on user_profile.user_id = settings.user_id
        where user_profile.email = 'james@example.com'
          and settings.dashboard_task_limit = 3
          and settings.dashboard_project_limit = 4
          and settings.font_size = 'large'
          and settings.font_family = 'serif'
      )
    )
      then 'PASS'
    else 'FAIL'
  end as result;

do $$
declare
  actual_count integer;
  expected record;
begin
  for expected in
    select *
    from (values
      ('harvey@example.com', 'tasks', 3),
      ('harvey@example.com', 'projects', 1),
      ('harvey@example.com', 'labels', 1),
      ('james@example.com', 'tasks', 1),
      ('james@example.com', 'projects', 0),
      ('james@example.com', 'labels', 1)
    ) as fixture_counts(email, item_type, expected_count)
  loop
    if expected.item_type = 'tasks' then
      select count(*)
      into actual_count
      from public.tbl_task as task
      join public.tbl_user as profile on profile.user_id = task.user_id
      where profile.email = expected.email
        and task.title like 'Archive fixture %'
        and task.deleted_at is null
        and task.archived_at is not null;
    elsif expected.item_type = 'projects' then
      select count(*)
      into actual_count
      from public.tbl_project as project
      join public.tbl_user as profile on profile.user_id = project.user_id
      where profile.email = expected.email
        and project.name like 'Archive fixture %'
        and project.deleted_at is null
        and project.archived_at is not null;
    else
      select count(*)
      into actual_count
      from public.tbl_label as label
      join public.tbl_user as profile on profile.user_id = label.user_id
      where profile.email = expected.email
        and label.name like 'Archive fixture %'
        and label.archived_at is not null;
    end if;

    if actual_count < expected.expected_count then
      raise exception
        'FAIL: expected at least % archived fixture % for %, found %',
        expected.expected_count, expected.item_type, expected.email, actual_count;
    end if;
    raise notice 'PASS: % archived fixtures for %',
      expected.item_type, expected.email;
  end loop;

  if not exists (
    select 1
    from public.tbl_task as task
    join public.tbl_project as project
      on project.project_id = task.project_id
    join public.tbl_user as profile
      on profile.user_id = task.user_id
    where profile.email = 'harvey@example.com'
      and project.name = 'Filtering - Client Work'
      and not project.is_archived
      and task.title = 'Archive fixture - active task'
      and task.archived_at is null
      and task.deleted_at is null
  ) then
    raise exception 'FAIL: active task archive fixture is missing';
  end if;
  raise notice 'PASS: active task archive fixture is present';

  if not exists (
    select 1
    from public.tbl_label as label
    join public.tbl_user as profile
      on profile.user_id = label.user_id
    where profile.email = 'harvey@example.com'
      and label.name = 'Archive fixture - Active task label'
      and label.archived_at is null
  ) then
    raise exception 'FAIL: active label archive fixture is missing';
  end if;
  raise notice 'PASS: active label archive fixture is present';

  if exists (
    select 1
    from public.tbl_project
    where is_inbox and is_archived
  ) then
    raise exception 'FAIL: an Inbox project is archived';
  end if;
  raise notice 'PASS: no Inbox project is archived';

  if exists (
    select 1
    from public.tbl_project
    where is_archived is distinct from (archived_at is not null)
  ) then
    raise exception 'FAIL: project is_archived and archived_at disagree';
  end if;
  raise notice 'PASS: project archive flags match archived_at';

  if not exists (
    select 1
    from public.tbl_project as project
    join public.tbl_user as profile on profile.user_id = project.user_id
    join public.tbl_task as task on task.project_id = project.project_id
    where profile.email = 'harvey@example.com'
      and project.name = 'Archive fixture - Archived project'
      and project.is_archived
      and task.title = 'Archive fixture - active task in archived project'
      and task.archived_at is null
      and task.deleted_at is null
  ) then
    raise exception 'FAIL: archived project does not contain its active task fixture';
  end if;
  raise notice 'PASS: archived project contains an active task';

  if not exists (
    select 1
    from public.tbl_label as label
    join public.tbl_task_label as task_label on task_label.label_id = label.label_id
    join public.tbl_task as task on task.task_id = task_label.task_id
    join public.tbl_user as profile on profile.user_id = label.user_id
    where profile.email = 'harvey@example.com'
      and label.name = 'Archive fixture - Archived label'
      and label.archived_at is not null
      and task.title = 'Archive fixture - active task in archived project'
      and task.archived_at is null
      and task.deleted_at is null
  ) then
    raise exception 'FAIL: archived label is not attached to its active task fixture';
  end if;
  raise notice 'PASS: archived label remains attached to an active task';

  if not exists (
    select 1
    from public.tbl_task
    where title = 'Archive fixture ArchiveNeedle - labeled task'
      and archived_at is not null
      and deleted_at is null
  ) then
    raise exception 'FAIL: distinctive archived search task fixture is missing';
  end if;
  raise notice 'PASS: distinctive archived search task fixture is present';
end;
$$;
