import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { StatusBadge } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["competitions"]["Row"];

export function CompetitionCard({ competition }: { competition: Row }) {
  const variant =
    competition.status === "warmup" ? "warmup"
    : competition.status === "active" ? "voting"
    : competition.status === "final_results_published" ? "ended"
    : "scheduled";

  const target = competition.enable_warmup ? competition.warmup_countdown_at : null;

  return (
    <Link
      to="/competitions/$slug"
      params={{ slug: competition.slug }}
      className="group hover-rise relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-stage"
    >
      <div className="pointer-events-none absolute inset-0 bg-spotlight opacity-0 transition-opacity group-hover:opacity-60" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-ember shadow-ember">
          <Trophy className="h-5 w-5 text-primary-foreground" />
        </div>
        <StatusBadge variant={variant} />
      </div>

      <h3 className="relative mt-4 font-display text-xl leading-tight text-cream line-clamp-2">
        {competition.title}
      </h3>
      {competition.theme && (
        <p className="relative mt-1 text-sm text-ember/80">主題:{competition.theme}</p>
      )}
      {competition.description && (
        <p className="relative mt-2 text-sm text-muted-foreground line-clamp-2">
          {competition.description}
        </p>
      )}

      {target && (
        <div className="relative mt-4 rounded-lg border border-border bg-stage px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">預熱倒數</div>
          <Countdown targetIso={target} size="sm" />
        </div>
      )}
    </Link>
  );
}
