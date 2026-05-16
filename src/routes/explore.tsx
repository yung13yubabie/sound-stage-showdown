import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrackCard } from "@/components/TrackCard";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "探索作品 | 聲擂 SoundArena" },
      { name: "description", content: "探索創作者最新作品。" },
    ],
    links: [{ rel: "canonical", href: "/explore" }],
  }),
  component: Explore,
});

function Explore() {
  const { data } = useQuery({
    queryKey: ["explore-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-cream md:text-5xl">探索</h1>
      <p className="mt-2 text-muted-foreground">最新發布的作品</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((t) => <TrackCard key={t.id} track={t} />) ?? null}
        {data && data.length === 0 && <p className="col-span-full p-10 text-center text-sm text-muted-foreground">還沒有公開作品</p>}
      </div>
    </div>
  );
}
