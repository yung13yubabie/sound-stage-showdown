import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/host/events/$slug/submissions")({
  head: () => ({ meta: [{ title: "審核投稿 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: ReviewSubmissions,
});

function ReviewSubmissions() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ["host-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id,title,host_id").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["event-subs-review", event?.id],
    enabled: !!event?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_submissions")
        .select("id,status,submitted_at,creator_id,track_id,tracks(title,slug,source_type),profiles:creator_id(username,display_name,avatar_url)" as string)
        .eq("event_id", event!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        id: string; status: string; submitted_at: string; creator_id: string; track_id: string;
        tracks: { title: string; slug: string; source_type: string } | null;
        profiles: { username: string; display_name: string; avatar_url: string | null } | null;
      }>;
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("event_submissions")
        .update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("已更新");
      qc.invalidateQueries({ queryKey: ["event-subs-review", event?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "更新失敗"),
  });

  if (!event) return <div className="p-10 text-center text-muted-foreground">載入中…</div>;
  if (user && event.host_id !== user.id) return <div className="p-10 text-center text-muted-foreground">只有主辦人可以審核</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/events/$slug" params={{ slug }} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 回到活動
      </Link>
      <h1 className="font-display text-3xl text-cream md:text-4xl">{event.title} · 審核投稿</h1>
      <p className="mt-1 text-sm text-muted-foreground">核可後作品才會公開顯示。</p>

      <ul className="mt-8 space-y-3">
        {subs && subs.length > 0 ? subs.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="font-medium text-cream">{s.tracks?.title ?? "—"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {s.profiles?.display_name ?? s.profiles?.username ?? "未知"} · {new Date(s.submitted_at).toLocaleString("zh-TW")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-ember/15 text-ember" : s.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-secondary text-cream"}`}>
                {s.status}
              </span>
              {s.status !== "approved" && (
                <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: s.id, status: "approved" })}>
                  <Check className="mr-1 h-3.5 w-3.5" />核可
                </Button>
              )}
              {s.status !== "rejected" && (
                <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: s.id, status: "rejected" })}>
                  <X className="mr-1 h-3.5 w-3.5" />退件
                </Button>
              )}
            </div>
          </li>
        )) : (
          <li className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">尚無投稿</li>
        )}
      </ul>
    </div>
  );
}
