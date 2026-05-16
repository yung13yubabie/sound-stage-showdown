import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

export const Route = createFileRoute("/tracks/$slug")({
  component: TrackDetail,
});

function TrackDetail() {
  const { slug } = Route.useParams();
  const { data: track } = useQuery({
    queryKey: ["track", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!track) return <div className="p-10 text-center text-muted-foreground">載入中...</div>;

  const isYoutube = track.source_type === "youtube" || track.source_type === "youtube_live";

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/explore" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 探索
      </Link>
      <h1 className="font-display text-4xl text-cream">{track.title}</h1>
      {track.genre && <p className="mt-1 text-sm text-ember">{track.genre}</p>}

      {isYoutube && track.source_url && (
        <div className="mt-6"><YouTubeEmbed url={track.source_url} title={track.title} /></div>
      )}
      {!isYoutube && track.source_url && (
        <a href={track.source_url} target="_blank" rel="noopener noreferrer nofollow"
           className="mt-6 inline-block rounded-md bg-gradient-ember px-4 py-2 text-sm text-primary-foreground">
          在外部平台收聽 ↗
        </a>
      )}

      {track.description && <p className="mt-6 whitespace-pre-wrap text-muted-foreground">{track.description}</p>}
      {track.ai_disclosure && (
        <div className="mt-6 rounded-lg border border-border bg-stage p-4 text-sm">
          <span className="text-xs uppercase tracking-widest text-ember">AI 揭露</span>
          <p className="mt-1 text-cream/90">{track.ai_disclosure}</p>
        </div>
      )}
    </article>
  );
}
