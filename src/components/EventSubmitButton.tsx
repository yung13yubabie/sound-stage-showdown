import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

export function EventSubmitButton({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: tracks } = useQuery({
    queryKey: ["my-tracks-for-submit", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("id,title,source_type")
        .eq("creator_id", user!.id).eq("status", "published").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !selected) throw new Error("請先選擇作品");
      const { error } = await supabase.from("event_submissions").insert({
        event_id: eventId,
        creator_id: user.id,
        track_id: selected,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("投稿送出,等待主辦人審核");
      setOpen(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["event-submissions", eventId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "投稿失敗"),
  });

  if (!user) {
    return (
      <Button asChild className="w-full bg-gradient-ember text-primary-foreground">
        <Link to="/auth">登入後投稿</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-ember text-primary-foreground">投稿作品</Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader><DialogTitle className="text-cream">選擇要投稿的作品</DialogTitle></DialogHeader>
        {tracks && tracks.length > 0 ? (
          <ul className="max-h-80 space-y-2 overflow-auto">
            {tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${selected === t.id ? "border-ember bg-ember/10 text-ember" : "border-border text-cream hover:border-ember/40"}`}
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.source_type}</div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm">
            <p className="text-muted-foreground">還沒有可投稿的作品</p>
            <Button asChild className="mt-3 bg-gradient-ember text-primary-foreground">
              <Link to="/tracks/new">先建立作品</Link>
            </Button>
          </div>
        )}
        <Button onClick={() => submit.mutate()} disabled={!selected || submit.isPending} className="w-full bg-gradient-ember text-primary-foreground">
          {submit.isPending ? "送出中..." : "確認投稿"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
