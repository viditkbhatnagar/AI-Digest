import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";

const ARTICLE_SELECT =
  "id, title, url, source_name, source_url, published_at, fetched_at, category, ai_summary, key_takeaway, importance_score, tags, mentioned_entities, digest_date, is_bookmarked, created_at";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: entry, error: entryError } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("slug", slug)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        {
          entry: null,
          articles: [],
          relatedEntities: [],
          slug,
          message: `Entity '${slug}' not found.`,
        },
        { status: 404 }
      );
    }

    // Fetch related articles using source_article_ids
    let articles: Record<string, unknown>[] = [];
    if (entry.source_article_ids && entry.source_article_ids.length > 0) {
      const { data: relatedArticles } = await supabase
        .from("articles")
        .select(ARTICLE_SELECT)
        .in("id", entry.source_article_ids)
        .order("importance_score", { ascending: false });
      articles = relatedArticles ?? [];
    }

    // Fetch related entities (share at least one source_article_id)
    let relatedEntities: Record<string, unknown>[] = [];
    if (entry.source_article_ids && entry.source_article_ids.length > 0) {
      const { data } = await supabase
        .from("knowledge_base")
        .select("*")
        .neq("id", entry.id)
        .overlaps("source_article_ids", entry.source_article_ids)
        .limit(10);
      relatedEntities = data ?? [];
    }

    return NextResponse.json({
      entry,
      articles,
      relatedEntities,
    });
  } catch (error) {
    console.error(`Knowledge base detail error for ${slug}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
