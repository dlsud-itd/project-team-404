with expected_users(username, email) as (
  values
    ('james', 'james@example.com'),
    ('harvey', 'harvey@example.com'),
    ('alex', 'alex@example.com')
),
user_seed_status as (
  select
    bool_and(
      auth_user.id is not null
      and substring(auth_user.id::text from 15 for 1) = '4'
      and lower(substring(auth_user.id::text from 20 for 1)) in (
        '8',
        '9',
        'a',
        'b'
      )
      and auth_user.email_confirmed_at is not null
      and auth_user.encrypted_password =
        extensions.crypt('password123', auth_user.encrypted_password)
      and identity.user_id = auth_user.id
      and identity.identity_data ->> 'email' = expected.email
      and profile.user_id = auth_user.id
      and profile.username = expected.username
      and profile.email = expected.email
      and profile.timezone is not null
      and profile.created_at is not null
      and profile.updated_at is not null
      and profile.deleted_at is null
    ) as passed
  from expected_users as expected
  left join auth.users as auth_user on auth_user.email = expected.email
  left join auth.identities as identity
    on identity.user_id = auth_user.id
    and identity.provider = 'email'
  left join public.tbl_user as profile on profile.user_id = auth_user.id
),
inbox_seed_status as (
  select
    bool_and(
      (
        select count(*)
        from public.tbl_project as project
        where project.user_id = auth_user.id
          and project.is_inbox
          and project.deleted_at is null
      ) = 1
      and exists (
        select 1
        from public.tbl_project as project
        where project.user_id = auth_user.id
          and project.name = 'Inbox'
          and project.is_inbox
          and project.deleted_at is null
      )
    ) as passed
  from expected_users as expected
  left join auth.users as auth_user on auth_user.email = expected.email
),
expected_reset_tokens(email, token_kind) as (
  select expected.email, token_kind.kind
  from (values
    ('james@example.com'),
    ('harvey@example.com'),
    ('alex@example.com')
  ) as expected(email)
  cross join (values ('valid'), ('expired'), ('used')) as token_kind(kind)
),
reset_token_seed_status as (
  select bool_and(
    auth_user.id is not null
    and reset_token.id is not null
    and reset_token.user_id = auth_user.id
    and case expected.token_kind
      when 'valid' then reset_token.expires_at > now()
        and reset_token.used_at is null
      when 'expired' then reset_token.expires_at <= now()
        and reset_token.used_at is null
      when 'used' then reset_token.used_at is not null
      else false
    end
  ) as passed
  from expected_reset_tokens as expected
  left join auth.users as auth_user on auth_user.email = expected.email
  left join public.password_reset_token as reset_token
    on reset_token.token_hash = encode(
      extensions.digest(
        'seed-reset-' || split_part(expected.email, '@', 1) || '-' || expected.token_kind,
        'sha256'
      ),
      'hex'
    )
)
select
  '001_users.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'All three Auth users have UUIDv4 IDs, matching identities and profiles, the shared password, and populated profile fields.'
    else 'One or more Auth users, UUIDs, identities, passwords, or profile fields are missing or incorrect.'
  end as details
from user_seed_status
union all
select
  '002_inbox_projects.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has exactly one active Inbox.'
    else 'One or more seeded users do not have exactly one active Inbox.'
  end as details
from inbox_seed_status
union all
select
  '003_password_reset_tokens.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has a hashed valid token, an expired token, and a used token.'
    else 'One or more seeded users are missing a correctly hashed valid, expired, or used reset token.'
  end as details
from reset_token_seed_status
union all
select
  '004_projects.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has the expected sample projects with descriptions and colors.'
    else 'One or more seeded users are missing the expected sample projects, descriptions, or colors.'
  end as details
from (
  with expected_projects(email, name, description, color, is_favorite, sort_order) as (
    values
      ('james@example.com', 'Work', 'Current priorities and deadlines', '#f59e0b', true, 0),
      ('james@example.com', 'Home', 'Weekend errands and household tasks', '#10b981', false, 1),
      ('harvey@example.com', 'Client Projects', 'Client deliverables and meetings', '#3b82f6', true, 0),
      ('alex@example.com', 'Learning', 'Courses, notes, and references', '#8b5cf6', false, 0)
  ),
  project_seed_status as (
    select
      bool_and(
        auth_user.id is not null
        and project.project_id is not null
        and project.user_id = auth_user.id
        and project.name = expected.name
        and project.description = expected.description
        and project.color = expected.color
        and project.is_inbox = false
        and project.is_favorite = expected.is_favorite
        and project.is_archived = false
        and project.sort_order = expected.sort_order
        and project.deleted_at is null
      ) as passed
    from expected_projects as expected
    left join auth.users as auth_user on auth_user.email = expected.email
    left join public.tbl_project as project
      on project.user_id = auth_user.id
     and project.name = expected.name
  )
  select bool_and(passed) as passed from project_seed_status
) as project_seed_status
union all
select
  '005_tasks.sql' as seed_file,
  case when passed then 'PASS' else 'FAIL' end as status,
  case
    when passed then 'Each seeded user has the expected sample tasks assigned to their projects or Inbox.'
    else 'One or more seeded users are missing the expected tasks, project assignments, or due dates.'
  end as details
from (
  with expected_tasks(email, project_name, title, description, priority, due_date, is_done) as (
    values
      ('james@example.com', 'Work', 'Prepare sprint notes', 'Summarize blockers, wins, and next steps for the team sync.', 'high', '2026-10-31'::date, false),
      ('james@example.com', 'Home', 'Book weekend groceries', 'Finalize the shopping list and place the order before Saturday morning.', 'medium', '2026-11-02'::date, false),
      ('harvey@example.com', 'Client Projects', 'Send client recap', 'Share the status update and next milestone notes with the client.', 'high', '2026-10-29'::date, true),
      ('alex@example.com', 'Learning', 'Finish chapter review', 'Capture the key takeaways and finish the final recap question.', 'low', '2026-11-05'::date, false)
  ),
  task_seed_status as (
    select
      bool_and(
        auth_user.id is not null
        and task.task_id is not null
        and task.user_id = auth_user.id
        and task.title = expected.title
        and task.description = expected.description
        and task.priority::text = expected.priority
        and task.due_date = expected.due_date
        and task.is_done = expected.is_done
        and task.deleted_at is null
        and (
          expected.project_name is null and task.project_id is null
          or expected.project_name is not null and task.project_id = project.project_id
        )
        and (
          select count(*)
          from public.tbl_task as matching_task
          where matching_task.user_id = auth_user.id
            and matching_task.project_id is not distinct from project.project_id
            and matching_task.title = expected.title
            and matching_task.deleted_at is null
        ) = 1
      ) as passed
    from expected_tasks as expected
    left join auth.users as auth_user on auth_user.email = expected.email
    left join public.tbl_project as project
      on project.user_id = auth_user.id
     and project.name = expected.project_name
     and project.deleted_at is null
    left join public.tbl_task as task
      on task.user_id = auth_user.id
     and task.title = expected.title
  )
  select bool_and(passed) as passed from task_seed_status
) as task_seed_status
order by seed_file;
