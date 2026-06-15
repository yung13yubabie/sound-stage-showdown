
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, website_url, youtube_url, instagram_url, x_url, created_at, updated_at)
  ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.settle_round(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_round(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_round_entries(uuid) TO anon, authenticated;
