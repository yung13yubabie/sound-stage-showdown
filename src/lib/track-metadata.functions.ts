import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * 從 SUNO / Udio / YouTube / SoundCloud 的公開頁面抓 Open Graph 元數據,
 * 用來自動帶入作品標題、封面、簡介。
 *
 * 注意:
 * - 走伺服端 fetch，避開 CORS,也不暴露 API key (純公開 HTML 抓取)。
 * - 對外請求加 8 秒 timeout、限制 hostname 白名單,避免 SSRF。
 * - 失敗就回空物件,不丟錯,讓表單可繼續手動填寫。
 */

const ALLOWED_HOSTS = new Set([
  "suno.com",
  "www.suno.com",
  "udio.com",
  "www.udio.com",
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
  "on.soundcloud.com",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const inputSchema = z.object({ url: z.string().url().max(500) });

export type TrackMetadata = {
  ok: boolean;
  title?: string;
  description?: string;
  cover_url?: string;
  audio_url?: string;
  genre?: string;
  lyrics?: string;
  published_at?: string;
  source?: "suno" | "udio" | "soundcloud" | "youtube";
};

function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const j = JSON.parse(m[1].trim());
      if (Array.isArray(j)) out.push(...j);
      else if (j && typeof j === "object") out.push(j);
    } catch { /* ignore */ }
  }
  return out;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}



function metaFromHtml(html: string, prop: string): string | undefined {
  // og:xxx / twitter:xxx / name=description
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return decodeHtmlEntities(m[1]);
  // 反向順序 content 在前
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtmlEntities(m2[1]) : undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export const fetchTrackMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TrackMetadata> => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { ok: false };
    }
    if (parsed.protocol !== "https:") return { ok: false };
    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return { ok: false };

    const host = parsed.hostname.toLowerCase();
    const source: TrackMetadata["source"] = host.endsWith("suno.com")
      ? "suno"
      : host.endsWith("udio.com")
        ? "udio"
        : host.endsWith("soundcloud.com")
          ? "soundcloud"
          : "youtube";

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let html = "";
    try {
      const res = await fetch(parsed.toString(), {
        method: "GET",
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; SoundArenaBot/1.0; +https://sound-stage-showdown.lovable.app)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
      });
      if (!res.ok) return { ok: false, source };
      html = (await res.text()).slice(0, 250_000); // 安全上限
    } catch {
      return { ok: false, source };
    } finally {
      clearTimeout(timer);
    }

    const rawTitle =
      metaFromHtml(html, "og:title") ??
      metaFromHtml(html, "twitter:title") ??
      undefined;
    const cover =
      metaFromHtml(html, "og:image") ??
      metaFromHtml(html, "twitter:image") ??
      undefined;
    const desc =
      metaFromHtml(html, "og:description") ??
      metaFromHtml(html, "twitter:description") ??
      metaFromHtml(html, "description") ??
      undefined;
    const audio =
      metaFromHtml(html, "og:audio:secure_url") ??
      metaFromHtml(html, "og:audio") ??
      metaFromHtml(html, "twitter:player:stream") ??
      undefined;

    // 去掉平台尾巴 (例如 "Song Title | Suno")
    let title = rawTitle?.trim();
    if (title) {
      title = title.replace(/\s*[|\-–]\s*(Suno|Udio|SoundCloud|YouTube).*$/i, "").trim();
      title = title.slice(0, 120);
    }

    // JSON-LD MusicRecording → 抓曲風 / 歌詞 / 發佈時間
    const ldList = extractJsonLd(html);
    let genre: string | undefined;
    let lyrics: string | undefined;
    let publishedAt: string | undefined;
    for (const ld of ldList) {
      const t = (ld as { "@type"?: string | string[] })["@type"];
      const types = Array.isArray(t) ? t : t ? [t] : [];
      if (types.some((x) => /MusicRecording|MusicComposition|VideoObject|AudioObject/i.test(x))) {
        const g = (ld as Record<string, unknown>).genre;
        genre ??= firstString(g, Array.isArray(g) ? g[0] : undefined);
        const ly = (ld as Record<string, unknown>).lyrics;
        if (ly && typeof ly === "object") {
          lyrics ??= firstString((ly as Record<string, unknown>).text);
        } else {
          lyrics ??= firstString(ly);
        }
        publishedAt ??= firstString(
          (ld as Record<string, unknown>).datePublished,
          (ld as Record<string, unknown>).uploadDate,
          (ld as Record<string, unknown>).dateCreated,
        );
      }
    }

    return {
      ok: true,
      source,
      title,
      cover_url: cover && /^https:\/\//.test(cover) ? cover : undefined,
      description: desc?.slice(0, 1000),
      audio_url: audio && /^https:\/\//.test(audio) ? audio : undefined,
      genre: genre?.slice(0, 60),
      lyrics: lyrics?.slice(0, 8000),
      published_at: publishedAt,
    };
  });

