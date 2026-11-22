do $$
begin
  if not exists (
    select 1
    from pg_type as t
    join pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'task_recurrence'
  ) then
    create type public.task_recurrence as enum ('none', 'daily', 'weekly', 'monthly');
  end if;
end;
$$;

alter table public.tbl_task
  add column if not exists scheduled_date date,
  add column if not exists deadline timestamptz,
  add column if not exists recurrence public.task_recurrence default 'none';
