alter table public.tbl_user
  add column email varchar(255);

update public.tbl_user as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where profile.user_id = auth_user.id
  and profile.email is null
  and auth_user.email is not null;

create unique index tbl_user_email_key
  on public.tbl_user (email)
  where email is not null;
