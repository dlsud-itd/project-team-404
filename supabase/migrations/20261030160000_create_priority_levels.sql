create table public.tbl_priority_level (
  priority_id smallint primary key,
  name varchar(50) not null unique,
  sort_order smallint not null unique,
  constraint tbl_priority_level_name_not_blank check (btrim(name) <> ''),
  constraint tbl_priority_level_name_check
    check (name in ('low', 'medium', 'high'))
);

insert into public.tbl_priority_level (priority_id, name, sort_order)
values
  (1, 'low', 1),
  (2, 'medium', 2),
  (3, 'high', 3);

alter table public.tbl_task
  add column priority_id smallint;

update public.tbl_task as task
set priority_id = priority_level.priority_id
from public.tbl_priority_level as priority_level
where priority_level.name = task.priority::text;

alter table public.tbl_task
  alter column priority_id set not null,
  add constraint tbl_task_priority_id_fkey
    foreign key (priority_id)
    references public.tbl_priority_level(priority_id);

create index tbl_task_priority_id_idx on public.tbl_task (priority_id);

alter table public.tbl_task
  drop column priority;

drop type public.task_priority;

alter table public.tbl_priority_level enable row level security;
revoke all on public.tbl_priority_level from public, anon, authenticated;
