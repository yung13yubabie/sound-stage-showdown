-- Hide profiles.user_id (auth UID) from anon; expose only non-identifying columns publicly.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, website_url, youtube_url, instagram_url, x_url, created_at, updated_at) ON public.profiles TO anon;
-- authenticated keeps full SELECT (needed to resolve own/other user_id in app flows).
GRANT SELECT ON public.profiles TO authenticated;