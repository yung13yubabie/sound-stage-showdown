import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { safeFetchText } from "./safe-fetch.server";

/**
 * Track ownership verification via "claim code":
 * - User asks for a code (request_track_verification RPC)
 * - User pastes it somewhere on the source URL page (description, title, comment, bio)
 * - Server re-fetches the page, hands raw HTML to confirm_track_verification RPC,
 *   which does the substring match server-side. We never trust the client's "I found it" claim.
 */

const ALLOWED_HOSTS = new Set([
  "suno.com", "www.suno.com",
  "udio.com", "www.udio.com",
  "soundcloud.com", "www.soundcloud.com", "m.soundcloud.com", "on.soundcloud.com",
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be",
]);

export const requestTrackVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: code, error } = await context.supabase.rpc("request_track_verification", { _track_id: data.trackId });
    if (error) throw new Error(error.message);
    return { code: code as string };
  });

export const confirmTrackVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Load track via RLS to read source_url
    const { data: track, error: tErr } = await context.supabase
      .from("tracks")
      .select("source_url, creator_id")
      .eq("id", data.trackId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!track) throw new Error("作品不存在");
    if (track.creator_id !== context.userId) throw new Error("非作品擁有者");
    if (!track.source_url) throw new Error("作品沒有來源 URL,無法用站外驗證碼驗證");

    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { /* ignore */ }
    const html = await safeFetchText(track.source_url, {
      allowedHosts: ALLOWED_HOSTS,
      rateLimitKey: `verify:${context.userId}:${ip}`,
    });

    // RPC uses user-scoped supabase (bearer). Server-side substring match happens inside the RPC.
    const { data: status, error: rErr } = await context.supabase.rpc("confirm_track_verification", {
      _track_id: data.trackId,
      _found_text: html,
    });
    if (rErr) throw new Error(rErr.message);
    return { status: status as string, pageFetched: html.length > 0 };
  });
