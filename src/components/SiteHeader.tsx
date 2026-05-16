import { Link } from "@tanstack/react-router";
import { Radio, Music2, Trophy, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-ember shadow-ember">
            <Radio className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            聲擂 <span className="text-ember">SoundArena</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/events" icon={<Radio className="h-4 w-4" />}>活動</NavLink>
          <NavLink to="/competitions" icon={<Trophy className="h-4 w-4" />}>比賽</NavLink>
          <NavLink to="/tracks/new" icon={<Music2 className="h-4 w-4" />}>上傳作品</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />我的後台</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/host"><Radio className="mr-2 h-4 w-4" />主辦人後台</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-gradient-ember text-primary-foreground hover:opacity-90">
              <Link to="/auth"><LogIn className="mr-1.5 h-4 w-4" />登入</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-cream"
      activeProps={{ className: "text-cream bg-secondary/60" }}
    >
      {icon}
      {children}
    </Link>
  );
}
