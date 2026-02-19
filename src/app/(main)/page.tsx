import { createServerSupabaseClient } from "@/lib/supabase";
import { HomeContent } from "./home-content";
import type { Digest, StatsResponse } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Today's Digest",
};

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  // Fetch latest digest
  const { data: digest } = await supabase
    .from("digests")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // Fetch most recent digest with weekly_summary
  const { data: recentDigests } = await supabase
    .from("digests")
    .select("*")
    .order("date", { ascending: false })
    .not("weekly_summary", "is", null)
    .limit(1);
  const weeklyDigest =
    (recentDigests ?? []).length > 0
      ? ((recentDigests![0]) as Digest)
      : null;

  // Fetch stats
  const [
    { count: totalArticles },
    { count: totalEntities },
    { data: trendingEntries },
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
  ]);

  const stats: StatsResponse = {
    totalArticles: totalArticles ?? 0,
    totalSources: 42,
    activeSources: 38,
    totalEntities: totalEntities ?? 0,
    trendingTopics: (trendingEntries ?? []).map((e) => ({
      name: e.name,
      count: e.mention_count,
    })),
    lastDigestDate: digest?.date ?? null,
    backlogCount: null,
  };

  return (
    <HomeContent
      digest={(digest as Digest) ?? null}
      stats={stats}
      weeklyDigest={weeklyDigest}
    />
  );
}
