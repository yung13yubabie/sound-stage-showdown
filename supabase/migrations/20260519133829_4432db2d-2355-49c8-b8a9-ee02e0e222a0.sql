
-- Returns round entries with creator_id masked unless the viewer is the host/admin/creator
-- or the round has reached identity_reveal/round_results_published/completed status.
CREATE OR REPLACE FUNCTION public.get_round_entries(_round_id uuid)
RETURNS TABLE (
  id uuid,
  round_id uuid,
  competition_id uuid,
  track_id uuid,
  status round_entry_status,
  anonymous_code text,
  seed_number int,
  public_vote_count int,
  rank int,
  final_score numeric,
  creator_id uuid,
  track_title text,
  track_slug text,
  track_source track_source,
  track_source_url text,
  track_embed_url text,
  track_cover_url text,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_uid uuid := auth.uid();
  v_revealed boolean;
  v_is_host boolean;
BEGIN
  SELECT cr.*, c.host_id INTO r
  FROM competition_rounds cr
  JOIN competitions c ON c.id = cr.competition_id
  WHERE cr.id = _round_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_is_host := (v_uid IS NOT NULL AND (v_uid = r.host_id OR has_role(v_uid, 'admin')));
  v_revealed := r.status IN ('identity_reveal','voting_public','tallying','round_results_published','completed')
                OR r.author_visibility_mode = 'public_all_the_time'
                OR v_is_host;

  RETURN QUERY
  SELECT
    re.id, re.round_id, re.competition_id, re.track_id, re.status,
    re.anonymous_code, re.seed_number, re.public_vote_count, re.rank, re.final_score,
    CASE WHEN v_revealed OR re.creator_id = v_uid THEN re.creator_id ELSE NULL END AS creator_id,
    t.title AS track_title,
    t.slug AS track_slug,
    t.source_type AS track_source,
    t.source_url AS track_source_url,
    t.embed_url AS track_embed_url,
    t.cover_url AS track_cover_url,
    CASE WHEN v_revealed OR re.creator_id = v_uid THEN p.username ELSE NULL END AS creator_username,
    CASE WHEN v_revealed OR re.creator_id = v_uid THEN p.display_name ELSE NULL END AS creator_display_name,
    CASE WHEN v_revealed OR re.creator_id = v_uid THEN p.avatar_url ELSE NULL END AS creator_avatar_url
  FROM round_entries re
  JOIN tracks t ON t.id = re.track_id
  LEFT JOIN profiles p ON p.user_id = re.creator_id
  WHERE re.round_id = _round_id
    AND re.status IN ('approved','advanced','eliminated')
  ORDER BY COALESCE(re.seed_number, 999999), re.created_at;
END $$;

GRANT EXECUTE ON FUNCTION public.get_round_entries(uuid) TO anon, authenticated;
