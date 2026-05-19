import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  theme: z.string().trim().max(80).optional(),
  description: z.string().trim().max(4000).optional(),
  rules: z.string().trim().max(8000).optional(),
  enable_warmup: z.boolean(),
  warmup_countdown_at: z.string().optional(),
  publish: z.boolean(),
});

export const Route = createFileRoute("/_authenticated/host/competitions/new")({
  head: () => ({ meta: [{ title: "建立比賽 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: NewCompetition,
});

function slugify(s: string) {
  return `${s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}-${Math.random().toString(36).slice(2, 8)}`;
}

function NewCompetition() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    theme: "",
    description: "",
    rules: "",
    enable_warmup: false,
    warmup_countdown_at: "",
    publish: true,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(form);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("competitions").insert({
        host_id: user!.id,
        title: p.data.title,
        slug: slugify(p.data.title),
        theme: p.data.theme || null,
        description: p.data.description || null,
        rules: p.data.rules || null,
        status: p.data.publish ? "warmup" : "draft",
        enable_warmup: p.data.enable_warmup,
        warmup_countdown_at: p.data.enable_warmup && p.data.warmup_countdown_at ? new Date(p.data.warmup_countdown_at).toISOString() : null,
      }).select("slug").single();
      if (error) throw error;
      toast.success("比賽已建立,接著建立輪次");
      navigate({ to: "/host/competitions/$slug/rounds", params: { slug: data.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">建立比賽</h1>
      <p className="mt-1 text-muted-foreground">先填基本資訊,下一步建立各輪賽制。</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label>比賽名稱 *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} />
        </div>
        <div>
          <Label>主題</Label>
          <Input value={form.theme} onChange={(e) => set("theme", e.target.value)} maxLength={80} placeholder="深夜城市 / 失眠頻率..." />
        </div>
        <div>
          <Label>介紹</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
        </div>
        <div>
          <Label>比賽規則</Label>
          <Textarea rows={6} value={form.rules} onChange={(e) => set("rules", e.target.value)} maxLength={8000} placeholder="長度、用途、AI 規範、評分標準..." />
        </div>

        <div className="rounded-xl border border-border bg-stage p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-cream">啟用預熱倒數</Label>
              <p className="text-xs text-muted-foreground">在報名前展示倒數,炒熱氣氛。</p>
            </div>
            <Switch checked={form.enable_warmup} onCheckedChange={(v) => set("enable_warmup", v)} />
          </div>
          {form.enable_warmup && (
            <div className="mt-4">
              <Label>倒數目標時間</Label>
              <Input type="datetime-local" value={form.warmup_countdown_at} onChange={(e) => set("warmup_countdown_at", e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-stage p-4">
          <div>
            <Label className="text-cream">立即發布</Label>
            <p className="text-xs text-muted-foreground">關閉則存為草稿。</p>
          </div>
          <Switch checked={form.publish} onCheckedChange={(v) => set("publish", v)} />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-gradient-ember text-primary-foreground">
          {loading ? "建立中..." : "建立並設定輪次"}
        </Button>
      </form>
    </div>
  );
}
