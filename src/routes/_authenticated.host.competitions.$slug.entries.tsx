import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Gavel } from "lucide-react";

export const Route = createFileRoute("/_authenticated/host/competitions/$slug/entries")({
  head: () => ({ meta: [{ title: "審核投稿與結算 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: comp } = useQuery({
    queryKey: ["host-comp-entries", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("id,title,host_id").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rounds } = useQuery({
    queryKey: ["host-rounds-list", comp?.id],
    enabled: !!comp?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("competition_rounds")
        .select("id,round_number,title,status,advancement_rule,advancement_count")
        .eq("competition_id", comp!.id).order("round_number");
      if (error) throw error;
      return data;
    },
  });

  const settle = useMutation({
    mutationFn: async (roundId: string) => {
      const { error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }).rpc("settle_round", { _round_id: roundId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已結算,前 N 名晉級");
      qc.invalidateQueries({ queryKey: ["host-rounds-list", comp?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "結算失敗"),
  });

  if (!comp) return <div className="p-10 text-center text-muted-foreground">載入中…</div>;
  if (user && comp.host_id !== user.id) return <div className="p-10 text-center text-muted-foreground">只有主辦人可以操作</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/competitions/$slug" params={{ slug }} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 回到比賽
      </Link>
      <h1 className="font-display text-3xl text-cream md:text-4xl">{comp.title} · 審核與結算</h1>

      <section className="mt-8 space-y-6">
        {rounds?.map((r) => (
          <RoundReview key={r.id} round={r} onSettle={() => settle.mutate(r.id)} settling={settle.isPending} />
        ))}
        {(!rounds || rounds.length === 0) && (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">尚未建立輪次</p>
        )}
      </section>
    </div>
  );
}

function RoundReview({ round, onSettle, settling }: { round: { id: string; round_number: number; title: string; status: string; advancement_rule: string; advancement_count: number | null }; onSettle: () => void; settling: boolean }) {
  const qc = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["host-round-entries", round.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("round_entries")
        .select("id,status,public_vote_count,rank,final_score,creator_id,tracks(title),profiles:creator_id(username,display_name)" as string)
        .eq("round_id", round.id)
        .order("rank", { ascending: true, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      return data as unknown as Array<{
        id: string; status: string; public_vote_count: number; rank: number | null; final_score: number | null;
        creator_id: string;
        tracks: { title: string } | null;
        profiles: { username: string; display_name: string } | null;
      }>;
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("round_entries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已更新");
      qc.invalidateQueries({ queryKey: ["host-round-entries", round.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "更新失敗"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-widest text-ember">第 {round.round_number} 輪 · {round.status}</span>
          <h2 className="font-display text-xl text-cream">{round.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">晉級規則:{round.advancement_rule} · 名額 {round.advancement_count}</p>
        </div>
        <Button onClick={onSettle} disabled={settling} className="bg-gradient-ember text-primary-foreground">
          <Gavel className="mr-2 h-4 w-4" />結算本輪
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {entries && entries.length > 0 ? entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-stage p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {e.rank && <span className="rounded-full bg-ember/10 px-2 py-0.5 text-xs text-ember">#{e.rank}</span>}
                <span className="truncate text-sm text-cream">{e.tracks?.title ?? "—"}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {e.profiles?.display_name ?? e.profiles?.username ?? "—"} · {e.public_vote_count} 票 · 分數 {e.final_score ?? 0}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === "advanced" ? "bg-ember/15 text-ember" : e.status === "approved" ? "bg-secondary text-cream" : e.status === "eliminated" ? "bg-muted text-muted-foreground" : "bg-secondary text-cream"}`}>
                {e.status}
              </span>
              {e.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: e.id, status: "approved" })}><Check className="mr-1 h-3.5 w-3.5" />核可</Button>
                  <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: e.id, status: "rejected" })}><X className="mr-1 h-3.5 w-3.5" />退件</Button>
                </>
              )}
            </div>
          </li>
        )) : (
          <li className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">尚無投稿</li>
        )}
      </ul>
    </div>
  );
}
