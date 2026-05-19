import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { validateMusicUrl } from "@/lib/url-validator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z.enum(["live_listening_session", "song_competition", "community_meetup", "battle_night", "final_reveal_live", "radio_show", "challenge"]),
  description: z.string().trim().max(4000).optional(),
  starts_at: z.string().min(1, "請選擇開始時間"),
  ends_at: z.string().optional(),
  enable_warmup: z.boolean(),
  warmup_countdown_at: z.string().optional(),
  warmup_label: z.string().trim().max(40).optional(),
  warmup_description: z.string().trim().max(300).optional(),
  youtube_url: z.string().trim().max(500).optional(),
  allow_song_submission: z.boolean(),
  publish: z.boolean(),
});

const eventTypes: { value: EventType; label: string }[] = [
  { value: "live_listening_session", label: "共聽會 Live Listening" },
  { value: "song_competition", label: "歌曲比賽 Song Competition" },
  { value: "battle_night", label: "擂台夜 Battle Night" },
  { value: "final_reveal_live", label: "決賽揭榜 Final Reveal" },
  { value: "radio_show", label: "電台節目 Radio Show" },
  { value: "community_meetup", label: "社群聚會 Community Meetup" },
  { value: "challenge", label: "限時挑戰 Challenge" },
];

export const Route = createFileRoute("/_authenticated/host/events/new")({
  head: () => ({ meta: [{ title: "建立活動 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: NewEvent,
});

function slugify(s: string) {
  return `${s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Math.random().toString(36).slice(2, 8)}`;
}

function NewEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "live_listening_session" as EventType,
    description: "",
    starts_at: "",
    ends_at: "",
    enable_warmup: false,
    warmup_countdown_at: "",
    warmup_label: "",
    warmup_description: "",
    youtube_url: "",
    allow_song_submission: true,
    publish: true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    let embedUrl: string | null = null;
    if (p.data.youtube_url) {
      const v = validateMusicUrl(p.data.youtube_url);
      if (!v.ok) { toast.error(v.error); return; }
      embedUrl = v.embedUrl ?? null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("events").insert({
        host_id: user!.id,
        title: p.data.title,
        slug: slugify(p.data.title),
        type: p.data.type,
        description: p.data.description || null,
        starts_at: new Date(p.data.starts_at).toISOString(),
        ends_at: p.data.ends_at ? new Date(p.data.ends_at).toISOString() : null,
        status: p.data.publish ? "scheduled" : "draft",
        enable_warmup: p.data.enable_warmup,
        warmup_countdown_at: p.data.enable_warmup && p.data.warmup_countdown_at ? new Date(p.data.warmup_countdown_at).toISOString() : null,
        warmup_label: p.data.warmup_label || null,
        warmup_description: p.data.warmup_description || null,
        youtube_url: p.data.youtube_url || null,
        embed_url: embedUrl,
        allow_song_submission: p.data.allow_song_submission,
      }).select("slug").single();
      if (error) throw error;
      toast.success("活動已建立");
      navigate({ to: "/events/$slug", params: { slug: data.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">建立活動</h1>
      <p className="mt-1 text-muted-foreground">設定基本資訊、開始時間與預熱倒數。</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label>活動名稱 *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} />
        </div>
        <div>
          <Label>活動類型 *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v as EventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {eventTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>活動介紹</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>開始時間 *</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} required />
          </div>
          <div>
            <Label>結束時間</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-stage p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-cream">啟用預熱倒數</Label>
              <p className="text-xs text-muted-foreground">在活動開始前顯示倒數區塊。</p>
            </div>
            <Switch checked={form.enable_warmup} onCheckedChange={(v) => set("enable_warmup", v)} />
          </div>
          {form.enable_warmup && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>倒數目標時間</Label>
                <Input type="datetime-local" value={form.warmup_countdown_at} onChange={(e) => set("warmup_countdown_at", e.target.value)} />
              </div>
              <div>
                <Label>預熱標題</Label>
                <Input value={form.warmup_label} onChange={(e) => set("warmup_label", e.target.value)} maxLength={40} placeholder="今晚 10 點開麥" />
              </div>
              <div>
                <Label>預熱說明</Label>
                <Input value={form.warmup_description} onChange={(e) => set("warmup_description", e.target.value)} maxLength={300} />
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>YouTube 直播 / 影片連結</Label>
          <Input type="url" value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-stage p-4">
          <div>
            <Label className="text-cream">開放投稿作品</Label>
            <p className="text-xs text-muted-foreground">允許創作者把作品投到這個活動。</p>
          </div>
          <Switch checked={form.allow_song_submission} onCheckedChange={(v) => set("allow_song_submission", v)} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-stage p-4">
          <div>
            <Label className="text-cream">立即發布</Label>
            <p className="text-xs text-muted-foreground">關閉則存為草稿,僅你可見。</p>
          </div>
          <Switch checked={form.publish} onCheckedChange={(v) => set("publish", v)} />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-ember text-primary-foreground">
          {loading ? "建立中..." : "建立活動"}
        </Button>
      </form>
    </div>
  );
}
