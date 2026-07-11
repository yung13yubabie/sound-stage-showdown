
-- ============================================================
-- 1. Drop old trigger that blocked legitimate RPC updates
-- ============================================================
DROP TRIGGER IF EXISTS trg_guard_track_verification ON public.tracks;
DROP TRIGGER IF EXISTS guard_track_verification_columns ON public.tracks;

-- ============================================================
-- 2. New enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.track_visibility AS ENUM ('public','unlisted','private','competition_locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_usage_mode AS ENUM ('none','assisted','generated','hybrid','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. New columns on tracks
-- ============================================================
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS visibility public.track_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS ai_usage_mode public.ai_usage_mode NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS unlisted_share_token text,
  ADD COLUMN IF NOT EXISTS locked_competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracks_visibility ON public.tracks(visibility);
CREATE INDEX IF NOT EXISTS idx_tracks_share_token ON public.tracks(unlisted_share_token) WHERE unlisted_share_token IS NOT NULL;

-- ============================================================
-- 4. Tracks RLS — replace public read to honour visibility
-- ============================================================
DROP POLICY IF EXISTS tracks_public_read_published ON public.tracks;

-- Helper: can current user read a competition_locked track?
CREATE OR REPLACE FUNCTION public.can_read_locked_track(_track_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tracks t
    LEFT JOIN public.competitions c ON c.id = t.locked_competition_id
    LEFT JOIN public.round_entries re ON re.track_id = t.id AND re.competition_id = t.locked_competition_id
    LEFT JOIN public.competition_rounds cr ON cr.id = re.round_id
    WHERE t.id = _track_id
      AND (
        t.creator_id = auth.uid()
        OR (c.host_id IS NOT NULL AND c.host_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
        OR (
          re.status IN ('approved','advanced','eliminated')
          AND cr.status IN ('voting_anonymous','voting_public','identity_reveal','tallying','round_results_published','completed')
        )
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_read_locked_track(uuid) TO anon, authenticated;

CREATE POLICY tracks_read_by_visibility ON public.tracks
FOR SELECT USING (
  creator_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (
    status = 'published'
    AND (
      visibility = 'public'
      OR (visibility = 'competition_locked' AND public.can_read_locked_track(id))
    )
  )
);
-- unlisted & private are intentionally NOT publicly selectable; unlisted access
-- goes through a server function that validates the share token, then reads
-- as service role (bypassing RLS) OR via a signed read RPC.

-- ============================================================
-- 5. Tracks column-level permissions
--    Sensitive verification / creation-proof columns: RPC only.
-- ============================================================
REVOKE UPDATE ON public.tracks FROM authenticated;
GRANT UPDATE (
  title, slug, description, genre, lyrics,
  ai_disclosure, ai_usage_mode, tools_used, bpm, rights_statement, rights_confirmed,
  cover_url, source_url, embed_url, audio_file_url, source_type,
  status, visibility, unlisted_share_token, locked_competition_id,
  updated_at
) ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;

-- ============================================================
-- 6. Lock down direct writes on submissions
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON public.round_entries FROM authenticated, anon;
REVOKE INSERT, UPDATE ON public.event_submissions FROM authenticated, anon;
-- keep DELETE on event_submissions so users can withdraw via existing RLS policy
GRANT DELETE ON public.event_submissions TO authenticated;
GRANT ALL ON public.round_entries TO service_role;
GRANT ALL ON public.event_submissions TO service_role;

DROP POLICY IF EXISTS round_entries_creator_insert ON public.round_entries;
DROP POLICY IF EXISTS round_entries_host_update ON public.round_entries;
DROP POLICY IF EXISTS event_subs_creator_insert ON public.event_submissions;
DROP POLICY IF EXISTS event_subs_host_update ON public.event_submissions;
-- SELECT + DELETE policies remain

-- ============================================================
-- 7. Rewrite submit_to_competition
--    - status = 'pending' (valid enum value)
--    - server-side anonymous_code
--    - full ownership_verification matrix
--    - AI mode based on tracks.ai_usage_mode
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_to_competition(
  _round_id uuid,
  _track_id uuid,
  _user_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track public.tracks%ROWTYPE;
  v_round public.competition_rounds%ROWTYPE;
  v_comp public.competitions%ROWTYPE;
  v_ownership public.ownership_verification_requirement;
  v_ai public.ai_policy;
  v_entry_id uuid;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  IF NOT _user_confirmed THEN RAISE EXCEPTION '請先勾選投稿確認聲明' USING ERRCODE='22023'; END IF;

  SELECT * INTO v_track FROM public.tracks WHERE id = _track_id;
  IF NOT FOUND THEN RAISE EXCEPTION '作品不存在' USING ERRCODE='P0002'; END IF;
  IF v_track.creator_id <> v_uid THEN RAISE EXCEPTION '只能投稿自己的作品' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_round FROM public.competition_rounds WHERE id = _round_id;
  IF NOT FOUND THEN RAISE EXCEPTION '輪次不存在' USING ERRCODE='P0002'; END IF;
  IF v_round.status <> 'submission_open' THEN
    RAISE EXCEPTION '目前非投稿階段' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = v_round.competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION '比賽不存在' USING ERRCODE='P0002'; END IF;

  v_ownership := COALESCE(v_round.ownership_verification_override, v_comp.ownership_verification_requirement);
  v_ai := COALESCE(v_round.ai_policy_override, v_comp.ai_policy);

  -- Ownership verification matrix
  IF v_ownership = 'none' THEN
    NULL;
  ELSIF v_ownership = 'claim_code' THEN
    IF v_track.verification_status NOT IN ('verified_claim_code','verified_official') THEN
      RAISE EXCEPTION '本比賽要求作品所有權驗證(驗證碼或官方驗證)' USING ERRCODE='22023';
    END IF;
  ELSIF v_ownership = 'oauth_required' THEN
    IF v_track.verification_status <> 'verified_official' THEN
      RAISE EXCEPTION '本比賽只接受官方 OAuth 驗證的作品' USING ERRCODE='22023';
    END IF;
  ELSIF v_ownership = 'manual_review' THEN
    IF v_track.verification_status <> 'verified_official' THEN
      RAISE EXCEPTION '本比賽要求人工審核通過的作品' USING ERRCODE='22023';
    END IF;
  ELSIF v_ownership = 'oauth_or_manual' THEN
    IF v_track.verification_status <> 'verified_official' THEN
      RAISE EXCEPTION '本比賽要求 OAuth 或人工審核通過的作品' USING ERRCODE='22023';
    END IF;
  END IF;

  -- AI policy via ai_usage_mode
  IF v_ai = 'human_only' AND v_track.ai_usage_mode <> 'none' THEN
    RAISE EXCEPTION '本比賽不接受任何 AI 生成或輔助作品' USING ERRCODE='22023';
  END IF;
  IF v_ai = 'ai_only' AND v_track.ai_usage_mode NOT IN ('generated','hybrid','assisted') THEN
    RAISE EXCEPTION '本比賽僅接受 AI 相關作品' USING ERRCODE='22023';
  END IF;
  IF v_ai = 'allowed_disclosed' AND v_track.ai_usage_mode = 'unknown' THEN
    RAISE EXCEPTION '本比賽要求作品先標示 AI 使用狀況' USING ERRCODE='22023';
  END IF;
  IF v_ai IN ('allowed_disclosed','ai_only') AND v_track.ai_usage_mode <> 'none'
     AND (v_track.ai_disclosure IS NULL OR length(btrim(v_track.ai_disclosure)) = 0) THEN
    RAISE EXCEPTION '本比賽要求填寫 AI 使用揭露文字' USING ERRCODE='22023';
  END IF;

  -- Work visibility
  IF v_comp.work_visibility_requirement = 'private_submission_only'
     AND v_track.visibility = 'public' THEN
    RAISE EXCEPTION '本比賽要求作品不得公開,請先將作品可見度改為私密或比賽鎖定' USING ERRCODE='22023';
  END IF;

  -- Creation time
  IF v_comp.creation_time_requirement = 'after_competition_start' THEN
    IF v_track.creation_proof_at IS NULL THEN
      RAISE EXCEPTION '本比賽要求提供創作時間證明,此作品沒有可用的發布時間' USING ERRCODE='22023';
    END IF;
    IF v_track.creation_proof_at < v_round.submission_start_at THEN
      RAISE EXCEPTION '本比賽要求作品創作時間需在比賽開始之後' USING ERRCODE='22023';
    END IF;
  ELSIF v_comp.creation_time_requirement = 'within_submission_window' THEN
    IF v_track.creation_proof_at IS NULL THEN
      RAISE EXCEPTION '本比賽要求提供創作時間證明,此作品沒有可用的發布時間' USING ERRCODE='22023';
    END IF;
    IF v_track.creation_proof_at < v_round.submission_start_at
       OR v_track.creation_proof_at > v_round.submission_end_at THEN
      RAISE EXCEPTION '本比賽要求作品需在投稿期間內創作' USING ERRCODE='22023';
    END IF;
  END IF;

  -- Duplicate
  IF EXISTS (SELECT 1 FROM public.round_entries WHERE round_id = _round_id AND track_id = _track_id) THEN
    RAISE EXCEPTION '此作品已投稿過此輪次' USING ERRCODE='23505';
  END IF;

  -- Anonymous code: cryptographic, not client-provided
  v_code := 'A-' || upper(encode(gen_random_bytes(4), 'hex'));

  INSERT INTO public.round_entries (round_id, competition_id, track_id, creator_id, status, anonymous_code)
    VALUES (_round_id, v_round.competition_id, _track_id, v_uid, 'pending'::round_entry_status, v_code)
    RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END
$$;
GRANT EXECUTE ON FUNCTION public.submit_to_competition(uuid, uuid, boolean) TO authenticated;

-- ============================================================
-- 8. review_round_entry (host/admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.review_round_entry(
  _entry_id uuid,
  _decision text,
  _review_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_entry public.round_entries%ROWTYPE;
  v_host uuid;
  v_new_status public.round_entry_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION '審核決定僅能為 approved 或 rejected' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_entry FROM public.round_entries WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '投稿不存在' USING ERRCODE='P0002'; END IF;

  SELECT host_id INTO v_host FROM public.competitions WHERE id = v_entry.competition_id;
  IF v_host IS NULL OR (v_host <> v_uid AND NOT public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION '只有比賽主辦或管理員可以審核' USING ERRCODE='42501';
  END IF;

  IF v_entry.status <> 'pending' THEN
    RAISE EXCEPTION '此投稿已審核過' USING ERRCODE='22023';
  END IF;

  v_new_status := _decision::public.round_entry_status;

  UPDATE public.round_entries
    SET status = v_new_status,
        review_note = _review_note,
        reviewed_at = now(),
        reviewed_by = v_uid,
        updated_at = now()
    WHERE id = _entry_id;
END
$$;
GRANT EXECUTE ON FUNCTION public.review_round_entry(uuid, text, text) TO authenticated;

-- ============================================================
-- 9. submit_to_event
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_to_event(
  _event_id uuid,
  _track_id uuid,
  _user_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track public.tracks%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  IF NOT _user_confirmed THEN RAISE EXCEPTION '請先勾選投稿確認聲明' USING ERRCODE='22023'; END IF;

  SELECT * INTO v_track FROM public.tracks WHERE id = _track_id;
  IF NOT FOUND THEN RAISE EXCEPTION '作品不存在' USING ERRCODE='P0002'; END IF;
  IF v_track.creator_id <> v_uid THEN
    RAISE EXCEPTION '只能投稿自己的作品' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RAISE EXCEPTION '活動不存在' USING ERRCODE='P0002'; END IF;
  IF NOT COALESCE(v_event.allow_song_submission, false) THEN
    RAISE EXCEPTION '此活動未開放投稿' USING ERRCODE='22023';
  END IF;
  IF v_event.status NOT IN ('scheduled','live','submission_open') THEN
    RAISE EXCEPTION '此活動目前不接受投稿' USING ERRCODE='22023';
  END IF;
  IF v_event.ends_at IS NOT NULL AND v_event.ends_at < now() THEN
    RAISE EXCEPTION '此活動已結束,不接受投稿' USING ERRCODE='22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.event_submissions WHERE event_id = _event_id AND track_id = _track_id) THEN
    RAISE EXCEPTION '此作品已投稿過此活動' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.event_submissions (event_id, track_id, creator_id, status)
    VALUES (_event_id, _track_id, v_uid, 'pending'::submission_status)
    RETURNING id INTO v_id;

  RETURN v_id;
END
$$;
GRANT EXECUTE ON FUNCTION public.submit_to_event(uuid, uuid, boolean) TO authenticated;

-- Ensure reviewed_by column exists (used by review_round_entry)
ALTER TABLE public.round_entries ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.round_entries ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.round_entries ADD COLUMN IF NOT EXISTS review_note text;
