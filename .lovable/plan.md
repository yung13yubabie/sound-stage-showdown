## 範圍

把「貼連結=建作品」升級為**可聽、可預覽、可驗證、可投稿**的完整音樂內容流程,涵蓋前端 UX、Supabase schema、RPC 與 server function 強檢核。

---

## 一、資料庫遷移(一次性 migration)

### 1.1 `tracks` 新增欄位
- `verification_status` enum: `unverified | pending_claim_code | verified_claim_code | verified_official | manual_review_required | rejected`(預設 `unverified`)
- `verification_method` enum: `none | claim_code | youtube_oauth | soundcloud_oauth | manual_review`
- `verification_code text`(8碼,系統產生,例 `SA-8F3K2`)
- `verified_at timestamptz`
- `verification_note text`
- `audio_file_url text`(若不存在則新增,用於上傳音檔)
- `creation_proof_at timestamptz`(平台/檔案推得的創作時間,供 within_submission_window 檢核)

RLS:`verification_status / verified_at / verification_code` 一般使用者**不可** UPDATE → 新增 BEFORE UPDATE trigger:非 host_admin 嘗試改這些欄位時 RAISE。

### 1.2 `competitions` 新增資格規則欄位
- `work_visibility_requirement enum`:`public_allowed | unlisted_allowed | private_submission_only`
- `creation_time_requirement enum`:`no_limit | after_competition_start | within_submission_window | manual_proof_required`
- `ownership_verification_requirement enum`:`none | claim_code | oauth_required | manual_review | oauth_or_manual`
- `ai_policy enum`:`allowed_disclosed | ai_only | human_only | hybrid_allowed`

(同樣加到 `competition_rounds` 作為可覆寫的 per-round 規則,nullable)

### 1.3 主辦權限
保留現狀(任何 authenticated user 可建立 competition/event,自己即 host)。RLS 已限定 host 才能管理輪次/審核/結算 → 補強檢查每個寫入路徑。

### 1.4 兩個新 RPC

**`request_track_verification(_track_id uuid) → text`**
- 確認 caller = creator
- 產生 `SA-XXXXX` 寫入 `verification_code`,設 `pending_claim_code`
- 回傳驗證碼

**`confirm_track_verification(_track_id uuid, _found_text text) → verification_status`**
- 由 server function 抓取原始頁面 HTML 後傳入 `_found_text`
- 比對驗證碼存在 → 設 `verified_claim_code` + `verified_at`,否則維持 pending

**`submit_to_competition(_competition_id uuid, _track_id uuid, _user_confirmed bool)` (取代/包裝現有投稿)**
- 強檢核:
  - track 屬於 caller
  - `_user_confirmed = true`(規則同意 checkbox)
  - 依 competition 規則檢查:
    - `ownership_verification_requirement` ≠ none → track.verification_status 必須 verified_*
    - `ai_policy = allowed_disclosed` → track.ai_disclosure 不可為空
    - `creation_time_requirement = after_competition_start` → track.creation_proof_at ≥ competition.start_at
    - `work_visibility_requirement = private_submission_only` → track.status ≠ published
  - 失敗時 `RAISE EXCEPTION` 中文明確原因
- 同邏輯也套用到 `cast_*` 之外的 round entry 建立

---

## 二、Server Functions(`src/lib/`)

### 2.1 `track-verification.functions.ts`
- `requestVerification({trackId})` → 呼叫 RPC 產生碼,回傳給前端顯示
- `confirmVerification({trackId})` → 用 fetch 抓 source_url HTML,呼叫 RPC 比對

### 2.2 `track-upload.functions.ts`(可選,先用 client 直傳 Supabase Storage)
- 建立 storage bucket `track-audio`(public read,authenticated insert 限自己資料夾)
- 限制 mime: `audio/mpeg|wav|m4a|mp4`,size ≤ 30MB(client-side 檢)

### 2.3 擴充現有 `track-metadata.functions.ts`
- 對 YouTube/Suno/Udio 額外抓 `uploadDate / datePublished` JSON-LD,寫到 `creation_proof_at`

---

## 三、前端

### 3.1 `/tracks/new` 重寫
- Step 1:選來源類型(7 種,radio cards)
- Step 2A(連結):貼 URL → 自動抓 metadata → 顯示**可播放預覽**(`MediaEmbed`)+ 抓到的封面/標題/描述 + 「無法站內播放」時顯示原因 chip 與「開啟原始平台」
- Step 2B(上傳):`<input type=file accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a">` → 驗證大小 → 上傳到 Storage → 拿 public URL 寫到 `audio_file_url` + `source_type='upload'`,預覽用 `<audio>`
- Step 3:標題、曲風、創作說明、**AI 使用揭露(必填提示)**、權利聲明 checkbox
- 加上文案:「請上傳或貼上你有權使用的作品...」
- 建立成功 → 引導到驗證頁

### 3.2 `/tracks/$slug` 詳情頁
- 主區塊改為**大型播放器**(MediaEmbed)
- 顯示:來源平台 badge + `StatusBadge` 驗證狀態 + AI 揭露 + 權利聲明
- 若 caller = creator 且 `verification_status = unverified|pending`,顯示「驗證所有權」CTA

### 3.3 新頁 `_authenticated.tracks.$slug.verify.tsx`
- 顯示驗證碼 `SA-XXXXX`
- 提示「貼到描述/標題/留言/bio」
- 「我已放上,重新驗證」按鈕 → 呼叫 `confirmVerification`
- 顯示目前狀態與錯誤訊息

### 3.4 `TrackCard.tsx`
- 加播放圖示按鈕(點擊展開內嵌 player 或導到詳情)
- 角落小 badge 顯示驗證狀態

### 3.5 `EventSubmitButton.tsx` / 比賽投稿
- 投稿前顯示**規則摘要**(從 competition rule 欄位渲染) + 確認 checkbox:「我確認此作品為本人創作...」
- 未勾不可送出
- 改呼叫新的 `submit_to_competition` RPC,捕捉中文錯誤直接 toast

### 3.6 `/host` 主辦中心重寫(`_authenticated.host.tsx`)
- 刪除過時文字
- Tabs:
  - **建立活動** / **建立比賽**(連到現有 new 頁)
  - **我的活動**(進行中/草稿)
  - **我的比賽**(進行中/草稿)
  - **待審核投稿**(聚合所有自己主辦的 event_submissions where pending)
  - **待結算輪次**(round.status = tallying 或 voting 已結束)

### 3.7 建立活動/比賽表單
- 比賽表單加入四個資格規則欄位(Select)

---

## 四、安全強化

- `tracks` BEFORE UPDATE trigger:非 host_admin 改 `verification_status / verified_at / verification_code` → reject
- `round_entries` / `votes`:已透過 cast_vote RPC,本次不動
- `event_submissions` / `round_entries` 寫入也走 RPC(`submit_to_competition`、`submit_to_event`),前端不再直接 INSERT
- `competition_rounds` 結算/狀態變更已在 settle_round 檢查,新增 `set_round_status` RPC 也檢查 host/admin

---

## 五、技術說明(供工程審閱)

- HTML 抓取:server function 用 `fetch` + 限制 follow redirects + 5s timeout,只抓前 200KB 文字防 DoS
- YouTube OAuth:本次只**預留架構**(verification_method enum + UI placeholder「即將支援」),不實作 OAuth flow(避免本輪過大)
- Storage bucket 用 `supabase--storage_create_bucket` 工具建立
- 所有新 RPC 都 `SECURITY DEFINER` + 內部檢查 caller 身分
- migration、storage、code 為三個獨立步驟,migration 先送審

---

## 六、不在本輪範圍

- 真正的 YouTube/SoundCloud OAuth 完整綁定(只留 enum + UI 入口)
- manual_review 後台介面(只留 enum 與狀態)
- 進階的創作時間證明上傳(只用 metadata 推得的 `creation_proof_at`)

確認後我會依序:① migration ② storage bucket ③ server functions ④ 前端頁面。