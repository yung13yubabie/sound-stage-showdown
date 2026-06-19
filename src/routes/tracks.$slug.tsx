import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MediaEmbed } from "@/components/MediaEmbed";

export const Route = createFileRoute("/tracks/$slug")({
  component: TrackDetail,
});

function TrackDetail() {
  const { slug } = Route.useParams();
  const { data: track, isLoading } = useQuery({
    queryKey: ["track", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracks").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">載入中...</div>;
  if (!track) return <div className="p-10 text-center text-muted-foreground">找不到作品</div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/explore" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ember">
        <ArrowLeft className="h-4 w-4" /> 探索
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {track.cover_url && (
          <img
            src={track.cover_url}
            alt={track.title}
            loading="lazy"
            className="h-28 w-28 rounded-xl object-cover ring-1 ring-border"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl text-cream">{track.title}</h1>
          {track.genre && <p className="mt-1 text-sm text-ember">{track.genre}</p>}
        </div>
      </div>

      {track.source_url && (
        <div className="mt-6">
          <MediaEmbed url={track.source_url} title={track.title} />
        </div>
      )}

      {track.description && <p className="mt-6 whitespace-pre-wrap text-muted-foreground">{track.description}</p>}

      {track.lyrics && (
        <details className="mt-6 rounded-lg border border-border bg-stage p-4">
          <summary className="cursor-pointer text-sm text-ember">歌詞</summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-cream/90">{track.lyrics}</pre>
        </details>
      )}

      {track.ai_disclosure && (
        <div className="mt-6 rounded-lg border border-border bg-stage p-4 text-sm">
          <span className="text-xs uppercase tracking-widest text-ember">AI 揭露</span>
          <p className="mt-1 text-cream/90">{track.ai_disclosure}</p>
        </div>
      )}
    </article>
  );
}
