import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrackCard } from "@/components/TrackCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "我的後台 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

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
      const { data, error } = await supabase.from("event_submissions").select("*, events(title, slug)").eq("creator_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">我的後台</h1>

      <Tabs defaultValue="tracks" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="tracks">我的作品</TabsTrigger>
          <TabsTrigger value="submissions">投稿紀錄</TabsTrigger>
          <TabsTrigger value="hosting">舉辦紀錄</TabsTrigger>
          <TabsTrigger value="votes">投票紀錄</TabsTrigger>
          <TabsTrigger value="favorites">收藏</TabsTrigger>
        </TabsList>
        <TabsContent value="tracks" className="mt-6">
          {tracks && tracks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">{tracks.map((t) => <TrackCard key={t.id} track={t} />)}</div>
          ) : <Empty>還沒有作品。</Empty>}
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          {submissions && submissions.length > 0 ? (
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li key={s.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex justify-between"><span className="text-cream">{(s.events as { title: string } | null)?.title ?? "—"}</span><span className="text-xs text-ember">{s.status}</span></div>
                </li>
              ))}
            </ul>
          ) : <Empty>沒有投稿紀錄。</Empty>}
        </TabsContent>
        <TabsContent value="hosting" className="mt-6"><Empty>還沒舉辦過活動。</Empty></TabsContent>
        <TabsContent value="votes" className="mt-6"><Empty>還沒投過票。</Empty></TabsContent>
        <TabsContent value="favorites" className="mt-6"><Empty>沒有收藏。</Empty></TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{children}</p>;
}
