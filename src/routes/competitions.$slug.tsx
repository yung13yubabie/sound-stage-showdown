import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { StatusBadge } from "@/components/StatusBadge";
import { RoundPanel } from "@/components/RoundPanel";
import { FollowButton } from "@/components/FollowButton";
import { ReminderButton } from "@/components/ReminderButton";

export const Route = createFileRoute("/competitions/$slug")({
  component: CompetitionDetail,
});

function CompetitionDetail() {
  const { slug } = Route.useParams();

  const { data: competition } = useQuery({
    queryKey: ["competition", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rounds } = useQuery({
    queryKey: ["rounds", competition?.id],
    enabled: !!competition?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("*")
        .eq("competition_id", competition!.id)
        .order("round_number");
      if (error) throw error;
      return data;
    },
  });

  if (!competition) return <div className="mx-auto max-w-4xl p-10 text-center text-muted-foreground">載入中...</div>;

  const variant = competition.status === "active" ? "voting" : competition.status === "warmup" ? "warmup" : "scheduled";

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/competitions" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 所有比賽
      </Link>

      <header className="rounded-2xl border border-border bg-card p-6 shadow-stage md:p-10">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-ember shadow-ember">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <StatusBadge variant={variant} />
          <div className="ml-auto flex items-center gap-2">
            <FollowButton targetType="competition" targetId={competition.id} />
            <ReminderButton targetType="competition" targetId={competition.id} remindAt={competition.warmup_countdown_at ?? null} />
          </div>
        </div>
        <h1 className="mt-4 font-display text-4xl text-cream md:text-5xl">{competition.title}</h1>
        {competition.theme && <p className="mt-2 text-ember">主題:{competition.theme}</p>}
        {competition.description && <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{competition.description}</p>}

        {competition.enable_warmup && competition.warmup_countdown_at && (
          <div className="mt-8 rounded-xl border border-ember/30 bg-stage p-6 text-center">
            <div className="text-sm uppercase tracking-widest text-ember">{competition.warmup_label ?? "比賽即將開始"}</div>
            <p className="mt-1 text-xs text-muted-foreground">{competition.warmup_description ?? "準備你的作品,倒數結束後開放投稿。"}</p>
            <div className="mt-6 flex justify-center"><Countdown targetIso={competition.warmup_countdown_at} size="lg" /></div>
          </div>
        )}

        <CompetitionRulesSummary comp={competition} />

        {competition.rules && (
          <details className="mt-6 rounded-lg border border-border bg-stage p-4">
            <summary className="cursor-pointer font-medium text-cream">比賽規則</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{competition.rules}</p>
          </details>
        )}
      </header>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-2xl text-cream">輪次時間軸</h2>
        {rounds && rounds.length > 0 ? (
          <ol className="space-y-4">
            {rounds.map((r) => <RoundPanel key={r.id} round={r} competitionId={competition.id} />)}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            主辦人尚未建立輪次
          </p>
        )}
      </section>
    </article>
  );
}

const OWNERSHIP_LABEL: Record<string, string> = {
  none: "不要求所有權驗證",
  claim_code: "需驗證碼或官方驗證",
  oauth_required: "僅接受官方 OAuth 驗證",
  manual_review: "僅接受人工審核",
  oauth_or_manual: "OAuth 或人工審核",
};
const AI_LABEL: Record<string, string> = {
  any: "AI 不限制",
  allowed_disclosed: "允許 AI 但須揭露",
  human_only: "只接受純人創作",
  ai_only: "只接受 AI 相關作品",
};
const VIS_LABEL: Record<string, string> = {
  public_ok: "公開作品可投稿",
  private_submission_only: "僅接受未公開作品",
};
const TIME_LABEL: Record<string, string> = {
  any: "創作時間不限",
  after_competition_start: "須比賽開始後創作",
  within_submission_window: "須投稿期間內創作",
};

function CompetitionRulesSummary({ comp }: { comp: Record<string, unknown> }) {
  const items = [
    VIS_LABEL[String(comp.work_visibility_requirement ?? "public_ok")],
    TIME_LABEL[String(comp.creation_time_requirement ?? "any")],
    OWNERSHIP_LABEL[String(comp.ownership_verification_requirement ?? "none")],
    AI_LABEL[String(comp.ai_policy ?? "any")],
  ].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((label) => (
        <span key={label} className="rounded-full border border-border bg-stage px-3 py-1 text-xs text-cream">
          {label}
        </span>
      ))}
    </div>
  );
}
