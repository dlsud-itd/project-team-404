-- Feedback round: archive instead of delete, a chosen default project, a sortable dashboard of
-- favorite projects, and a calmer default theme. Every statement is safe to run twice.

-- 1. Priorities can be archived (hidden from pickers and filters) before being deleted for good.
alter table public.tbl_priority_level
  add column if not exists archived_at timestamptz;

create index if not exists tbl_priority_level_user_archived_idx
  on public.tbl_priority_level (user_id, archived_at desc, priority_id desc)
  where archived_at is not null and deleted_at is null;

-- The default level is what new tasks get, so it has to stay visible.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tbl_priority_level'::regclass
      and conname = 'tbl_priority_level_default_not_archived'
  ) then
    alter table public.tbl_priority_level
      add constraint tbl_priority_level_default_not_archived
      check (not (is_default and archived_at is not null));
  end if;
end $$;

-- 2. "Recently accessed" sort on the dashboard.
alter table public.tbl_project
  add column if not exists last_accessed_at timestamptz;

-- 3. The project new tasks go to. Null, or a project that is archived or gone, means the Inbox.
alter table public.tbl_user_setting
  add column if not exists default_project_id integer
    references public.tbl_project (project_id) on delete set null;

-- 4. How the dashboard orders favorite projects.
alter table public.tbl_user_setting
  add column if not exists dashboard_project_sort varchar(20) not null default 'custom';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tbl_user_setting'::regclass
      and conname = 'tbl_user_setting_dashboard_project_sort_check'
  ) then
    alter table public.tbl_user_setting
      add constraint tbl_user_setting_dashboard_project_sort_check
      check (dashboard_project_sort in (
        'custom', 'name-asc', 'name-desc', 'recent', 'created-desc', 'created-asc'
      ));
  end if;
end $$;

-- 5. Data migration: users still on the untouched Terracotta default move to the new neutral
-- "Paper" default. Anyone who picked another preset or changed a color keeps their theme.
update public.tbl_user_setting
set theme = '{
  "mode": "light",
  "preset": "paper",
  "colors": {
    "primary": "#6941c6",
    "secondary": "#73726e",
    "background": "#fbfbfa",
    "surface": "#ffffff",
    "text": "#37352f",
    "muted": "#73726e",
    "border": "#8f8e8a",
    "success": "#2f7d4f",
    "warning": "#8a5a00",
    "error": "#c4332d",
    "info": "#6941c6"
  }
}'::jsonb,
    updated_at = now()
where theme = '{}'::jsonb
   or theme = '{
  "mode": "light",
  "preset": "terracotta",
  "colors": {
    "primary": "#d9531e",
    "secondary": "#d98cf0",
    "background": "#fffaf7",
    "surface": "#ffffff",
    "text": "#1d1714",
    "muted": "#6b5b54",
    "border": "#3a2f2a",
    "success": "#1f7a3d",
    "warning": "#9a5b00",
    "error": "#b42318",
    "info": "#176b87"
  }
}'::jsonb;
