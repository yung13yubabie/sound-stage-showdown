
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, website_url, youtube_url, instagram_url, x_url, created_at, updated_at) ON public.profiles TO anon;

DROP POLICY IF EXISTS user_roles_only_admin_write ON public.user_roles;
CREATE POLICY user_roles_only_admin_write
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS votes_voter_insert_self ON public.votes;
CREATE POLICY votes_voter_insert_self
  ON public.votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS votes_voter_delete_self ON public.votes;
CREATE POLICY votes_voter_delete_self
  ON public.votes FOR DELETE TO authenticated
  USING (auth.uid() = voter_id);
