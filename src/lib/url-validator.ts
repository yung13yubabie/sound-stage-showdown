/**
 * 安全外部 URL 驗證
 * - 只允許 https
 * - 阻擋 javascript: / data: / file:
 * - 白名單音樂平台
 */

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
  "suno.com",
  "www.suno.com",
  "udio.com",
  "www.udio.com",
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
  "on.soundcloud.com",
]);

const ALLOWED_PROFILE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "instagram.com",
  "www.instagram.com",
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "soundcloud.com",
  "www.soundcloud.com",
]);

export type TrackSource =
  | "youtube"
  | "youtube_live"
  | "suno"
  | "udio"
  | "soundcloud"
  | "external";

export type UrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

export function validateMusicUrl(input: string): UrlValidationResult {
  return validateUrl(input, ALLOWED_HOSTS);
}

export function validateProfileUrl(input: string): UrlValidationResult {
  return validateUrl(input, ALLOWED_PROFILE_HOSTS);
}

export function validateAnyHttpsUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "URL 不可為空" };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "URL 格式錯誤" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "只允許 https:// 開頭的網址" };
  }
  return { ok: true, url };
}

function validateUrl(input: string, hosts: Set<string>): UrlValidationResult {
  const base = validateAnyHttpsUrl(input);
  if (!base.ok) return base;
  if (!hosts.has(base.url.hostname.toLowerCase())) {
    return { ok: false, error: `不支援的網域:${base.url.hostname}` };
  }
  return base;
}

/**
 * 從貼上的 URL 偵測作品來源類型,失敗回 null。
 * 支援 YouTube / YouTube Live / Suno / Udio / SoundCloud。
 */
export function detectTrackSource(input: string): TrackSource | null {
  const v = validateMusicUrl(input);
  if (!v.ok) return null;
  const host = v.url.hostname.toLowerCase();
  const path = v.url.pathname;
  if (host.endsWith("youtu.be") || host.endsWith("youtube.com")) {
    if (path.startsWith("/live/")) return "youtube_live";
    return "youtube";
  }
  if (host.endsWith("suno.com")) return "suno";
  if (host.endsWith("udio.com")) return "udio";
  if (host.endsWith("soundcloud.com")) return "soundcloud";
  return null;
}

/**
 * 把 YouTube URL 轉成 embed URL,失敗則回 null
 */
export function toYouTubeEmbed(input: string): string | null {
  const v = validateMusicUrl(input);
  if (!v.ok) return null;
  const url = v.url;
  let videoId: string | null = null;
  if (url.hostname.includes("youtu.be")) {
    videoId = url.pathname.slice(1).split("/")[0];
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/embed/")) {
    videoId = url.pathname.split("/")[2];
  } else if (url.pathname.startsWith("/live/")) {
    videoId = url.pathname.split("/")[2];
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2];
  }
  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

export type MediaEmbed =
  | { kind: "youtube"; src: string }
  | { kind: "suno"; src: string; trackUrl: string }
  | { kind: "udio"; src: string; trackUrl: string }
  | { kind: "soundcloud"; src: string; trackUrl: string }
  | { kind: "link"; href: string };

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * 把支援的音樂平台 URL 轉成可嵌入物件。失敗回 null。
 * - YouTube → iframe
 * - Suno    → 官方 embed (/embed/{id})
 * - Udio    → 官方 embed (/embed/{id})
 * - SoundCloud → 官方 player widget
 */
export function toMediaEmbed(input: string): MediaEmbed | null {
  const v = validateMusicUrl(input);
  if (!v.ok) return null;
  const url = v.url;
  const host = url.hostname.toLowerCase();

  // YouTube
  const yt = toYouTubeEmbed(input);
  if (yt) return { kind: "youtube", src: yt };

  // Suno: https://suno.com/song/{uuid}
  if (host.endsWith("suno.com")) {
    const m = url.pathname.match(UUID_RE);
    if (m) {
      return {
        kind: "suno",
        src: `https://suno.com/embed/${m[0]}`,
        trackUrl: url.toString(),
      };
    }
    return { kind: "link", href: url.toString() };
  }

  // Udio: https://www.udio.com/songs/{id}
  if (host.endsWith("udio.com")) {
    const seg = url.pathname.split("/").filter(Boolean);
    const idx = seg.findIndex((s) => s === "songs");
    const id = idx >= 0 ? seg[idx + 1] : null;
    if (id && /^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      return {
        kind: "udio",
        src: `https://www.udio.com/embed/songs/${id}`,
        trackUrl: url.toString(),
      };
    }
    return { kind: "link", href: url.toString() };
  }

  // SoundCloud: 用官方 player widget
  if (host.endsWith("soundcloud.com")) {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      url.toString(),
    )}&color=%23ff6b35&auto_play=false&hide_related=true&show_comments=false&show_user=true`;
    return { kind: "soundcloud", src, trackUrl: url.toString() };
  }

  return { kind: "link", href: url.toString() };
}
