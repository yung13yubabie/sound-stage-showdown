import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "登入 / 註冊 | 聲擂 SoundArena" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("註冊成功!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("歡迎回來");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
      if (r.error) {
        const msg = r.error.message || JSON.stringify(r.error);
        console.error("[google oauth]", r.error);
        toast.error(`Google 登入失敗: ${msg}`);
      }
    } catch (err) {
      console.error("[google oauth] exception", err);
      toast.error(err instanceof Error ? `Google 登入失敗: ${err.message}` : "Google 登入失敗");
    }
  };


  return (
    <div className="grid min-h-[80vh] place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-stage">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-ember shadow-ember">
            <Radio className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl text-cream">
            {mode === "login" ? "歡迎回到舞台" : "加入聲擂"}
          </h1>
        </div>

        <Button onClick={signInGoogle} variant="outline" className="w-full">
          使用 Google 繼續
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> 或 <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-ember text-primary-foreground">
            {loading ? "處理中..." : mode === "login" ? "登入" : "建立帳號"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-ember"
        >
          {mode === "login" ? "還沒有帳號?註冊" : "已經有帳號?登入"}
        </button>
      </div>
    </div>
  );
}
