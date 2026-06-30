import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["track_verification_status"];

const map: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
  unverified: { label: "未驗證", cls: "bg-muted text-muted-foreground border border-border", icon: <ShieldQuestion className="h-3 w-3" /> },
  pending_claim_code: { label: "驗證中", cls: "bg-secondary text-cream border border-border", icon: <ShieldQuestion className="h-3 w-3" /> },
  verified_claim_code: { label: "已驗證 (驗證碼)", cls: "bg-ember/15 text-ember border border-ember/40", icon: <ShieldCheck className="h-3 w-3" /> },
  verified_official: { label: "官方驗證", cls: "bg-gradient-ember text-primary-foreground", icon: <ShieldCheck className="h-3 w-3" /> },
  manual_review_required: { label: "人工審查中", cls: "bg-secondary text-cream border border-border", icon: <ShieldAlert className="h-3 w-3" /> },
  rejected: { label: "驗證被拒", cls: "bg-destructive/10 text-destructive border border-destructive/40", icon: <ShieldAlert className="h-3 w-3" /> },
};

export function VerificationBadge({ status }: { status: Status | null | undefined }) {
  const s: Status = status ?? "unverified";
  const c = map[s];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}
