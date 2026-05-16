import { Link } from "@tanstack/react-router";
import { Music2, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["tracks"]["Row"];

const sourceLabel: Record<Row["source_type"], string> = {
  youtube: "YouTube",
  youtube_live: "YouTube Live",
  suno: "Suno",
  udio: "Udio",
  soundcloud: "SoundCloud",
  upload: "上傳音檔",
  external: "外部連結",
};

export function TrackCard({ track }: { track: Row }) {
  return (
    <Link
      to="/tracks/$slug"
      params={{ slug: track.slug }}
      className="group hover-rise flex gap-3 overflow-hidden rounded-xl border border-border bg-card p-3"
    >
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-stage">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Music2 className="h-6 w-6 text-ember/40" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <h4 className="truncate font-medium text-cream group-hover:text-ember">{track.title}</h4>
          {track.genre && <p className="mt-0.5 text-xs text-muted-foreground">{track.genre}</p>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          {sourceLabel[track.source_type]}
        </div>
      </div>
    </Link>
  );
}
