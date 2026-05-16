import { Link } from "@tanstack/react-router";
import { Calendar, Radio, Trophy, Users, Mic2, Sparkles, Headphones, Swords } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const typeMeta: Record<EventRow["type"], { label: string; icon: typeof Calendar }> = {
  live_listening_session: { label: "共聽會", icon: Headphones },
  song_competition: { label: "歌曲比賽", icon: Trophy },
  community_meetup: { label: "社群聚會", icon: Users },
  battle_night: { label: "擂台夜", icon: Swords },
  final_reveal_live: { label: "決賽揭榜", icon: Sparkles },
  radio_show: { label: "電台節目", icon: Radio },
  challenge: { label: "限時挑戰", icon: Mic2 },
};

export function EventCard({ event }: { event: EventRow }) {
  const meta = typeMeta[event.type];
  const Icon = meta.icon;
  const countdownTarget =
    event.status === "warmup" || event.status === "scheduled"
      ? event.enable_warmup && event.warmup_countdown_at
        ? event.warmup_countdown_at
        : event.starts_at
      : null;

  const statusVariant =
    event.status === "live" ? "live"
    : event.status === "warmup" ? "warmup"
    : event.status === "scheduled" ? "scheduled"
    : event.status === "ended" || event.status === "replay" || event.status === "archived" ? "ended"
    : "draft";

  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="group hover-rise flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-stage"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-stage">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.title}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-spotlight">
            <Icon className="h-12 w-12 text-ember/40" />
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-0.5 text-[11px] backdrop-blur">
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          <StatusBadge variant={statusVariant} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-lg leading-tight text-cream line-clamp-2">{event.title}</h3>

        {countdownTarget && (
          <div className="rounded-lg border border-border bg-stage px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">倒數</div>
            <Countdown targetIso={countdownTarget} size="sm" />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {event.starts_at ? new Date(event.starts_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "時間未定"}
          </span>
          {event.allow_song_submission && (
            <span className="rounded-full border border-ember/40 px-2 py-0.5 text-[10px] text-ember">可投稿</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { typeMeta as eventTypeMeta };
