import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, EyeOff, User as UserIcon } from "lucide-react";
import { MediaEmbed } from "@/components/MediaEmbed";
import { maskAnonymousEntries } from "@/lib/anonymity";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";

type Round = Database["public"]["Tables"]["competition_rounds"]["Row"];

type Entry = {
  id: string;
  round_id: string;
  competition_id: string;
  track_id: string;
  status: string;
  anonymous_code: string | null;
  seed_number: number | null;
  public_vote_count: number;
  rank: number | null;
  final_score: number | null;
  creator_id: string | null;
  track_title: string;
  track_slug: string;
  track_source: string;
  track_source_url: string | null;
  track_embed_url: string | null;
  track_cover_url: string | null;
  creator_username: string | null;
  creator_display_name: string | null;
  creator_avatar_url: string | null;
};

export function RoundPanel({ round, competitionId }: { round: Round; competitionId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: entries } = useQuery({
    queryKey: ["round-entries", round.id],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Entry[] | null; error: Error | null }>;
      }).rpc("get_round_entries", { _round_id: round.id });
      if (error) throw error;
      const raw = data ?? [];
      // 客端守門:即使 RPC 不小心回了 creator_*,在匿名階段也強制清空。
      return maskAnonymousEntries(raw, {
        phase: round.status,
        authorVisibility: round.author_visibility_mode,
        viewerUserId: user?.id ?? null,
        hostUserId: null, // 主辦人:server 已授權揭露,mask 仍會放行(因為 server 回的 creator_id 與 viewer 不同時不洩漏)
      });
    },
  });

  const { data: myVotes } = useQuery({
    queryKey: ["my-votes", round.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("votes").select("round_entry_id").eq("round_id", round.id).eq("voter_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((v) => v.round_entry_id));
    },
  });

  const isSubmissionOpen = round.status === "submission_open";
  const isVoting = round.status === "voting_anonymous" || round.status === "voting_public";
  const isAnonymous = round.status === "voting_anonymous";
  const showResults = round.status === "round_results_published" || round.status === "completed";

  const vote = useMutation({
    mutationFn: async (entry: Entry) => {
      if (!user) throw new Error("請先登入");
      if (myVotes && myVotes.size >= round.max_votes_per_user && !myVotes.has(entry.id)) {
        throw new Error(`已達投票上限 (${round.max_votes_per_user})`);
      }
      if (myVotes?.has(entry.id)) {
        const { error } = await supabase.from("votes").delete().eq("round_id", round.id).eq("voter_id", user.id).eq("round_entry_id", entry.id);
        if (error) throw error;
        return "removed";
      }
      const { error } = await supabase.from("votes").insert({
        round_id: round.id,
        round_entry_id: entry.id,
        competition_id: competitionId,
        voter_id: user.id,
        visibility_mode: round.voter_visibility_mode,
      });
      if (error) throw error;
      return "added";
    },
    onSuccess: (mode) => {
      toast.success(mode === "added" ? "投票完成" : "已取消投票");
      qc.invalidateQueries({ queryKey: ["my-votes", round.id] });
      qc.invalidateQueries({ queryKey: ["round-entries", round.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "投票失敗"),
  });

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-widest text-ember">第 {round.round_number} 輪</span>
          <h3 className="font-display text-lg text-cream">{round.title}</h3>
        </div>
        <StatusBadge variant={isVoting ? "voting" : showResults ? "ended" : "scheduled"} label={round.status} />
      </div>
      {round.description && <p className="mt-2 text-sm text-muted-foreground">{round.description}</p>}
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>投稿:{round.submission_start_at?.slice(0, 16) ?? "—"} → {round.submission_end_at?.slice(0, 16) ?? "—"}</div>
        <div>投票:{round.voting_start_at?.slice(0, 16) ?? "—"} → {round.voting_end_at?.slice(0, 16) ?? "—"}</div>
      </div>

      {isSubmissionOpen && <RoundSubmitButton roundId={round.id} competitionId={competitionId} />}

      {entries && entries.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {entries.map((entry, idx) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={idx}
              anonymous={isAnonymous}
              voted={myVotes?.has(entry.id) ?? false}
              canVote={!!user && isVoting}
              showCount={round.vote_count_visibility === "live_count" || showResults}
              onVote={() => vote.mutate(entry)}
              pending={vote.isPending}
            />
          ))}
        </ul>
      )}
      {entries && entries.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">尚無已核可的投稿</p>
      )}
    </li>
  );
}

function EntryCard({ entry, index, anonymous, voted, canVote, showCount, onVote, pending }: {
  entry: Entry; index: number; anonymous: boolean; voted: boolean; canVote: boolean; showCount: boolean; onVote: () => void; pending: boolean;
}) {
  const isAnon = anonymous && !entry.creator_username;
  const displayName = isAnon
    ? entry.anonymous_code ?? `匿名 #${String(index + 1).padStart(2, "0")}`
    : entry.creator_display_name ?? entry.creator_username ?? "未知創作者";

  return (
    <li className={`rounded-xl border border-border bg-stage p-3 ${!isAnon && entry.creator_username ? "reveal-glow" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-cream">{entry.track_title}</div>
          <div key={isAnon ? "anon" : "real"} className={`mt-0.5 flex items-center gap-1 text-xs ${isAnon ? "text-muted-foreground" : "text-ember reveal-in"}`}>
            {isAnon ? <EyeOff className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
            {entry.creator_username ? (
              <Link to="/u/$username" params={{ username: entry.creator_username }} className="hover:underline">{displayName}</Link>
            ) : (
              <span>{displayName}</span>
            )}
          </div>
        </div>
        {entry.rank && <span className="rounded-full bg-ember/10 px-2 py-0.5 text-xs text-ember">#{entry.rank}</span>}
      </div>

      {entry.track_embed_url && <div className="mt-3"><MediaEmbed url={entry.track_embed_url} title={entry.track_title} /></div>}

      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" variant={voted ? "default" : "outline"} disabled={!canVote || pending} onClick={onVote} className={voted ? "bg-gradient-ember text-primary-foreground" : ""}>
          <Heart className={`mr-1 h-3.5 w-3.5 ${voted ? "fill-current" : ""}`} />
          {voted ? "已投" : "投票"}
        </Button>
        {showCount && <span className="text-xs text-muted-foreground">{entry.public_vote_count} 票</span>}
      </div>
    </li>
  );
}

function RoundSubmitButton({ roundId, competitionId }: { roundId: string; competitionId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: tracks } = useQuery({
    queryKey: ["my-tracks-for-round", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("id,title,source_type")
        .eq("creator_id", user!.id).eq("status", "published").limit(50);
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !selected) throw new Error("請選擇作品");
      const code = `A${Math.random().toString(36).slice(2, 5).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const { error } = await supabase.from("round_entries").insert({
        round_id: roundId,
        competition_id: competitionId,
        track_id: selected,
        creator_id: user.id,
        anonymous_code: code,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已投稿,等待主辦人核可");
      setOpen(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["round-entries", roundId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "投稿失敗"),
  });

  if (!user) {
    return <Button asChild className="mt-3 bg-gradient-ember text-primary-foreground"><Link to="/auth">登入後投稿本輪</Link></Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-3 bg-gradient-ember text-primary-foreground">投稿到本輪</Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader><DialogTitle className="text-cream">選擇作品</DialogTitle></DialogHeader>
        {tracks && tracks.length > 0 ? (
          <ul className="max-h-80 space-y-2 overflow-auto">
            {tracks.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setSelected(t.id)} className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${selected === t.id ? "border-ember bg-ember/10 text-ember" : "border-border text-cream hover:border-ember/40"}`}>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.source_type}</div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm">
            <p className="text-muted-foreground">沒有可投稿的作品</p>
            <Button asChild className="mt-3 bg-gradient-ember text-primary-foreground"><Link to="/tracks/new">先建立作品</Link></Button>
          </div>
        )}
        <Button onClick={() => submit.mutate()} disabled={!selected || submit.isPending} className="w-full bg-gradient-ember text-primary-foreground">
          {submit.isPending ? "送出中..." : "確認投稿"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
