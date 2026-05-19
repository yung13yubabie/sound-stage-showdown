import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User as UserIcon, ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Countdown } from "@/components/Countdown";
import { StatusBadge } from "@/components/StatusBadge";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { Button } from "@/components/ui/button";
import { eventTypeMeta } from "@/components/EventCard";
import { EventSubmitButton } from "@/components/EventSubmitButton";

export const Route = createFileRoute("/events/$slug")({
  component: EventDetail,
});

function EventDetail() {
  const { slug } = Route.useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-4xl p-10"><div className="h-64 animate-pulse rounded-xl bg-card" /></div>;
  if (!event) return <div className="mx-auto max-w-4xl p-10 text-center text-muted-foreground">找不到這個活動</div>;

  const meta = eventTypeMeta[event.type];
  const Icon = meta.icon;
  const target = event.enable_warmup && event.warmup_countdown_at ? event.warmup_countdown_at : event.starts_at;

  const statusVariant =
    event.status === "live" ? "live"
    : event.status === "warmup" ? "warmup"
    : event.status === "scheduled" ? "scheduled" : "ended";

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/events" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 所有活動
      </Link>

      <header className="rounded-2xl border border-border bg-card p-6 shadow-stage md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          <StatusBadge variant={statusVariant} />
        </div>
        <h1 className="mt-4 font-display text-4xl text-cream md:text-5xl">{event.title}</h1>
        {event.description && <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{event.description}</p>}

        <div className="mt-6 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{event.starts_at ? new Date(event.starts_at).toLocaleString("zh-TW") : "時間未定"}</div>
          <div className="flex items-center gap-2"><UserIcon className="h-4 w-4" />主辦人</div>
        </div>

        {/* 預熱倒數 */}
        {event.enable_warmup && event.show_warmup_countdown && target && (
          <div className="mt-8 rounded-xl border border-ember/30 bg-stage p-6 text-center">
            <div className="text-sm uppercase tracking-widest text-ember">
              {event.warmup_label ?? "活動即將開始"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{event.warmup_description ?? "準備你的作品,倒數結束後開放投稿。"}</p>
            <div className="mt-6 flex justify-center"><Countdown targetIso={target} size="lg" /></div>
          </div>
        )}
      </header>

      {/* YouTube embed */}
      {event.youtube_url && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl text-cream">直播 / 影片</h2>
          <YouTubeEmbed url={event.youtube_url} title={event.title} />
        </section>
      )}

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-cream">活動公告</h2>
          <p className="mt-2 text-sm text-muted-foreground">主辦人尚未發布公告。</p>
        </div>
        <aside className="space-y-3">
          {event.allow_song_submission && <EventSubmitButton eventId={event.id} />}
          {event.related_competition_id && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/competitions"><Trophy className="mr-2 h-4 w-4" />查看相關比賽</Link>
            </Button>
          )}
          <Button variant="outline" className="w-full">追蹤活動</Button>
          <Button variant="outline" className="w-full">提醒我</Button>
        </aside>
      </section>
    </article>
  );
}
