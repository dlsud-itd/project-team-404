alter table public.tbl_project
  add column if not exists description varchar(500),
  add column if not exists color char(7),
  add column if not exists is_favorite boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists sort_order integer not null default 0;
