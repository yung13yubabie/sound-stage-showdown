import { useCountdown } from "@/lib/countdown-store";
import { cn } from "@/lib/utils";

interface Props {
  targetIso: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Countdown({ targetIso, className, size = "md", label }: Props) {
  const c = useCountdown(targetIso);
  if (!c) return null;

  const sizes = {
    sm: { num: "text-lg", unit: "text-[10px]", gap: "gap-1.5" },
    md: { num: "text-3xl", unit: "text-xs", gap: "gap-3" },
    lg: { num: "text-5xl md:text-6xl", unit: "text-sm", gap: "gap-4 md:gap-6" },
  }[size];

  if (c.isPast) {
    return <span className={cn("font-mono text-ember", className)}>{label ?? "已開始"}</span>;
  }

  const parts = [
    { v: c.days, u: "天" },
    { v: c.hours, u: "時" },
    { v: c.minutes, u: "分" },
    { v: c.seconds, u: "秒" },
  ];

  return (
    <div className={cn("flex items-end font-mono tabular-nums text-cream", sizes.gap, className)}>
      {parts.map((p) => (
        <div key={p.u} className="flex flex-col items-center">
          <span className={cn("font-bold leading-none text-shimmer", sizes.num)}>
            {String(p.v).padStart(2, "0")}
          </span>
          <span className={cn("mt-1 uppercase tracking-widest text-muted-foreground", sizes.unit)}>{p.u}</span>
        </div>
      ))}
    </div>
  );
}
