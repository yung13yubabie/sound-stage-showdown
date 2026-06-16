-- 1) 去重既有資料 (保留最早一筆)
DELETE FROM public.votes v
USING public.votes v2
WHERE v.voter_id = v2.voter_id
  AND v.round_entry_id = v2.round_entry_id
  AND v.created_at > v2.created_at;

-- 2) 加 UNIQUE 限制：同一人對同一首作品只能一票
ALTER TABLE public.votes
  ADD CONSTRAINT votes_voter_entry_unique UNIQUE (voter_id, round_entry_id);

-- 3) 撤掉一般使用者直接寫 votes 的權限 (保留 select)
REVOKE INSERT, UPDATE, DELETE ON public.votes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.votes FROM anon;

-- 4) 移除舊的 INSERT/DELETE 政策，避免被當作 bypass 路徑
DROP POLICY IF EXISTS "votes_authenticated_insert" ON public.votes;
DROP POLICY IF EXISTS "votes_self_delete" ON public.votes;

-- 5) cast_vote: 唯一合法的投票入口
CREATE OR REPLACE FUNCTION public.cast_vote(_entry_id uuid)
RETURNS TABLE(action text, vote_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entry public.round_entries%ROWTYPE;
  v_round public.competition_rounds%ROWTYPE;
  v_existing public.votes%ROWTYPE;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '需要登入' USING ERRCODE = '42501';
  END IF;

  -- Lock entry + round
  SELECT * INTO v_entry FROM public.round_entries WHERE id = _entry_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '作品不存在' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_round FROM public.competition_rounds WHERE id = v_entry.round_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '輪次不存在' USING ERRCODE = 'P0002';
  END IF;

  -- 必須是投票階段
  IF v_round.status NOT IN ('voting_anonymous','voting_public') THEN
    RAISE EXCEPTION '目前非投票階段' USING ERRCODE = '22023';
  END IF;

  -- 作品必須是 approved/advanced
  IF v_entry.status NOT IN ('approved','advanced') THEN
    RAISE EXCEPTION '此作品目前不可投票' USING ERRCODE = '22023';
  END IF;

  -- 禁止投給自己 (除非允許)
  IF NOT COALESCE(v_round.allow_self_vote, false) AND v_entry.creator_id = v_uid THEN
    RAISE EXCEPTION '不能投給自己的作品' USING ERRCODE = '22023';
  END IF;

  -- Toggle: 已投過 → 取消
  SELECT * INTO v_existing FROM public.votes
    WHERE voter_id = v_uid AND round_entry_id = _entry_id
    FOR UPDATE;
  IF FOUND THEN
    DELETE FROM public.votes WHERE id = v_existing.id;
    RETURN QUERY SELECT 'removed'::text, v_existing.id;
    RETURN;
  END IF;

  -- 檢查 max_votes_per_user
  SELECT COUNT(*) INTO v_count FROM public.votes
    WHERE voter_id = v_uid AND round_id = v_entry.round_id;
  IF v_count >= COALESCE(v_round.max_votes_per_user, 1) THEN
    RAISE EXCEPTION '已達投票上限 (%)', v_round.max_votes_per_user USING ERRCODE = '22023';
  END IF;

  -- Insert; vote_weight 強制 = 1, visibility 由 round 決定
  INSERT INTO public.votes (
    competition_id, round_id, round_entry_id, voter_id, vote_weight, visibility_mode
  ) VALUES (
    v_entry.competition_id, v_entry.round_id, _entry_id, v_uid, 1, v_round.voter_visibility_mode
  ) RETURNING id INTO v_existing.id;

  RETURN QUERY SELECT 'added'::text, v_existing.id;
END
$$;

-- 6) RPC 權限：只給 authenticated, 不給 anon / public
REVOKE EXECUTE ON FUNCTION public.cast_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid) TO authenticated;