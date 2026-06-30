import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio, Trophy, Calendar, Gavel, Hourglass, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/host")({
  head: () => ({ meta: [{ title: "主辦人後台 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: HostPage,
});

function HostPage() {
  const { user } = useAuth();

  const { data: events } = useQuery({
    queryKey: ["host-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id,title,slug,status,starts_at")
        .eq("host_id", user!.id).order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comps } = useQuery({
    queryKey: ["host-comps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("id,title,slug,status")
        .eq("host_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingSubs } = useQuery({
    queryKey: ["host-pending-event-subs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_submissions")
        .select("id,status,submitted_at,events!inner(id,title,slug,host_id),tracks(title)")
        .eq("status", "pending")
        .eq("events.host_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingRounds } = useQuery({
    queryKey: ["host-pending-rounds", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_rounds")
        .select("id,title,round_number,status,competitions!inner(slug,host_id,title)")
        .in("status", ["tallying", "voting_public", "voting_anonymous"])
        .eq("competitions.host_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">主辦人後台</h1>
      <p className="mt-2 text-muted-foreground">建立活動、比賽,審核投稿,結算輪次。</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Quick title="建立活動" desc="共聽會 / 擂台夜 / 電台" icon={<Radio />} to="/host/events/new" />
        <Quick title="建立比賽" desc="多輪賽制 + 匿名投票" icon={<Trophy />} to="/host/competitions/new" />
      </div>

      <Tabs defaultValue="events" className="mt-10">
        <TabsList>
          <TabsTrigger value="events"><Calendar className="mr-1 h-4 w-4" />我的活動</TabsTrigger>
          <TabsTrigger value="comps"><Trophy className="mr-1 h-4 w-4" />我的比賽</TabsTrigger>
          <TabsTrigger value="subs">
            <Gavel className="mr-1 h-4 w-4" />待審投稿
            {pendingSubs && pendingSubs.length > 0 && <span className="ml-1.5 rounded-full bg-ember px-1.5 text-[10px] text-primary-foreground">{pendingSubs.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="rounds">
            <Hourglass className="mr-1 h-4 w-4" />待結算
            {pendingRounds && pendingRounds.length > 0 && <span className="ml-1.5 rounded-full bg-ember px-1.5 text-[10px] text-primary-foreground">{pendingRounds.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          {!events?.length ? <Empty>還沒建立活動</Empty> : (
            <ul className="grid gap-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium text-cream">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{e.starts_at?.slice(0, 16) ?? "未排程"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={statusVariant(e.status)} label={e.status} />
                    <Button asChild size="sm" variant="outline"><Link to="/events/$slug" params={{ slug: e.slug }}>查看</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/host/events/$slug/submissions" params={{ slug: e.slug }}>審投稿</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="comps" className="mt-4">
          {!comps?.length ? <Empty>還沒建立比賽</Empty> : (
            <ul className="grid gap-2">
              {comps.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div className="font-medium text-cream">{c.title}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={statusVariant(c.status)} label={c.status} />
                    <Button asChild size="sm" variant="outline"><Link to="/competitions/$slug" params={{ slug: c.slug }}>查看</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/host/competitions/$slug/rounds" params={{ slug: c.slug }}><Pencil className="mr-1 h-3 w-3" />輪次</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/host/competitions/$slug/entries" params={{ slug: c.slug }}>投稿/結算</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="subs" className="mt-4">
          {!pendingSubs?.length ? <Empty>沒有待審投稿</Empty> : (
            <ul className="grid gap-2">
              {pendingSubs.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium text-cream">{s.tracks?.title ?? "(無標題)"}</div>
                    <div className="text-xs text-muted-foreground">活動:{s.events?.title}</div>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link to="/host/events/$slug/submissions" params={{ slug: s.events!.slug }}>前往審核</Link></Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="rounds" className="mt-4">
          {!pendingRounds?.length ? <Empty>沒有待結算輪次</Empty> : (
            <ul className="grid gap-2">
              {pendingRounds.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <div className="font-medium text-cream">第 {r.round_number} 輪 · {r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.competitions?.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="voting" label={r.status} />
                    <Button asChild size="sm" variant="outline"><Link to="/host/competitions/$slug/entries" params={{ slug: r.competitions!.slug }}>結算</Link></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statusVariant(s: string | null): "draft" | "live" | "ended" | "scheduled" | "voting" | "warmup" {
  if (!s) return "draft";
  if (s === "draft") return "draft";
  if (s.includes("live") || s === "in_progress") return "live";
  if (s.includes("ended") || s === "completed") return "ended";
  if (s.includes("voting")) return "voting";
  if (s.includes("warmup")) return "warmup";
  return "scheduled";
}

function Quick({ title, desc, icon, to }: { title: string; desc: string; icon: React.ReactNode; to: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-ember text-primary-foreground shadow-ember">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-cream">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Button asChild size="sm" className="bg-gradient-ember text-primary-foreground"><Link to={to}>開始</Link></Button>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
