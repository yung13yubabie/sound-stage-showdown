## SoundArena 核心流程修復計畫

這是一次大型修復，涉及 DB migration、RPC、RLS、前端多處。分階段執行，避免一次 migration 過大難以審核。

---

### 階段 1 — 資料庫 Migration（一次送審）

**Schema 變更**
- 新增 enum `track_visibility`（public / unlisted / private / competition_locked）
- 新增 enum `ai_usage_mode`（none / assisted / generated / hybrid / unknown）
- `tracks` 新增 `visibility track_visibility default 'public'`、`ai_usage_mode ai_usage_mode default 'unknown'`、`unlisted_share_token text`
- `round_entries.status` 確認使用 `pending`（若目前 enum 沒有就 ADD VALUE）

**Trigger / 權限重整（核心修正 #1）**
- 移除 `guard_track_verification_columns` trigger
- `REVOKE UPDATE ON public.tracks FROM authenticated`
- `GRANT UPDATE (title, slug, description, genre, lyrics, ai_disclosure, ai_usage_mode, cover_url, source_url, embed_url, audio_file_url, source_type, status, visibility, unlisted_share_token) ON public.tracks TO authenticated`
- 敏感欄位（verification_*, verified_at, creation_proof_at）僅 SECURITY DEFINER RPC 可寫

**RLS 調整 — tracks SELECT**
- public → 任何人
- unlisted → 作者 or 提供 share token（token 檢查在 RPC / server function 層）
- private → 只有作者
- competition_locked → 作者、對應 competition host、通過 `get_round_entries` 已 approved/advanced 的讀者（RPC 內判斷）
- 探索頁查詢改成 `visibility = 'public' AND status = 'published'`

**新增 / 修改 RPC**
- `submit_to_competition`：
  - 內建產生 `anonymous_code`（`encode(gen_random_bytes(6),'hex')`，避免前端 Math.random）
  - 將 status 寫成 `pending`（enum 合法值）
  - 按 `ownership_verification_requirement` 精確判斷（none / claim_code / oauth_required / manual_review / oauth_or_manual）
  - AI 政策改用 `tracks.ai_usage_mode`，不再用 `ai_disclosure` 是否為空
  - `creation_time_requirement` 缺 `creation_proof_at` 時明確拒絕
- 新增 `review_round_entry(_entry_id, _decision, _review_note)` — host/admin only
- 新增 `submit_to_event(_event_id, _track_id, _user_confirmed)` — 檢查 track 擁有者、event.allow_song_submission、活動狀態、重複投稿
- `REVOKE INSERT ON public.event_submissions FROM authenticated`
- `REVOKE UPDATE ON public.round_entries FROM authenticated`（若尚未撤銷）

---

### 階段 2 — 後端 Server Functions（SSRF 防護 #11）

改寫 `src/lib/track-metadata.functions.ts` 與 `src/lib/track-verification.functions.ts` 的 fetch 邏輯：
- `redirect: "manual"`，最多 3 跳，每跳重驗白名單
- DNS resolve 後阻擋 loopback / RFC1918 / link-local / 169.254.169.254 / IPv6 私網
- 保留 timeout（8s）、回應大小上限（300KB）
- In-memory Map 做 per-user + per-IP rate limit（10 req / 10 min）
- metadata 回傳 `published_at` → 前端存為 `creation_proof_at`（明示「平台發布時間 ≠ 創作時間」）

---

### 階段 3 — 前端

**新檔案 / 修改**
- `src/components/RoundSubmitButton.tsx`（新）— checkbox + `submit_to_competition` RPC + 中文錯誤 toast
- `src/components/RoundPanel.tsx` — 用 RoundSubmitButton 取代 direct insert
- `src/components/EventSubmitButton.tsx` — 改呼叫 `submit_to_event` RPC
- `src/routes/_authenticated.host.competitions.$slug.entries.tsx` — 審核按鈕改呼叫 `review_round_entry` RPC
- `src/routes/_authenticated.host.competitions.new.tsx` — 加入 4 個資格規則 Select
- `src/routes/competitions.$slug.tsx` — 顯示規則摘要
- `src/routes/tracks.new.tsx` — 儲存 `creation_proof_at`、`ai_usage_mode`、`visibility` 選擇、提示語
- `src/components/TrackCard.tsx` — 加入播放入口、VerificationBadge、來源平台、「開啟原始平台」按鈕，播放按鈕 `stopPropagation`
- `src/routes/explore.tsx` — 過濾 `visibility = 'public'`

---

### 階段 4 — 手動測試（列成 checklist）

依用戶列出的 9 項情境逐一驗證。

---

### 技術風險

- 現有資料 `tracks.visibility` 全部 backfill 為 `public`，避免既有作品因新欄位消失。
- `round_entry_status` 若已含 `pending` 就不需 ADD VALUE，migration 用條件式處理。
- RLS SELECT 涉及 competition_locked 判斷邏輯較重，改用 SECURITY DEFINER helper function 避免遞迴。

---

### 範圍界線

- 不做 UI 視覺重設計、不新增其他功能。
- 私密 bucket + signed URL：本次先加 `visibility` 欄位與讀取權限判斷；private bucket / signed URL 需先建 storage bucket（需用戶決策），本次僅預留欄位與 RLS，實際 signed URL 換發流程待用戶確認再做。
- OAuth 平台驗證（verified_official）：本次僅在 RPC 判斷該狀態，不新增 OAuth 綁定流程。

執行順序：先送階段 1 migration → 用戶批准後再改前端與 server functions。是否照此進行？
