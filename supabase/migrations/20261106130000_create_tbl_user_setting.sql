create table if not exists public.tbl_user_setting (
  user_id uuid primary key references public.tbl_user (user_id) on delete cascade,
  dashboard_task_limit smallint not null default 5 check (dashboard_task_limit between 1 and 50),
  dashboard_project_limit smallint not null default 5 check (dashboard_project_limit between 1 and 50),
  font_size varchar(10) not null default 'medium' check (font_size in ('small', 'medium', 'large', 'x-large')),
  font_family varchar(30) not null default 'system' check (font_family in ('system', 'sans-serif', 'serif', 'monospace', 'atkinson-hyperlegible')),
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
  insert into public.tbl_user_setting (
    user_id,
    dashboard_task_limit,
    dashboard_project_limit,
    font_size,
    font_family
  )
  values (
    p_user_id,
    5,
    5,
    'medium',
    'system'
  )
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.set_default_user_settings()
returns trigger
language plpgsql
as $$
begin
  perform public.create_default_user_settings(new.user_id);
  return new;
end;
$$;

insert into public.tbl_user_setting (
  user_id,
  dashboard_task_limit,
  dashboard_project_limit,
  font_size,
  font_family
)
select
  user_profile.user_id,
  5,
  5,
  'medium',
  'system'
from public.tbl_user as user_profile
on conflict (user_id) do nothing;

create trigger tbl_user_setting_set_updated_at
before update on public.tbl_user_setting
for each row
execute function public.set_updated_at();

create trigger tbl_user_insert_default_settings
after insert on public.tbl_user
for each row
execute function public.set_default_user_settings();

alter table public.tbl_user_setting enable row level security;
revoke all on public.tbl_user_setting from public, anon, authenticated;
