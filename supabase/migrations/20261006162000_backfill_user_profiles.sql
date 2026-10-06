insert into public.user_profiles (id, display_name)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
