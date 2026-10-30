create type if not exists public.task_recurrence as enum ('none', 'daily', 'weekly', 'monthly');

alter table public.tbl_task
  add column if not exists scheduled_date date,
  add column if not exists deadline timestamptz,
  add column if not exists recurrence public.task_recurrence default 'none';
