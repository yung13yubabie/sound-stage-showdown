import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check } from "lucide-react";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,read_at,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications").update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id).is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-bold text-cream">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium text-cream">通知</span>
          {unread > 0 && (
            <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ember">
              <Check className="h-3 w-3" />全部已讀
            </button>
          )}
        </div>
        <ul className="max-h-96 overflow-auto">
          {items && items.length > 0 ? items.map((n) => (
            <li key={n.id} className={`border-b border-border/60 px-3 py-2 text-sm ${n.read_at ? "text-muted-foreground" : "bg-secondary/40 text-cream"}`}>
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("zh-TW")}</div>
            </li>
          )) : (
            <li className="px-3 py-8 text-center text-xs text-muted-foreground">目前沒有通知</li>
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
