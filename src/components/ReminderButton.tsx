import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff } from "lucide-react";

type TargetType = "event" | "competition" | "round";

export function ReminderButton({ targetType, targetId, remindAt, size = "sm" }: {
  targetType: TargetType; targetId: string; remindAt: string | null | undefined; size?: "sm" | "default";
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["reminder", targetType, targetId, user?.id];

  const { data: existing } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("id")
        .eq("user_id", user!.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("請先登入");
      if (!remindAt) throw new Error("此項目沒有可提醒的時間");
      if (existing) {
        const { error } = await supabase
          .from("reminders").delete()
          .eq("user_id", user.id).eq("target_type", targetType).eq("target_id", targetId);
        if (error) throw error;
        return false;
      }
      const at = new Date(new Date(remindAt).getTime() - 30 * 60 * 1000).toISOString();
      const { error } = await supabase.from("reminders")
        .insert({ user_id: user.id, target_type: targetType, target_id: targetId, remind_at: at });
      if (error) throw error;
      return true;
    },
    onSuccess: (now) => {
      toast.success(now ? "已設定提醒(開始前 30 分)" : "已取消提醒");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "操作失敗"),
  });

  if (!user) {
    return (
      <Button asChild size={size} variant="outline">
        <Link to="/auth"><BellRing className="mr-1.5 h-4 w-4" />登入後提醒我</Link>
      </Button>
    );
  }
  if (!remindAt) return null;

  return (
    <Button size={size} variant="outline" onClick={() => toggle.mutate()} disabled={toggle.isPending}>
      {existing ? <><BellOff className="mr-1.5 h-4 w-4" />取消提醒</> : <><BellRing className="mr-1.5 h-4 w-4" />提醒我</>}
    </Button>
  );
}
