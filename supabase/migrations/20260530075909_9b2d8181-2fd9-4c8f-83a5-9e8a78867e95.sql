CREATE OR REPLACE FUNCTION public.settle_round(_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_uid uuid := auth.uid();
BEGIN
  SELECT cr.*, c.host_id INTO r
  FROM competition_rounds cr
  JOIN competitions c ON c.id = cr.competition_id
  WHERE cr.id = _round_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'round not found'; END IF;
  IF v_uid IS NULL OR (v_uid <> r.host_id AND NOT has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- 1. 票數彙總
  WITH tally AS (
    SELECT re.id AS entry_id, COALESCE(SUM(v.vote_weight), 0)::int AS vote_count
    FROM round_entries re
    LEFT JOIN votes v ON v.round_entry_id = re.id
    WHERE re.round_id = _round_id
      AND re.status IN ('approved','advanced','eliminated')
    GROUP BY re.id
  )
  UPDATE round_entries re
  SET public_vote_count = t.vote_count,
      final_score = (t.vote_count * r.public_vote_weight)
                  + (COALESCE(re.judge_average_score, 0) * r.judge_score_weight),
      updated_at = now()
  FROM tally t
  WHERE re.id = t.entry_id;

  -- 2. 排名
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY final_score DESC NULLS LAST, public_vote_count DESC, created_at) AS rk
    FROM round_entries
    WHERE round_id = _round_id
      AND status IN ('approved','advanced','eliminated')
  )
  UPDATE round_entries re
  SET rank = ranked.rk,
      status = CASE
        WHEN r.advancement_rule = 'top_n' AND ranked.rk <= r.advancement_count THEN 'advanced'::round_entry_status
        WHEN r.advancement_rule = 'top_n' THEN 'eliminated'::round_entry_status
        ELSE re.status
      END
  FROM ranked
  WHERE re.id = ranked.id;

  -- 3. 切狀態
  UPDATE competition_rounds
  SET status = 'round_results_published',
      results_publish_at = COALESCE(results_publish_at, now()),
      updated_at = now()
  WHERE id = _round_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.settle_round(uuid) TO authenticated;