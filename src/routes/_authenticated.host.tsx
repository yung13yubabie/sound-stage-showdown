import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Radio, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/host")({
  head: () => ({ meta: [{ title: "主辦人後台 | 聲擂" }, { name: "robots", content: "noindex" }] }),
  component: HostPage,
});

function HostPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl text-cream md:text-4xl">主辦人後台</h1>
      <p className="mt-2 text-muted-foreground">建立活動、比賽,管理輪次與投稿。</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card title="建立活動" desc="共聽會、擂台夜、電台節目..." icon={<Radio />} to="/host/events/new" />
        <Card title="建立比賽" desc="多輪賽制 + 匿名投票" icon={<Trophy />} to="/host/competitions/new" />
      </div>
      <p className="mt-10 text-xs text-muted-foreground">活動 / 比賽建立表單將在下一階段擴充。資料庫已就緒,可直接透過 API 建立。</p>
    </div>
  );
}

function Card({ title, desc, icon, to }: { title: string; desc: string; icon: React.ReactNode; to: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-stage">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-ember text-primary-foreground shadow-ember">{icon}</div>
      <h2 className="mt-4 font-display text-xl text-cream">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <Button asChild className="mt-4 w-full bg-gradient-ember text-primary-foreground"><Link to={to}>開始建立</Link></Button>
    </div>
  );
}
