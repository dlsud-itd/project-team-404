create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.tbl_priority_level
  add column if not exists user_id uuid,
  add column if not exists color char(7),
  add column if not exists is_default boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.tbl_priority_level alter column priority_id type integer;
alter table public.tbl_task alter column priority_id type integer;

alter table public.tbl_priority_level
  drop constraint if exists tbl_priority_level_name_key,
  drop constraint if exists tbl_priority_level_sort_order_key,
  drop constraint if exists tbl_priority_level_name_check;

create sequence if not exists public.tbl_priority_level_priority_id_seq;
select setval(
  'public.tbl_priority_level_priority_id_seq',
  coalesce((select max(priority_id) from public.tbl_priority_level), 0),
  true
);

alter table public.tbl_priority_level
  alter column priority_id set default nextval('public.tbl_priority_level_priority_id_seq');

alter table public.tbl_task
  drop constraint if exists tbl_task_priority_id_fkey;

alter table public.tbl_task
  add constraint tbl_task_priority_id_fkey
    foreign key (priority_id)
    references public.tbl_priority_level (priority_id);

create unique index if not exists tbl_priority_level_user_name_active_key
  on public.tbl_priority_level (user_id, lower(name))
  where deleted_at is null;

create or replace function public.create_default_priorities(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tbl_priority_level
  set is_default = false
  where user_id = p_user_id
    and deleted_at is null;

  insert into public.tbl_priority_level (user_id, name, color, sort_order, is_default)
  values
    (p_user_id, 'Low', '#7C3AED', 1, false),
    (p_user_id, 'Medium', '#F59E0B', 2, true),
    (p_user_id, 'High', '#DC2626', 3, false)
  on conflict (user_id, lower(name)) where deleted_at is null
  do update set
    color = excluded.color,
    sort_order = excluded.sort_order,
    is_default = excluded.is_default,
    updated_at = now();
end;
$$;

insert into public.tbl_priority_level (user_id, name, color, sort_order, is_default)
select
  user_profile.user_id,
  priority_default.display_name,
  priority_default.color,
  priority_default.sort_order,
  priority_default.is_default
from public.tbl_user as user_profile
cross join (
  values
    ('low', 'Low', '#7C3AED', 1, false),
    ('medium', 'Medium', '#F59E0B', 2, true),
    ('high', 'High', '#DC2626', 3, false)
) as priority_default(name, display_name, color, sort_order, is_default)
on conflict (user_id, lower(name)) where deleted_at is null do nothing;

update public.tbl_task as task
set priority_id = new_priority.priority_id
from public.tbl_priority_level as old_priority,
     public.tbl_priority_level as new_priority
where task.priority_id = old_priority.priority_id
  and old_priority.user_id is null
  and lower(old_priority.name) in ('low', 'medium', 'high')
  and new_priority.user_id = task.user_id
  and lower(new_priority.name) = lower(old_priority.name)
  and new_priority.deleted_at is null;

delete from public.tbl_priority_level
where user_id is null;

alter table public.tbl_priority_level
  alter column user_id set not null;

alter table public.tbl_priority_level
  add constraint tbl_priority_level_color_check
    check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint tbl_priority_level_user_sort_order_key
    unique (user_id, sort_order) deferrable initially deferred;

create unique index if not exists tbl_priority_level_user_default_key
  on public.tbl_priority_level (user_id)
  where is_default and deleted_at is null;

create index if not exists tbl_priority_level_user_id_idx
  on public.tbl_priority_level (user_id);

create trigger tbl_priority_level_set_updated_at
before update on public.tbl_priority_level
for each row
execute function public.set_updated_at();

alter table public.tbl_label
  add column if not exists sort_order integer not null default 0;

with ranked_labels as (
  select
    label.label_id,
    row_number() over (
      partition by label.user_id
      order by lower(label.name), label.label_id
    ) - 1 as sort_rank
  from public.tbl_label as label
)
update public.tbl_label as label
set sort_order = ranked_labels.sort_rank
from ranked_labels
where label.label_id = ranked_labels.label_id;

create index if not exists tbl_label_user_sort_order_idx
  on public.tbl_label (user_id, sort_order);

create trigger tbl_label_set_updated_at
before update on public.tbl_label
for each row
execute function public.set_updated_at();
