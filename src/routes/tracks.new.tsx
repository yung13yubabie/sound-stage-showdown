import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { validateMusicUrl, detectTrackSource } from "@/lib/url-validator";
import { fetchTrackMetadata } from "@/lib/track-metadata.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TrackSource = Database["public"]["Enums"]["track_source"];

const SOURCE_LABEL: Record<string, string> = {
  youtube: "YouTube",
  youtube_live: "YouTube Live",
  suno: "Suno",
  udio: "Udio",
  soundcloud: "SoundCloud",
};
const labelFor = (s: string) => SOURCE_LABEL[s] ?? s;

function guessTitleFromUrl(u: string): string {
  try {
    const url = new URL(u);
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(last).replace(/[-_]+/g, " ").slice(0, 80);
  } catch {
    return "";
  }
}

const schema = z.object({
  title: z.string().trim().min(1, "標題不可為空").max(120),
  source_type: z.enum(["youtube", "youtube_live", "suno", "udio", "soundcloud", "upload", "external"]),
  source_url: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  genre: z.string().trim().max(40).optional(),
  ai_disclosure: z.string().trim().max(200).optional(),
  cover_url: z.string().trim().max(500).optional(),
});

export const Route = createFileRoute("/tracks/new")({
  head: () => ({
    meta: [{ title: "建立作品 | 聲擂 SoundArena" }, { name: "robots", content: "noindex" }],
  }),
  component: NewTrack,
});

function NewTrack() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fetchMeta = useServerFn(fetchTrackMetadata);
  const [form, setForm] = useState({
    title: "",
    source_type: "youtube" as TrackSource,
    source_url: "",
    description: "",
    genre: "",
    ai_disclosure: "",
    cover_url: "",
    embed_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);


  if (authLoading) return <div className="p-10 text-center">載入中...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-cream">請先登入才能建立作品</p>
        <Button asChild className="mt-4 bg-gradient-ember text-primary-foreground"><a href="/auth">登入</a></Button>
      </div>
    );
  }

  async function autoFillFromUrl(rawUrl: string, detected: TrackSource) {
    setFetching(true);
    try {
      const meta = await fetchMeta({ data: { url: rawUrl } });
      setForm((f) => ({
        ...f,
        source_url: rawUrl,
        source_type: detected,
        title: f.title || meta.title || guessTitleFromUrl(rawUrl),
        description: f.description || meta.description || "",
        cover_url: f.cover_url || meta.cover_url || "",
        embed_url: f.embed_url || meta.audio_url || "",
      }));
      const parts = [meta.title && "標題", meta.cover_url && "封面", meta.audio_url && "可內嵌音檔"].filter(Boolean).join("、");
      if (meta.ok && parts) {
        toast.success(`已從 ${labelFor(detected)} 帶入${parts}`);
      } else {
        toast.success(`已偵測到 ${labelFor(detected)} 連結`);
      }

    } catch {
      // 失敗就退回只填 URL
      setForm((f) => ({
        ...f,
        source_url: rawUrl,
        source_type: detected,
        title: f.title || guessTitleFromUrl(rawUrl),
      }));
    } finally {
      setFetching(false);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.source_url && ["youtube", "youtube_live", "suno", "udio", "soundcloud"].includes(parsed.data.source_type)) {
      const v = validateMusicUrl(parsed.data.source_url);
      if (!v.ok) { toast.error(v.error); return; }
    }
    setLoading(true);
    try {
      const slug = `${parsed.data.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").slice(0, 60)}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from("tracks").insert({
        creator_id: user.id,
        title: parsed.data.title,
        slug,
        source_type: parsed.data.source_type,
        source_url: parsed.data.source_url || null,
        embed_url: form.embed_url || null,
        description: parsed.data.description || null,
        genre: parsed.data.genre || null,
        ai_disclosure: parsed.data.ai_disclosure || null,
        cover_url: parsed.data.cover_url || null,
        status: "published",
      });

      if (error) throw error;
      toast.success("作品已建立");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">建立作品</h1>
      <p className="mt-1 text-muted-foreground">支援 YouTube、Suno、Udio、SoundCloud 連結。貼上連結後會自動帶入標題、封面與簡介。</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label>來源 URL (https://)</Label>
          <Input
            type="url"
            value={form.source_url}
            disabled={fetching}
            onChange={(e) => {
              const next = e.target.value;
              const detected = detectTrackSource(next);
              setForm((f) => ({ ...f, source_url: next, source_type: detected ?? f.source_type }));
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              const detected = detectTrackSource(pasted);
              if (detected) {
                e.preventDefault();
                void autoFillFromUrl(pasted, detected);
              }
            }}
            onBlur={() => {
              // 手動輸入結束也嘗試抓
              const detected = detectTrackSource(form.source_url);
              if (detected && !form.title) void autoFillFromUrl(form.source_url, detected);
            }}
            placeholder="https://www.youtube.com/watch?v=... / https://suno.com/song/... / https://www.udio.com/songs/..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {fetching ? "正在從來源抓取標題與封面..." : "支援 YouTube / Suno / Udio / SoundCloud,貼上連結會自動帶入。"}
          </p>
        </div>

        {form.cover_url && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-stage p-3">
            <img src={form.cover_url} alt="cover" className="h-16 w-16 rounded object-cover" />
            <div className="min-w-0 flex-1 text-xs text-muted-foreground truncate">{form.cover_url}</div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, cover_url: "" }))}>移除</Button>
          </div>
        )}

        <div>
          <Label>標題 *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
        </div>
        <div>
          <Label>來源類型 *</Label>
          <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v as TrackSource })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="youtube_live">YouTube Live</SelectItem>
              <SelectItem value="suno">Suno</SelectItem>
              <SelectItem value="udio">Udio</SelectItem>
              <SelectItem value="soundcloud">SoundCloud</SelectItem>
              <SelectItem value="external">其他外部連結</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>曲風</Label>
          <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} maxLength={40} />
        </div>
        <div>
          <Label>創作說明</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={2000} />
        </div>
        <div>
          <Label>AI 使用揭露</Label>
          <Input value={form.ai_disclosure} onChange={(e) => setForm({ ...form, ai_disclosure: e.target.value })} maxLength={200} placeholder="例:Suno v4 生成 + 後製混音" />
        </div>
        <Button type="submit" disabled={loading || fetching} className="w-full bg-gradient-ember text-primary-foreground">
          {loading ? "建立中..." : "建立作品"}
        </Button>
      </form>
    </div>
  );
}
