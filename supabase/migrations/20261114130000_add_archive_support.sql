alter table public.tbl_task
  add column if not exists archived_at timestamptz;

alter table public.tbl_label
  add column if not exists archived_at timestamptz;

alter table public.tbl_project
  add column if not exists archived_at timestamptz;

update public.tbl_project
set is_archived = false,
    archived_at = null
where is_inbox
  and is_archived;

update public.tbl_project
set archived_at = updated_at
where is_archived
  and archived_at is null;

update public.tbl_project
set archived_at = null
where not is_archived
  and archived_at is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_project'::regclass
      and conname = 'tbl_project_archived_at_check'
  ) then
    alter table public.tbl_project
      add constraint tbl_project_archived_at_check
      check (is_archived = (archived_at is not null));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_project'::regclass
      and conname = 'tbl_project_inbox_not_archived'
  ) then
    alter table public.tbl_project
      add constraint tbl_project_inbox_not_archived
      check (not (is_inbox and is_archived));
  end if;
end;
$$;

create index if not exists tbl_task_user_archived_idx
  on public.tbl_task (user_id, archived_at desc)
  where deleted_at is null and archived_at is not null;

create index if not exists tbl_task_user_project_active_idx
  on public.tbl_task (user_id, project_id)
  where deleted_at is null and archived_at is null;

create index if not exists tbl_label_user_archived_idx
  on public.tbl_label (user_id, archived_at desc)
  where archived_at is not null;

create index if not exists tbl_project_user_archived_idx
  on public.tbl_project (user_id, archived_at desc)
  where deleted_at is null and archived_at is not null;

create index if not exists tbl_project_user_active_idx
  on public.tbl_project (user_id, is_archived)
  where deleted_at is null and is_archived = false;
