import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

type TargetType = "event" | "competition" | "profile";

export function FollowButton({ targetType, targetId, size = "sm" }: { targetType: TargetType; targetId: string; size?: "sm" | "default" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["follow", targetType, targetId, user?.id];

  const { data: followed } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
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
      if (followed) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("follows")
        .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
      if (error) throw error;
      return true;
    },
    onSuccess: (now) => {
      toast.success(now ? "已追蹤" : "已取消追蹤");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "操作失敗"),
  });

  if (!user) {
    return (
      <Button asChild size={size} variant="outline">
        <Link to="/auth"><UserPlus className="mr-1.5 h-4 w-4" />登入後追蹤</Link>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={followed ? "outline" : "default"}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={followed ? "" : "bg-gradient-ember text-primary-foreground"}
    >
      {followed ? <><UserCheck className="mr-1.5 h-4 w-4" />已追蹤</> : <><UserPlus className="mr-1.5 h-4 w-4" />追蹤</>}
    </Button>
  );
}
