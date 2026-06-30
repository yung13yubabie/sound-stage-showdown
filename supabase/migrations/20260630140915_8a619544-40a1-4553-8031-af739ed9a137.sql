
-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE public.track_verification_status AS ENUM (
    'unverified','pending_claim_code','verified_claim_code','verified_official',
    'manual_review_required','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_verification_method AS ENUM (
    'none','claim_code','youtube_oauth','soundcloud_oauth','manual_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.work_visibility_requirement AS ENUM (
    'public_allowed','unlisted_allowed','private_submission_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.creation_time_requirement AS ENUM (
    'no_limit','after_competition_start','within_submission_window','manual_proof_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ownership_verification_requirement AS ENUM (
    'none','claim_code','oauth_required','manual_review','oauth_or_manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_policy AS ENUM (
    'allowed_disclosed','ai_only','human_only','hybrid_allowed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== tracks: 驗證欄位 =====
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS verification_status public.track_verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_method public.track_verification_method NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS creation_proof_at timestamptz,
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false;

-- ===== competitions: 資格規則 =====
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS work_visibility_requirement public.work_visibility_requirement NOT NULL DEFAULT 'public_allowed',
  ADD COLUMN IF NOT EXISTS creation_time_requirement public.creation_time_requirement NOT NULL DEFAULT 'no_limit',
  ADD COLUMN IF NOT EXISTS ownership_verification_requirement public.ownership_verification_requirement NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ai_policy public.ai_policy NOT NULL DEFAULT 'allowed_disclosed';

-- competition_rounds 也可覆寫
ALTER TABLE public.competition_rounds
  ADD COLUMN IF NOT EXISTS ownership_verification_override public.ownership_verification_requirement,
  ADD COLUMN IF NOT EXISTS ai_policy_override public.ai_policy;

-- ===== Trigger: 阻止非 host/admin 修改驗證欄位 =====
CREATE OR REPLACE FUNCTION public.guard_track_verification_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  v_is_admin := public.has_role(v_uid, 'admin');
  IF v_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
     OR NEW.verification_code   IS DISTINCT FROM OLD.verification_code
     OR NEW.verified_at         IS DISTINCT FROM OLD.verified_at
     OR NEW.verification_note   IS DISTINCT FROM OLD.verification_note
     OR NEW.creation_proof_at   IS DISTINCT FROM OLD.creation_proof_at
  THEN
    RAISE EXCEPTION '驗證相關欄位只能透過驗證流程修改' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS tracks_guard_verification ON public.tracks;
CREATE TRIGGER tracks_guard_verification
BEFORE UPDATE ON public.tracks
FOR EACH ROW EXECUTE FUNCTION public.guard_track_verification_columns();

REVOKE EXECUTE ON FUNCTION public.guard_track_verification_columns() FROM PUBLIC, anon, authenticated;

-- ===== RPC: request_track_verification =====
CREATE OR REPLACE FUNCTION public.request_track_verification(_track_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track public.tracks%ROWTYPE;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_track FROM public.tracks WHERE id = _track_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '作品不存在' USING ERRCODE='P0002'; END IF;
  IF v_track.creator_id <> v_uid THEN RAISE EXCEPTION '非作品擁有者' USING ERRCODE='42501'; END IF;

  v_code := 'SA-' || upper(substr(replace(md5(random()::text || clock_timestamp()::text),'0',''), 1, 5));

  UPDATE public.tracks
    SET verification_code = v_code,
        verification_method = 'claim_code',
        verification_status = 'pending_claim_code',
        verification_note = NULL,
        updated_at = now()
    WHERE id = _track_id;
  RETURN v_code;
END
$$;

REVOKE EXECUTE ON FUNCTION public.request_track_verification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_track_verification(uuid) TO authenticated;

-- ===== RPC: confirm_track_verification =====
CREATE OR REPLACE FUNCTION public.confirm_track_verification(_track_id uuid, _found_text text)
RETURNS public.track_verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track public.tracks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_track FROM public.tracks WHERE id = _track_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '作品不存在' USING ERRCODE='P0002'; END IF;
  IF v_track.creator_id <> v_uid THEN RAISE EXCEPTION '非作品擁有者' USING ERRCODE='42501'; END IF;
  IF v_track.verification_code IS NULL THEN
    RAISE EXCEPTION '尚未產生驗證碼' USING ERRCODE='22023';
  END IF;

  IF position(v_track.verification_code IN COALESCE(_found_text,'')) > 0 THEN
    UPDATE public.tracks
      SET verification_status = 'verified_claim_code',
          verified_at = now(),
          verification_note = NULL,
          updated_at = now()
      WHERE id = _track_id;
    RETURN 'verified_claim_code';
  ELSE
    UPDATE public.tracks
      SET verification_status = 'pending_claim_code',
          verification_note = '驗證碼未在來源頁面找到',
          updated_at = now()
      WHERE id = _track_id;
    RETURN 'pending_claim_code';
  END IF;
END
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_track_verification(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_track_verification(uuid,text) TO authenticated;

-- ===== RPC: submit_to_competition =====
-- 改為唯一的 round_entries 投稿入口
CREATE OR REPLACE FUNCTION public.submit_to_competition(
  _round_id uuid,
  _track_id uuid,
  _user_confirmed boolean
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_track public.tracks%ROWTYPE;
  v_round public.competition_rounds%ROWTYPE;
  v_comp public.competitions%ROWTYPE;
  v_ownership public.ownership_verification_requirement;
  v_ai public.ai_policy;
  v_entry_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '需要登入' USING ERRCODE='42501'; END IF;
  IF NOT _user_confirmed THEN RAISE EXCEPTION '請先勾選投稿確認聲明' USING ERRCODE='22023'; END IF;

  SELECT * INTO v_track FROM public.tracks WHERE id = _track_id;
  IF NOT FOUND THEN RAISE EXCEPTION '作品不存在' USING ERRCODE='P0002'; END IF;
  IF v_track.creator_id <> v_uid THEN RAISE EXCEPTION '只能投稿自己的作品' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_round FROM public.competition_rounds WHERE id = _round_id;
  IF NOT FOUND THEN RAISE EXCEPTION '輪次不存在' USING ERRCODE='P0002'; END IF;
  IF v_round.status NOT IN ('submission_open') THEN
    RAISE EXCEPTION '目前非投稿階段' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = v_round.competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION '比賽不存在' USING ERRCODE='P0002'; END IF;

  v_ownership := COALESCE(v_round.ownership_verification_override, v_comp.ownership_verification_requirement);
  v_ai := COALESCE(v_round.ai_policy_override, v_comp.ai_policy);

  -- 擁有者驗證
  IF v_ownership <> 'none' THEN
    IF v_track.verification_status NOT IN ('verified_claim_code','verified_official') THEN
      RAISE EXCEPTION '本比賽要求作品所有權驗證，請先到作品頁完成驗證' USING ERRCODE='22023';
    END IF;
  END IF;

  -- AI 政策
  IF v_ai = 'allowed_disclosed' AND (v_track.ai_disclosure IS NULL OR length(btrim(v_track.ai_disclosure)) = 0) THEN
    RAISE EXCEPTION '本比賽要求填寫 AI 使用揭露' USING ERRCODE='22023';
  END IF;
  IF v_ai = 'human_only' AND v_track.ai_disclosure IS NOT NULL AND length(btrim(v_track.ai_disclosure)) > 0 THEN
    RAISE EXCEPTION '本比賽不接受 AI 生成作品' USING ERRCODE='22023';
  END IF;
  IF v_ai = 'ai_only' AND (v_track.ai_disclosure IS NULL OR length(btrim(v_track.ai_disclosure)) = 0) THEN
    RAISE EXCEPTION '本比賽僅接受 AI 作品，請填寫 AI 使用揭露' USING ERRCODE='22023';
  END IF;

  -- 公開狀態
  IF v_comp.work_visibility_requirement = 'private_submission_only' AND v_track.status = 'published' THEN
    RAISE EXCEPTION '本比賽要求作品不得公開' USING ERRCODE='22023';
  END IF;

  -- 創作時間
  IF v_comp.creation_time_requirement = 'after_competition_start' THEN
    IF v_track.creation_proof_at IS NULL OR v_track.creation_proof_at < v_round.submission_start_at THEN
      RAISE EXCEPTION '本比賽要求作品創作時間需在比賽開始之後' USING ERRCODE='22023';
    END IF;
  ELSIF v_comp.creation_time_requirement = 'within_submission_window' THEN
    IF v_track.creation_proof_at IS NULL
       OR v_track.creation_proof_at < v_round.submission_start_at
       OR v_track.creation_proof_at > v_round.submission_end_at THEN
      RAISE EXCEPTION '本比賽要求作品需在投稿期間內創作' USING ERRCODE='22023';
    END IF;
  END IF;

  -- 防重複
  IF EXISTS (SELECT 1 FROM public.round_entries WHERE round_id = _round_id AND track_id = _track_id) THEN
    RAISE EXCEPTION '此作品已投稿過此輪次' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.round_entries (round_id, competition_id, track_id, creator_id, status)
    VALUES (_round_id, v_round.competition_id, _track_id, v_uid, 'pending_review')
    RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END
$$;

REVOKE EXECUTE ON FUNCTION public.submit_to_competition(uuid,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_to_competition(uuid,uuid,boolean) TO authenticated;

-- ===== 鎖死 round_entries 寫入：必須透過 RPC =====
REVOKE INSERT, UPDATE, DELETE ON public.round_entries FROM authenticated, anon;
GRANT SELECT ON public.round_entries TO authenticated, anon;
GRANT ALL ON public.round_entries TO service_role;
