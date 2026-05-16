import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileNav } from "@/components/MobileNav";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <h1 className="font-display text-7xl text-ember">404</h1>
        <p className="mt-2 text-muted-foreground">這個舞台還沒有節目</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-gradient-ember px-4 py-2 text-sm text-primary-foreground">回首頁</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div>
        <h2 className="font-display text-2xl text-cream">這個頁面沒能上場</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-gradient-ember px-4 py-2 text-sm text-primary-foreground"
        >重試</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "聲擂 SoundArena — 音樂活動・線上比賽・創作者社群" },
      { name: "description", content: "聲擂 SoundArena 是音樂創作者的線上舞台:共聽會、歌曲比賽、擂台夜與決賽揭榜,讓你的作品被聽見。" },
      { name: "author", content: "SoundArena" },
      { property: "og:title", content: "聲擂 SoundArena" },
      { property: "og:description", content: "音樂交流・活動・多輪比賽平台" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "聲擂 SoundArena" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#1a0808" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "聲擂 SoundArena",
        description: "音樂交流・活動・多輪比賽平台",
      }),
    }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen pb-safe-nav">
          <SiteHeader />
          <main><Outlet /></main>
          <MobileNav />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
