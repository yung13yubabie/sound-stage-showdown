import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackCard } from "@/components/TrackCard";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, ListChecks, Gavel, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "我的後台 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  async function deleteTrack(id: string, title: string) {
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) { toast.error(`刪除失敗:${error.message}`); return; }
    toast.success(`已刪除「${title}」`);
    qc.invalidateQueries({ queryKey: ["my-tracks"] });
  }


  const { data: tracks } = useQuery({
    queryKey: ["my-tracks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("creator_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["my-submissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_submissions")
        .select("id,status,submitted_at,events(title,slug)")
        .eq("creator_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{ id: string; status: string; submitted_at: string; events: { title: string; slug: string } | null }>;
    },
  });

  const { data: roundSubs } = useQuery({
    queryKey: ["my-round-entries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("round_entries")
        .select("id,status,rank,public_vote_count,created_at,competitions(title,slug),competition_rounds:round_id(title,round_number)")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        id: string; status: string; rank: number | null; public_vote_count: number; created_at: string;
        competitions: { title: string; slug: string } | null;
        competition_rounds: { title: string; round_number: number } | null;
      }>;
    },
  });

  const { data: hostedEvents } = useQuery({
    queryKey: ["my-hosted-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id,title,slug,status,starts_at").eq("host_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: hostedComps } = useQuery({
    queryKey: ["my-hosted-comps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("id,title,slug,status").eq("host_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: votes } = useQuery({
    queryKey: ["my-votes-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("id,created_at,competitions(title,slug),competition_rounds:round_id(title,round_number)")
        .eq("voter_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Array<{
        id: string; created_at: string;
        competitions: { title: string; slug: string } | null;
        competition_rounds: { title: string; round_number: number } | null;
      }>;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-cream md:text-4xl">我的後台</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/tracks/new">＋ 新作品</Link></Button>
          <Button asChild className="bg-gradient-ember text-primary-foreground"><Link to="/host">主辦中心</Link></Button>
        </div>
      </div>

      <Tabs defaultValue="tracks" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="tracks">我的作品</TabsTrigger>
          <TabsTrigger value="submissions">投稿紀錄</TabsTrigger>
          <TabsTrigger value="hosting">舉辦紀錄</TabsTrigger>
          <TabsTrigger value="votes">投票紀錄</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="mt-6">
          {tracks && tracks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">{tracks.map((t) => <TrackCard key={t.id} track={t} />)}</div>
          ) : <Empty>還沒有作品。<Link to="/tracks/new" className="ml-1 text-ember hover:underline">建立第一首</Link></Empty>}
        </TabsContent>

        <TabsContent value="submissions" className="mt-6 space-y-6">
          <Section title="活動投稿" icon={<Calendar className="h-4 w-4" />}>
            {submissions && submissions.length > 0 ? (
              <ul className="space-y-2">
                {submissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                    {s.events ? (
                      <Link to="/events/$slug" params={{ slug: s.events.slug }} className="truncate text-cream hover:text-ember">{s.events.title}</Link>
                    ) : <span className="text-muted-foreground">—</span>}
                    <span className="text-xs text-ember">{s.status}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>沒有活動投稿。</Empty>}
          </Section>

          <Section title="比賽輪次投稿" icon={<Trophy className="h-4 w-4" />}>
            {roundSubs && roundSubs.length > 0 ? (
              <ul className="space-y-2">
                {roundSubs.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                    <div className="min-w-0">
                      {s.competitions ? (
                        <Link to="/competitions/$slug" params={{ slug: s.competitions.slug }} className="text-cream hover:text-ember">{s.competitions.title}</Link>
                      ) : <span className="text-muted-foreground">—</span>}
                      <span className="ml-2 text-xs text-muted-foreground">第 {s.competition_rounds?.round_number ?? "?"} 輪 · {s.competition_rounds?.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {s.rank && <span className="rounded-full bg-ember/10 px-2 py-0.5 text-ember">#{s.rank}</span>}
                      <span className="text-muted-foreground">{s.public_vote_count} 票</span>
                      <span className="text-ember">{s.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty>沒有比賽投稿。</Empty>}
          </Section>
        </TabsContent>

        <TabsContent value="hosting" className="mt-6 space-y-6">
          <Section title="我舉辦的活動" icon={<Calendar className="h-4 w-4" />}>
            {hostedEvents && hostedEvents.length > 0 ? (
              <ul className="space-y-2">
                {hostedEvents.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                    <div>
                      <Link to="/events/$slug" params={{ slug: e.slug }} className="text-cream hover:text-ember">{e.title}</Link>
                      <span className="ml-2 text-xs text-muted-foreground">{e.status}</span>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/host/events/$slug/submissions" params={{ slug: e.slug }}><ListChecks className="mr-1 h-3.5 w-3.5" />審核投稿</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : <Empty>還沒有舉辦活動。<Link to="/host/events/new" className="ml-1 text-ember hover:underline">建立活動</Link></Empty>}
          </Section>

          <Section title="我舉辦的比賽" icon={<Trophy className="h-4 w-4" />}>
            {hostedComps && hostedComps.length > 0 ? (
              <ul className="space-y-2">
                {hostedComps.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                    <div>
                      <Link to="/competitions/$slug" params={{ slug: c.slug }} className="text-cream hover:text-ember">{c.title}</Link>
                      <span className="ml-2 text-xs text-muted-foreground">{c.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/host/competitions/$slug/rounds" params={{ slug: c.slug }}>輪次設定</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/host/competitions/$slug/entries" params={{ slug: c.slug }}><Gavel className="mr-1 h-3.5 w-3.5" />審核 / 結算</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty>還沒有舉辦比賽。<Link to="/host/competitions/new" className="ml-1 text-ember hover:underline">建立比賽</Link></Empty>}
          </Section>
        </TabsContent>

        <TabsContent value="votes" className="mt-6">
          {votes && votes.length > 0 ? (
            <ul className="space-y-2">
              {votes.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-4">
                  <div className="min-w-0">
                    {v.competitions ? (
                      <Link to="/competitions/$slug" params={{ slug: v.competitions.slug }} className="text-cream hover:text-ember">{v.competitions.title}</Link>
                    ) : <span className="text-muted-foreground">—</span>}
                    <span className="ml-2 text-xs text-muted-foreground">第 {v.competition_rounds?.round_number ?? "?"} 輪 · {v.competition_rounds?.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("zh-TW")}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>還沒投過票。</Empty>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-cream">{icon}{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{children}</p>;
}


