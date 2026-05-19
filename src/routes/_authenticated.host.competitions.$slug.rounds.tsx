import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Database } from "@/integrations/supabase/types";

type AuthorMode = Database["public"]["Enums"]["author_visibility_mode"];
type VoterMode = Database["public"]["Enums"]["voter_visibility_mode"];
type AdvanceRule = Database["public"]["Enums"]["advancement_rule"];
type RoundStatus = Database["public"]["Enums"]["round_status"];

export const Route = createFileRoute("/_authenticated/host/competitions/$slug/rounds")({
  head: () => ({ meta: [{ title: "管理輪次 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: ManageRounds,
});

const schema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional(),
  submission_start_at: z.string().optional(),
  submission_end_at: z.string().optional(),
  voting_start_at: z.string().optional(),
  voting_end_at: z.string().optional(),
  reveal_at: z.string().optional(),
  results_publish_at: z.string().optional(),
  author_visibility_mode: z.enum(["public_all_the_time", "anonymous_until_round_end", "anonymous_until_competition_end", "anonymous_then_public_voting"]),
  voter_visibility_mode: z.enum(["private_vote", "public_voter_name", "anonymous_to_public", "admin_only"]),
  advancement_rule: z.enum(["top_n", "score_threshold", "judge_pick", "host_manual", "mixed"]),
  advancement_count: z.coerce.number().int().min(1).max(100),
  max_votes_per_user: z.coerce.number().int().min(1).max(100),
  allow_self_vote: z.boolean(),
  reset_votes_from_previous_round: z.boolean(),
});

function ManageRounds() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: comp } = useQuery({
    queryKey: ["host-competition", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rounds } = useQuery({
    queryKey: ["host-rounds", comp?.id],
    enabled: !!comp?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("competition_rounds").select("*").eq("competition_id", comp!.id).order("round_number");
      if (error) throw error;
      return data;
    },
  });

  const isOwner = comp && user && comp.host_id === user.id;
  if (!comp) return <div className="p-10 text-center text-muted-foreground">載入中...</div>;
  if (!isOwner) return <div className="p-10 text-center text-muted-foreground">只有主辦人可以管理輪次</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">{comp.title} · 輪次</h1>
      <p className="mt-1 text-sm text-muted-foreground">每輪可獨立設定匿名/實名、晉級規則。</p>

      <section className="mt-8 space-y-3">
        {rounds?.map((r) => (
          <RoundRow key={r.id} round={r} onChange={() => qc.invalidateQueries({ queryKey: ["host-rounds", comp.id] })} />
        ))}
        {(!rounds || rounds.length === 0) && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">尚未建立任何輪次</p>
        )}
      </section>

      <NewRoundForm competitionId={comp.id} nextNumber={(rounds?.length ?? 0) + 1} onCreated={() => qc.invalidateQueries({ queryKey: ["host-rounds", comp.id] })} />
    </div>
  );
}

function RoundRow({ round, onChange }: { round: Database["public"]["Tables"]["competition_rounds"]["Row"]; onChange: () => void }) {
  const [status, setStatus] = useState<RoundStatus>(round.status);
  const [busy, setBusy] = useState(false);

  const save = async (newStatus: RoundStatus) => {
    setBusy(true);
    const { error } = await supabase.from("competition_rounds").update({ status: newStatus }).eq("id", round.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStatus(newStatus);
    toast.success("已更新");
    onChange();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-ember">第 {round.round_number} 輪</span>
          <h3 className="font-display text-lg text-cream">{round.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => save(v as RoundStatus)} disabled={busy}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["draft","warmup","submission_open","submission_closed","reviewing","voting_anonymous","identity_reveal","voting_public","tallying","round_results_published","completed"] as RoundStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>作者揭露:{round.author_visibility_mode}</div>
        <div>投票者:{round.voter_visibility_mode}</div>
        <div>晉級:{round.advancement_rule} (前 {round.advancement_count})</div>
      </div>
    </div>
  );
}

function NewRoundForm({ competitionId, nextNumber, onCreated }: { competitionId: string; nextNumber: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: `第 ${nextNumber} 輪`,
    description: "",
    submission_start_at: "",
    submission_end_at: "",
    voting_start_at: "",
    voting_end_at: "",
    reveal_at: "",
    results_publish_at: "",
    author_visibility_mode: "anonymous_until_round_end" as AuthorMode,
    voter_visibility_mode: "private_vote" as VoterMode,
    advancement_rule: "top_n" as AdvanceRule,
    advancement_count: 5,
    max_votes_per_user: 3,
    allow_self_vote: false,
    reset_votes_from_previous_round: true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mt-6 bg-gradient-ember text-primary-foreground">＋ 新增第 {nextNumber} 輪</Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    setLoading(true);
    const toIso = (s?: string) => s ? new Date(s).toISOString() : null;
    const { error } = await supabase.from("competition_rounds").insert({
      competition_id: competitionId,
      round_number: nextNumber,
      title: p.data.title,
      description: p.data.description || null,
      submission_start_at: toIso(p.data.submission_start_at),
      submission_end_at: toIso(p.data.submission_end_at),
      voting_start_at: toIso(p.data.voting_start_at),
      voting_end_at: toIso(p.data.voting_end_at),
      reveal_at: toIso(p.data.reveal_at),
      results_publish_at: toIso(p.data.results_publish_at),
      author_visibility_mode: p.data.author_visibility_mode,
      voter_visibility_mode: p.data.voter_visibility_mode,
      advancement_rule: p.data.advancement_rule,
      advancement_count: p.data.advancement_count,
      max_votes_per_user: p.data.max_votes_per_user,
      allow_self_vote: p.data.allow_self_vote,
      reset_votes_from_previous_round: p.data.reset_votes_from_previous_round,
      status: "draft",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("輪次已建立");
    setOpen(false);
    onCreated();
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl text-cream">新增第 {nextNumber} 輪</h2>
      <div>
        <Label>輪次標題 *</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={80} />
      </div>
      <div>
        <Label>說明</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="投稿開始"><Input type="datetime-local" value={form.submission_start_at} onChange={(e) => set("submission_start_at", e.target.value)} /></Field>
        <Field label="投稿結束"><Input type="datetime-local" value={form.submission_end_at} onChange={(e) => set("submission_end_at", e.target.value)} /></Field>
        <Field label="投票開始"><Input type="datetime-local" value={form.voting_start_at} onChange={(e) => set("voting_start_at", e.target.value)} /></Field>
        <Field label="投票結束"><Input type="datetime-local" value={form.voting_end_at} onChange={(e) => set("voting_end_at", e.target.value)} /></Field>
        <Field label="揭露身份時間"><Input type="datetime-local" value={form.reveal_at} onChange={(e) => set("reveal_at", e.target.value)} /></Field>
        <Field label="發布結果時間"><Input type="datetime-local" value={form.results_publish_at} onChange={(e) => set("results_publish_at", e.target.value)} /></Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>作者揭露模式</Label>
          <Select value={form.author_visibility_mode} onValueChange={(v) => set("author_visibility_mode", v as AuthorMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public_all_the_time">全程實名</SelectItem>
              <SelectItem value="anonymous_until_round_end">匿名到本輪結束</SelectItem>
              <SelectItem value="anonymous_until_competition_end">匿名到比賽結束</SelectItem>
              <SelectItem value="anonymous_then_public_voting">匿名→實名後再開放投票</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>投票者揭露模式</Label>
          <Select value={form.voter_visibility_mode} onValueChange={(v) => set("voter_visibility_mode", v as VoterMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private_vote">完全私密</SelectItem>
              <SelectItem value="public_voter_name">公開投票者</SelectItem>
              <SelectItem value="anonymous_to_public">對大眾匿名</SelectItem>
              <SelectItem value="admin_only">僅主辦/管理員可見</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>晉級規則</Label>
          <Select value={form.advancement_rule} onValueChange={(v) => set("advancement_rule", v as AdvanceRule)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top_n">前 N 名</SelectItem>
              <SelectItem value="score_threshold">達分數門檻</SelectItem>
              <SelectItem value="judge_pick">評審欽點</SelectItem>
              <SelectItem value="host_manual">主辦人手動</SelectItem>
              <SelectItem value="mixed">混合</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>晉級名額 N</Label>
          <Input type="number" min={1} max={100} value={form.advancement_count} onChange={(e) => set("advancement_count", Number(e.target.value))} />
        </div>
        <div>
          <Label>每人投票上限</Label>
          <Input type="number" min={1} max={100} value={form.max_votes_per_user} onChange={(e) => set("max_votes_per_user", Number(e.target.value))} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-stage p-3">
        <Label>允許投自己</Label>
        <Switch checked={form.allow_self_vote} onCheckedChange={(v) => set("allow_self_vote", v)} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-stage p-3">
        <Label>進入下輪時票數歸零</Label>
        <Switch checked={form.reset_votes_from_previous_round} onCheckedChange={(v) => set("reset_votes_from_previous_round", v)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1 bg-gradient-ember text-primary-foreground">
          {loading ? "建立中..." : "建立輪次"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}
