import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import sourcesConfig from "@/lib/sources-config.json";
import type { StatsResponse } from "@/lib/types";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const [
      { count: totalArticles },
      { count: totalEntities },
      { data: trendingEntries },
      { data: latestDigest },
    ] = await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }),
      supabase
        .from("knowledge_base")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("knowledge_base")
        .select("name, mention_count")
        .order("trending_score", { ascending: false })
        .limit(5),
      supabase
        .from("digests")
        .select("date, backlog_count")
        .order("date", { ascending: false })
        .limit(1)
        .single(),
    ]);

    const totalSources = sourcesConfig.sources.length;
    const activeSources = sourcesConfig.sources.filter(
      (s: { enabled: boolean }) => s.enabled
    ).length;

    const stats: StatsResponse = {
      totalArticles: totalArticles ?? 0,
      totalSources,
      activeSources,
      totalEntities: totalEntities ?? 0,
      trendingTopics: (trendingEntries ?? []).map((e) => ({
        name: e.name,
        count: e.mention_count,
      })),
      lastDigestDate: latestDigest?.date ?? null,
      backlogCount: latestDigest?.backlog_count ?? null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
