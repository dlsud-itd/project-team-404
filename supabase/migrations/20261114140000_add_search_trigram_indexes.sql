create extension if not exists pg_trgm with schema extensions;

create index if not exists tbl_task_title_trgm_idx
  on public.tbl_task using gin (title gin_trgm_ops)
  where deleted_at is null;

create index if not exists tbl_task_description_trgm_idx
  on public.tbl_task using gin (description gin_trgm_ops)
  where deleted_at is null;

create index if not exists tbl_project_name_trgm_idx
  on public.tbl_project using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists tbl_project_description_trgm_idx
  on public.tbl_project using gin (description gin_trgm_ops)
  where deleted_at is null;
