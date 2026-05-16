import { cn } from "@/lib/utils";

type Variant = "live" | "warmup" | "scheduled" | "ended" | "voting" | "draft" | "neutral";

const map: Record<Variant, { label: string; cls: string; live?: boolean }> = {
  live: { label: "直播中", cls: "bg-live text-white", live: true },
  warmup: { label: "預熱中", cls: "bg-ember/20 text-ember border border-ember/40" },
  scheduled: { label: "即將開始", cls: "bg-secondary text-cream border border-border" },
  voting: { label: "投票中", cls: "bg-gradient-ember text-primary-foreground" },
  ended: { label: "已結束", cls: "bg-muted text-muted-foreground" },
  draft: { label: "草稿", cls: "bg-muted text-muted-foreground border border-dashed border-border" },
  neutral: { label: "", cls: "bg-secondary text-cream" },
};

export function StatusBadge({ variant, label, className }: { variant: Variant; label?: string; className?: string }) {
  const c = map[variant];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider", c.cls, className)}>
      {c.live && <span className="h-1.5 w-1.5 rounded-full bg-white live-dot" />}
      {label ?? c.label}
    </span>
  );
}
