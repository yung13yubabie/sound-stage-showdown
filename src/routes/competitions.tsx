import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompetitionCard } from "@/components/CompetitionCard";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "音樂比賽 — 多輪擂台・匿名投票 | 聲擂 SoundArena" },
      { name: "description", content: "聲擂的線上音樂比賽:多輪賽制、匿名作品投票、階段揭露,挑戰冠軍寶座。" },
    ],
    links: [{ rel: "canonical", href: "/competitions" }],
  }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["competitions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*").neq("status", "draft").limit(60);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="border-b border-border pb-6">
        <h1 className="font-display text-4xl text-cream md:text-5xl">比賽擂台</h1>
        <p className="mt-2 text-muted-foreground">多輪賽制 · 匿名投票 · 階段揭露</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((c) => <CompetitionCard key={c.id} competition={c} />)}
        </div>
      ) : (
        <div className="my-10 grid place-items-center rounded-xl border border-dashed border-border py-20 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">目前沒有進行中的比賽</p>
        </div>
      )}
    </div>
  );
}
