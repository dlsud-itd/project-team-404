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
      and priority.name = expected.name;

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
