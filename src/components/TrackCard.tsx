import { Link } from "@tanstack/react-router";
import { Music2, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { MediaEmbed } from "@/components/MediaEmbed";
import { VerificationBadge } from "@/components/VerificationBadge";

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
  const [playing, setPlaying] = useState(false);

  return (
    <div className="group hover-rise overflow-hidden rounded-xl border border-border bg-card">
      <Link
        to="/tracks/$slug"
        params={{ slug: track.slug }}
        className="flex gap-3 p-3"
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
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />{sourceLabel[track.source_type]}</span>
            <VerificationBadge status={track.verification_status} />
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-border bg-stage px-3 py-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying((p) => !p); }}
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-ember px-3 py-1.5 text-xs text-primary-foreground"
        >
          <Play className="h-3 w-3" />
          {playing ? "收合" : "播放"}
        </button>
        {track.source_url && (
          <a
            href={track.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-ember"
          >
            <ExternalLink className="h-3 w-3" /> 原始平台
          </a>
        )}
      </div>
      {playing && (
        <div className="border-t border-border bg-card p-3">
          <MediaEmbed url={track.source_url} audioUrl={track.embed_url ?? track.audio_file_url} coverUrl={track.cover_url} title={track.title} />
        </div>
      )}
    </div>
  );
}
