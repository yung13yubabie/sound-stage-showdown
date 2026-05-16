import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted-foreground">載入中...</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-cream">這個頁面需要登入</p>
        <Link to="/auth" className="mt-4 inline-block rounded-md bg-gradient-ember px-4 py-2 text-sm text-primary-foreground">前往登入</Link>
      </div>
    );
  }
  return <Outlet />;
}
