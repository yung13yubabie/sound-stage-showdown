import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { toMediaEmbed } from "@/lib/url-validator";

/**
 * 站內音樂播放。
 * - YouTube / SoundCloud:用官方 iframe 內嵌播放
 * - Suno / Udio:平台禁止 iframe (X-Frame-Options),所以改用直接 <audio>
 *   播放從 og:audio 抓到的 mp3 URL (audioUrl)。沒有 audioUrl 才回退外連。
 */
export function MediaEmbed({
  url,
  audioUrl,
  coverUrl,
  title = "音樂作品",
}: {
  url: string;
  audioUrl?: string | null;
  coverUrl?: string | null;
  title?: string;
}) {
  const [active, setActive] = useState(false);
  const embed = toMediaEmbed(url);

  // Suno / Udio:優先 inline audio
  const inlineAudio =
    audioUrl && /^https:\/\//.test(audioUrl) && (embed?.kind === "suno" || embed?.kind === "udio")
      ? audioUrl
      : null;

  if (inlineAudio) {
    return (
      <div className="rounded-lg border border-border bg-stage p-4">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={title}
            loading="lazy"
            className="mb-3 h-32 w-32 rounded object-cover ring-1 ring-border"
          />
        )}
        <audio src={inlineAudio} controls preload="none" className="w-full">
          您的瀏覽器不支援音訊播放。
        </audio>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-ember"
        >
          <ExternalLink className="h-3 w-3" /> 原始平台頁面
        </a>
      </div>
    );
  }

  if (!embed) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
        不支援的連結
      </div>
    );
  }

  if (embed.kind === "link" || embed.kind === "suno" || embed.kind === "udio") {
    // Suno/Udio 沒有可用 embed 且沒有 inline audio → 提供外連 + 提示
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-stage p-4 text-sm">
        <span className="text-xs uppercase tracking-widest text-ember">
          {embed.kind === "link" ? "外部連結" : `${embed.kind} 平台`}
        </span>
        <p className="text-muted-foreground">
          這首作品目前無法在站內播放(來源平台未提供可內嵌音檔)。重新貼一次連結讓系統再抓一次,或直接到原始頁面收聽。
        </p>
        <a
          href={embed.kind === "link" ? embed.href : url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-cream hover:border-ember"
        >
          <ExternalLink className="h-4 w-4" /> 開啟原連結
        </a>
      </div>
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
