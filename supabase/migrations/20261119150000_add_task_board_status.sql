do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'task_board_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.task_board_status as enum ('todo', 'in_progress', 'done');
  end if;
end;
$$;

alter table public.tbl_task
  add column if not exists board_status public.task_board_status not null default 'todo';

update public.tbl_task
set board_status = 'done'
where is_done
  and board_status <> 'done';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_task'::regclass
      and conname = 'tbl_task_board_status_matches_is_done'
  ) then
    alter table public.tbl_task
      add constraint tbl_task_board_status_matches_is_done
      check ((board_status = 'done') = is_done);
  end if;
end;
$$;

create index if not exists tbl_task_user_project_board_status_position_idx
  on public.tbl_task (user_id, project_id, board_status, position)
  where deleted_at is null;
