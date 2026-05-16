import { useState } from "react";
import { Play } from "lucide-react";
import { toYouTubeEmbed } from "@/lib/url-validator";

/**
 * 安全 YouTube embed —  lazy load(點擊後才掛 iframe)避免列表卡死、記憶體洩漏。
 */
export function YouTubeEmbed({ url, title = "YouTube 影片" }: { url: string; title?: string }) {
  const [active, setActive] = useState(false);
  const embed = toYouTubeEmbed(url);

  if (!embed) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
        不支援的影片連結
      </div>
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="group relative grid aspect-video w-full place-items-center overflow-hidden rounded-lg border border-border bg-stage bg-gradient-stage transition-all hover:border-ember"
        aria-label={`播放 ${title}`}
      >
        <div className="absolute inset-0 bg-spotlight opacity-50 transition-opacity group-hover:opacity-80" />
        <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-ember shadow-ember transition-transform group-hover:scale-110">
          <Play className="h-7 w-7 translate-x-0.5 fill-primary-foreground text-primary-foreground" />
        </div>
        <span className="absolute bottom-3 left-3 text-xs uppercase tracking-widest text-muted-foreground">
          點擊播放
        </span>
      </button>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
      <iframe
        src={`${embed}?autoplay=1&rel=0`}
        title={title}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
