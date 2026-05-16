
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_username text;
  v_display text;
begin
  v_username := coalesce(
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_-]', '', 'g'), ''),
    'user_' || substr(new.id::text, 1, 8)
  );
  while exists (select 1 from public.profiles where username = v_username) loop
    v_username := v_username || '_' || substr(md5(random()::text),1,4);
  end loop;
  v_display := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', v_username);
  insert into public.profiles (user_id, username, display_name, avatar_url)
  values (new.id, v_username, v_display, new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;

revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
