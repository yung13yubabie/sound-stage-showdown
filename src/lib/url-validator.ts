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
