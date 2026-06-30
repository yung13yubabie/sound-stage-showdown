import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/VerificationBadge";
import { requestTrackVerification, confirmTrackVerification } from "@/lib/track-verification.functions";

export const Route = createFileRoute("/_authenticated/tracks/$slug/verify")({
  head: () => ({ meta: [{ title: "驗證作品所有權 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: VerifyTrack,
});

function VerifyTrack() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const requestFn = useServerFn(requestTrackVerification);
  const confirmFn = useServerFn(confirmTrackVerification);
  const [busy, setBusy] = useState(false);

  const { data: track, refetch } = useQuery({
    queryKey: ["verify-track", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!track) return <div className="p-10 text-center text-muted-foreground">載入中或找不到作品</div>;
  if (user && track.creator_id !== user.id) {
    return <div className="p-10 text-center text-muted-foreground">沒有權限</div>;
  }

  const requestCode = async () => {
    setBusy(true);
    try {
      const { code } = await requestFn({ data: { trackId: track.id } });
      toast.success(`驗證碼已產生:${code}`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "產生驗證碼失敗");
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await confirmFn({ data: { trackId: track.id } });
      if (r.status === "verified_claim_code") {
        toast.success("驗證成功!");
      } else if (!r.pageFetched) {
        toast.error("無法讀取來源頁面,請確認連結公開可瀏覽後再試一次");
      } else {
        toast.error("尚未在來源頁面找到驗證碼,請確認已貼上並儲存");
      }
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "驗證失敗");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/tracks/$slug" params={{ slug }} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 回作品頁
      </Link>

      <h1 className="font-display text-3xl text-cream md:text-4xl">驗證作品所有權</h1>
      <p className="mt-2 text-muted-foreground">確認你真的擁有這個外部連結,主辦方就能信任你的投稿。</p>

      <div className="mt-6 flex items-center gap-3">
        <VerificationBadge status={track.verification_status} />
        <span className="text-xs text-muted-foreground truncate">{track.source_url ?? "(無來源 URL)"}</span>
      </div>

      <ol className="mt-8 space-y-4">
        <li className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-ember">Step 1</div>
          <h2 className="mt-1 font-display text-lg text-cream">取得專屬驗證碼</h2>
          <p className="mt-2 text-sm text-muted-foreground">系統會產生一組短碼,例如 <code className="rounded bg-stage px-1.5 py-0.5 text-ember">SA-8F3K2</code>。</p>
          {track.verification_code ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-stage p-3">
              <code className="flex-1 font-mono text-lg text-ember">{track.verification_code}</code>
              <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(track.verification_code!); toast.success("已複製"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={requestCode} disabled={busy} className="mt-3 bg-gradient-ember text-primary-foreground">
              {busy ? "處理中..." : "產生驗證碼"}
            </Button>
          )}
        </li>

        <li className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-ember">Step 2</div>
          <h2 className="mt-1 font-display text-lg text-cream">把驗證碼貼到來源頁面</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>YouTube:影片描述、標題、或留言</li>
            <li>Suno / Udio:作品說明、標題、或評論</li>
            <li>SoundCloud:曲目描述</li>
            <li>個人頁面 bio 也可以</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">儲存後,我們會重新抓取該頁面比對驗證碼。</p>
        </li>

        <li className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-ember">Step 3</div>
          <h2 className="mt-1 font-display text-lg text-cream">執行驗證</h2>
          <Button onClick={confirm} disabled={busy || !track.verification_code} className="mt-3 bg-gradient-ember text-primary-foreground">
            <RefreshCcw className="mr-2 h-4 w-4" />
            {busy ? "驗證中..." : "我已放上,執行驗證"}
          </Button>
          {track.verification_note && <p className="mt-2 text-xs text-destructive">{track.verification_note}</p>}
        </li>
      </ol>

      {track.verification_status === "verified_claim_code" && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-ember/40 bg-ember/5 p-4 text-ember">
          <ShieldCheck className="h-5 w-5" /> 已驗證,現在你可以放心投稿到要求驗證的比賽。
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">未來將支援 YouTube / SoundCloud OAuth 強驗證(綁定頻道帳號自動驗證)。</p>
    </div>
  );
}
