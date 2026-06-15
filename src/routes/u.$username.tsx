import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrackCard } from "@/components/TrackCard";
import { FollowButton } from "@/components/FollowButton";
import { User } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: tracks } = useQuery({
    queryKey: ["profile-tracks", username],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*, profiles!inner(username)")
        .eq("profiles.username", username)
        .eq("status", "published")
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (!profile) return <div className="p-10 text-center text-muted-foreground">找不到這位使用者</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center gap-4 border-b border-border pb-8">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-ember shadow-ember">
          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-cream">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-cream/80">{profile.bio}</p>}
        </div>
        <FollowButton targetType="profile" targetId={profile.user_id} />
      </header>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-2xl text-cream">作品</h2>
        {tracks && tracks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">{tracks.map((t) => <TrackCard key={t.id} track={t} />)}</div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">尚未發布作品</p>
        )}
      </section>
    </div>
  );
}
