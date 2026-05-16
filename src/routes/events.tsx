import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard, eventTypeMeta } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "音樂活動 — 共聽會・擂台夜・電台節目 | 聲擂 SoundArena" },
      { name: "description", content: "瀏覽聲擂上的所有音樂活動:共聽會、歌曲比賽、擂台夜、決賽揭榜直播、線上電台節目與限時創作挑戰。" },
      { property: "og:title", content: "音樂活動 | 聲擂 SoundArena" },
    ],
    links: [{ rel: "canonical", href: "/events" }],
  }),
  component: EventsPage,
});

function EventsPage() {
  const [filter, setFilter] = useState<EventType | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .neq("status", "draft")
        .order("starts_at", { ascending: true })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((e) => e.type === filter);
  }, [data, filter]);

  const groups = useMemo(() => ({
    live: filtered.filter((e) => e.status === "live"),
    warmup: filtered.filter((e) => e.status === "warmup"),
    upcoming: filtered.filter((e) => e.status === "scheduled"),
    ended: filtered.filter((e) => ["ended", "replay", "archived"].includes(e.status)),
  }), [filtered]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="border-b border-border pb-6">
        <h1 className="font-display text-4xl text-cream md:text-5xl">音樂活動</h1>
        <p className="mt-2 text-muted-foreground">共聽會、歌曲比賽、擂台夜、電台節目與限時挑戰。</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>全部</FilterChip>
        {(Object.entries(eventTypeMeta) as [EventType, typeof eventTypeMeta[EventType]][]).map(([k, m]) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>{m.label}</FilterChip>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : (
        <div className="space-y-10 py-8">
          {groups.live.length > 0 && <Group title="🔴 直播中" events={groups.live} />}
          {groups.warmup.length > 0 && <Group title="預熱中" events={groups.warmup} />}
          {groups.upcoming.length > 0 && <Group title="即將開始" events={groups.upcoming} />}
          {groups.ended.length > 0 && <Group title="已結束 / 回放" events={groups.ended} />}
          {filtered.length === 0 && (
            <div className="grid place-items-center rounded-xl border border-dashed border-border py-20 text-center">
              <Radio className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">目前沒有活動</p>
              <Button className="mt-4 bg-gradient-ember text-primary-foreground" asChild>
                <a href="/host">建立第一場活動</a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, events }: { title: string; events: Database["public"]["Tables"]["events"]["Row"][] }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-xl text-cream">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active ? "border-ember bg-ember/10 text-ember" : "border-border text-muted-foreground hover:text-cream"
      }`}
    >{children}</button>
  );
}
