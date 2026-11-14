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

alter table public.tbl_task
  drop constraint if exists tbl_task_priority_id_fkey;

alter table public.tbl_priority_level
  drop constraint if exists tbl_priority_level_name_key,
  drop constraint if exists tbl_priority_level_sort_order_key,
  drop constraint if exists tbl_priority_level_name_check;

alter table public.tbl_priority_level
  alter column priority_id type integer;

alter table public.tbl_task
  alter column priority_id type integer;

create sequence if not exists public.tbl_priority_level_priority_id_seq;

select setval(
  'public.tbl_priority_level_priority_id_seq',
  coalesce((select max(priority_id) from public.tbl_priority_level), 0) + 1,
  false
);

alter table public.tbl_priority_level
  alter column priority_id set default nextval('public.tbl_priority_level_priority_id_seq');

alter sequence public.tbl_priority_level_priority_id_seq
  owned by public.tbl_priority_level.priority_id;

create unique index if not exists tbl_priority_level_user_name_active_key
  on public.tbl_priority_level (user_id, lower(name))
  where deleted_at is null;

create unique index if not exists tbl_priority_level_user_default_key
  on public.tbl_priority_level (user_id)
  where is_default and deleted_at is null;

with ranked_priorities as (
  select
    priority_id,
    row_number() over (
      partition by user_id
      order by sort_order, priority_id
    ) as sort_rank
  from public.tbl_priority_level
  where user_id is not null
)
update public.tbl_priority_level as priority
set sort_order = ranked_priorities.sort_rank
from ranked_priorities
where priority.priority_id = ranked_priorities.priority_id
  and priority.sort_order <> ranked_priorities.sort_rank;

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
  default_priority.name,
  default_priority.color,
  default_priority.sort_order,
  default_priority.is_default
from public.tbl_user as user_profile
cross join (
  values
    ('Low'::varchar, '#7C3AED'::char(7), 1, false),
    ('Medium'::varchar, '#F59E0B'::char(7), 2, true),
    ('High'::varchar, '#DC2626'::char(7), 3, false)
) as default_priority(name, color, sort_order, is_default)
on conflict (user_id, lower(name)) where deleted_at is null do nothing;

update public.tbl_task as task
set priority_id = user_priority.priority_id
from public.tbl_priority_level as legacy_priority
join public.tbl_priority_level as user_priority
  on lower(user_priority.name) = lower(legacy_priority.name)
where legacy_priority.user_id is null
  and task.priority_id = legacy_priority.priority_id
  and user_priority.user_id = task.user_id
  and user_priority.deleted_at is null;

delete from public.tbl_priority_level
where user_id is null;

alter table public.tbl_priority_level
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_priority_level'::regclass
      and conname = 'tbl_priority_level_user_id_fkey'
  ) then
    alter table public.tbl_priority_level
      add constraint tbl_priority_level_user_id_fkey
      foreign key (user_id)
      references public.tbl_user (user_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_priority_level'::regclass
      and conname = 'tbl_priority_level_color_check'
  ) then
    alter table public.tbl_priority_level
      add constraint tbl_priority_level_color_check
      check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tbl_priority_level'::regclass
      and conname = 'tbl_priority_level_user_sort_order_key'
  ) then
    alter table public.tbl_priority_level
      add constraint tbl_priority_level_user_sort_order_key
      unique (user_id, sort_order)
      deferrable initially deferred;
  end if;
end;
$$;

alter table public.tbl_task
  add constraint tbl_task_priority_id_fkey
    foreign key (priority_id)
    references public.tbl_priority_level (priority_id);

create index if not exists tbl_priority_level_user_id_idx
  on public.tbl_priority_level (user_id);

drop trigger if exists tbl_priority_level_set_updated_at on public.tbl_priority_level;
create trigger tbl_priority_level_set_updated_at
before update on public.tbl_priority_level
for each row
execute function public.set_updated_at();

create or replace function public.set_default_priorities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_default_priorities(new.user_id);
  return new;
end;
$$;

drop trigger if exists tbl_user_insert_default_priorities on public.tbl_user;
create trigger tbl_user_insert_default_priorities
after insert on public.tbl_user
for each row
execute function public.set_default_priorities();

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

drop trigger if exists tbl_label_set_updated_at on public.tbl_label;
create trigger tbl_label_set_updated_at
before update on public.tbl_label
for each row
execute function public.set_updated_at();

create table if not exists public.tbl_user_setting (
  user_id uuid primary key references public.tbl_user (user_id) on delete cascade,
  dashboard_task_limit smallint not null default 5
    constraint tbl_user_setting_dashboard_task_limit_check check (dashboard_task_limit between 1 and 50),
  dashboard_project_limit smallint not null default 5
    constraint tbl_user_setting_dashboard_project_limit_check check (dashboard_project_limit between 1 and 50),
  font_size varchar(10) not null default 'medium'
    constraint tbl_user_setting_font_size_check check (font_size in ('small', 'medium', 'large', 'x-large')),
  font_family varchar(30) not null default 'system'
    constraint tbl_user_setting_font_family_check check (font_family in ('system', 'sans-serif', 'serif', 'monospace', 'atkinson-hyperlegible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_default_user_settings(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tbl_user_setting (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

insert into public.tbl_user_setting (user_id)
select user_profile.user_id
from public.tbl_user as user_profile
on conflict (user_id) do nothing;

create or replace function public.set_default_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_default_user_settings(new.user_id);
  return new;
end;
$$;

drop trigger if exists tbl_user_setting_set_updated_at on public.tbl_user_setting;
create trigger tbl_user_setting_set_updated_at
before update on public.tbl_user_setting
for each row
execute function public.set_updated_at();

drop trigger if exists tbl_user_insert_default_settings on public.tbl_user;
create trigger tbl_user_insert_default_settings
after insert on public.tbl_user
for each row
execute function public.set_default_user_settings();

alter table public.tbl_user_setting enable row level security;
revoke all on public.tbl_user_setting from public, anon, authenticated;
revoke all on sequence public.tbl_priority_level_priority_id_seq from public, anon, authenticated;
