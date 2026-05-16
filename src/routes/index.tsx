import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio, Trophy, Mic2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";
import { CompetitionCard } from "@/components/CompetitionCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "聲擂 SoundArena — 音樂活動・線上比賽・創作者舞台" },
      { name: "description", content: "深夜電台般的音樂創作者舞台。參加共聽會、歌曲比賽、擂台夜,投稿你的 YouTube、Suno、Udio、SoundCloud 作品。" },
      { property: "og:title", content: "聲擂 SoundArena" },
      { property: "og:description", content: "音樂交流・活動・多輪比賽平台" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("status", ["scheduled", "warmup", "live"])
        .order("starts_at", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: competitions } = useQuery({
    queryKey: ["home-competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .in("status", ["warmup", "active"])
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-stage" />
        <div className="absolute inset-0 bg-spotlight" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs uppercase tracking-widest text-ember">
              <span className="h-1.5 w-1.5 rounded-full bg-ember live-dot" /> ON AIR
            </span>
            <h1 className="mt-6 font-display text-5xl leading-tight text-cream md:text-7xl">
              深夜的舞台<br />
              <span className="text-shimmer">為你的作品點燈</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              聲擂 SoundArena 是音樂創作者的線上電台:共聽會、歌曲比賽、擂台夜、決賽揭榜直播。投稿你的 YouTube、Suno、Udio、SoundCloud 作品,讓更多人聽見。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-ember text-primary-foreground shadow-ember hover:opacity-90">
                <Link to="/events"><Radio className="mr-2 h-4 w-4" />瀏覽活動</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-ember/40 text-cream hover:bg-ember/10">
                <Link to="/competitions"><Trophy className="mr-2 h-4 w-4" />進入比賽擂台</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 即將開始 / 直播中 */}
      <Section title="活動節目單" subtitle="預熱中・直播中・即將開始" linkTo="/events" linkLabel="所有活動">
        {events && events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        ) : <Empty icon={Radio} text="目前沒有進行中的活動" />}
      </Section>

      {/* 比賽 */}
      <Section title="正在進行的比賽" subtitle="預熱・投稿・投票" linkTo="/competitions" linkLabel="所有比賽">
        {competitions && competitions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {competitions.map((c) => <CompetitionCard key={c.id} competition={c} />)}
          </div>
        ) : <Empty icon={Trophy} text="目前沒有進行中的比賽" />}
      </Section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-stage">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-ember" />
          <h2 className="mt-4 font-display text-3xl text-cream md:text-4xl">把你的作品送上擂台</h2>
          <p className="mt-3 text-muted-foreground">支援 YouTube、Suno、Udio、SoundCloud,或直接上傳音檔。</p>
          <Button asChild size="lg" className="mt-6 bg-gradient-ember text-primary-foreground shadow-ember">
            <Link to="/tracks/new"><Mic2 className="mr-2 h-4 w-4" />建立作品</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Section({ title, subtitle, children, linkTo, linkLabel }: {
  title: string; subtitle?: string; children: React.ReactNode; linkTo?: string; linkLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-cream md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-1 text-sm text-ember hover:underline">
            {linkLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Radio; text: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
