import { Link } from "@tanstack/react-router";
import { Home, Compass, Radio, Trophy, User } from "lucide-react";

const items = [
  { to: "/", label: "首頁", icon: Home },
  { to: "/events", label: "活動", icon: Radio },
  { to: "/competitions", label: "比賽", icon: Trophy },
  { to: "/explore", label: "探索", icon: Compass },
  { to: "/dashboard", label: "我的", icon: User },
] as const;

export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted-foreground transition-colors hover:text-cream"
                activeProps={{ className: "text-ember" }}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
