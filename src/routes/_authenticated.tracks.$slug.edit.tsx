import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TrackSource = Database["public"]["Enums"]["track_source"];
type TrackStatus = Database["public"]["Enums"]["track_status"];

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  source_type: z.enum(["youtube", "youtube_live", "suno", "udio", "soundcloud", "upload", "external"]),
  source_url: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  genre: z.string().trim().max(40).optional(),
  ai_disclosure: z.string().trim().max(200).optional(),
  cover_url: z.string().trim().max(500).optional(),
  lyrics: z.string().trim().max(10000).optional(),
  status: z.enum(["draft", "published", "removed"]),
});

export const Route = createFileRoute("/_authenticated/tracks/$slug/edit")({
  head: () => ({ meta: [{ title: "編輯作品 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: EditTrack,
});

function EditTrack() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<z.infer<typeof schema> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: track, isLoading } = useQuery({
    queryKey: ["edit-track", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (track) {
      setForm({
        title: track.title,
        source_type: track.source_type,
        source_url: track.source_url ?? "",
        description: track.description ?? "",
        genre: track.genre ?? "",
        ai_disclosure: track.ai_disclosure ?? "",
        cover_url: track.cover_url ?? "",
        lyrics: track.lyrics ?? "",
        status: (track.status ?? "published") as TrackStatus,
      });
    }
  }, [track]);

  if (isLoading || !form) return <div className="p-10 text-center text-muted-foreground">載入中...</div>;
  if (!track) return <div className="p-10 text-center text-muted-foreground">找不到作品</div>;
  if (user && track.creator_id !== user.id) {
    return <div className="p-10 text-center text-muted-foreground">沒有編輯權限</div>;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("tracks").update({
        title: parsed.data.title,
        source_type: parsed.data.source_type,
        source_url: parsed.data.source_url || null,
        description: parsed.data.description || null,
        genre: parsed.data.genre || null,
        ai_disclosure: parsed.data.ai_disclosure || null,
        cover_url: parsed.data.cover_url || null,
        lyrics: parsed.data.lyrics || null,
        status: parsed.data.status,
      }).eq("id", track.id);
      if (error) throw error;
      toast.success("已儲存");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 返回後台
      </Link>
      <h1 className="font-display text-3xl text-cream md:text-4xl">編輯作品</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label>標題 *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
        </div>
        <div>
          <Label>狀態</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TrackStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="published">公開</SelectItem>
              <SelectItem value="removed">下架</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>來源類型</Label>
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
          <Label>來源 URL</Label>
          <Input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
        </div>
        <div>
          <Label>封面 URL</Label>
          <Input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
          {form.cover_url && <img src={form.cover_url} alt="cover" className="mt-2 h-24 w-24 rounded object-cover" />}
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
          <Label>歌詞</Label>
          <Textarea value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} rows={8} maxLength={10000} />
        </div>
        <div>
          <Label>AI 揭露</Label>
          <Input value={form.ai_disclosure} onChange={(e) => setForm({ ...form, ai_disclosure: e.target.value })} maxLength={200} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-gradient-ember text-primary-foreground">
          {saving ? "儲存中..." : "儲存"}
        </Button>
      </form>
    </div>
  );
}
