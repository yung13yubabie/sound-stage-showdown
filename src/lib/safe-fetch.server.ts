/**
 * SSRF-hardened outbound fetch for server functions.
 * - manual redirects, hostname re-validated each hop
 * - blocks private IP literals (loopback / RFC1918 / link-local / IPv6 private)
 * - timeout + max response size
 * - in-memory best-effort rate limiter (per key)
 *
 * Note: Runs on Cloudflare Workers; DNS resolution to check post-CNAME IPs
 * is not available. We rely on hostname whitelisting + IP-literal blocking.
 */

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 300_000;

const PRIVATE_IPV4 =
  /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|224\.|240\.|255\.255\.255\.255)/;

function isBlockedIpLiteral(host: string): boolean {
  // Strip IPv6 brackets
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost") return true;
  if (PRIVATE_IPV4.test(h)) return true;
  // IPv6 loopback / unique-local / link-local
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  return false;
}

export type SafeFetchOptions = {
  allowedHosts: Set<string>;
  timeoutMs?: number;
  maxBytes?: number;
  rateLimitKey?: string;
  headers?: Record<string, string>;
};

// per-isolate best-effort rate limit (10 req / 10 min)
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    rateBuckets.set(key, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}

export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions): Promise<string> {
  const {
    allowedHosts,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    rateLimitKey,
    headers = {},
  } = opts;

  if (rateLimitKey && !checkRateLimit(rateLimitKey)) {
    throw new Error("外部抓取太頻繁,請稍後再試");
  }

  let current: URL;
  try { current = new URL(rawUrl); } catch { return ""; }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (current.protocol !== "https:") return "";
      const host = current.hostname.toLowerCase();
      if (isBlockedIpLiteral(host)) return "";
      if (!allowedHosts.has(host)) return "";

      const res = await fetch(current.toString(), {
        method: "GET",
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; SoundArenaBot/1.0)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
          ...headers,
        },
      });

      // Handle redirect manually so we can revalidate the next host
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return "";
        try {
          current = new URL(loc, current);
        } catch { return ""; }
        continue;
      }

      if (!res.ok || !res.body) return "";

      // Read up to maxBytes
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const take = Math.min(value.byteLength, maxBytes - total);
          chunks.push(value.subarray(0, take));
          total += take;
        }
      }
      try { await reader.cancel(); } catch { /* ignore */ }

      const buf = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    }
    return "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}
