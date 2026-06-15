import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { toMediaEmbed } from "@/lib/url-validator";

/**
 * 安全的音樂平台 embed —  YouTube / Suno / Udio / SoundCloud。
 * lazy:點擊後才掛 iframe,避免列表卡死、記憶體洩漏。
 */
export function MediaEmbed({ url, title = "音樂作品" }: { url: string; title?: string }) {
  const [active, setActive] = useState(false);
  const embed = toMediaEmbed(url);

  if (!embed) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
        不支援的連結
      </div>
    );
  }

  if (embed.kind === "link") {
    return (
      <a
        href={embed.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-stage px-3 py-2 text-sm text-cream hover:border-ember"
      >
        <ExternalLink className="h-4 w-4" /> 開啟原連結
      </a>
    );
  }

  const aspect = embed.kind === "soundcloud" ? "aspect-[4/1]" : "aspect-video";

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className={`group relative grid ${aspect} w-full place-items-center overflow-hidden rounded-lg border border-border bg-stage bg-gradient-stage transition-all hover:border-ember`}
        aria-label={`播放 ${title}`}
      >
        <div className="absolute inset-0 bg-spotlight opacity-50 transition-opacity group-hover:opacity-80" />
        <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-ember shadow-ember transition-transform group-hover:scale-110">
          <Play className="h-6 w-6 translate-x-0.5 fill-primary-foreground text-primary-foreground" />
        </div>
        <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {embed.kind} · 點擊播放
        </span>
      </button>
    );
  }

  return (
    <div className={`relative ${aspect} w-full overflow-hidden rounded-lg border border-border`}>
      <iframe
        src={embed.kind === "youtube" ? `${embed.src}?autoplay=1&rel=0` : embed.src}
        title={title}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    </div>
  );
}
