import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import type { Article, ArticleCategory } from "@/lib/types";

const ARTICLE_SELECT =
  "id, title, url, source_name, source_url, published_at, fetched_at, category, ai_summary, key_takeaway, importance_score, tags, mentioned_entities, digest_date, is_bookmarked, created_at";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const { data: digest, error: digestError } = await supabase
      .from("digests")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (digestError || !digest) {
      return NextResponse.json({
        digest: null,
        articles: [],
        categories: {},
        message: "No digests available yet. Run the pipeline first.",
      });
    }

    const { data: articles } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("digest_date", digest.date)
      .order("importance_score", { ascending: false });

    const categories: Record<string, Article[]> = {};
    for (const article of (articles ?? []) as Article[]) {
      const cat = article.category as ArticleCategory;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(article);
    }

    return NextResponse.json({
      digest,
      articles: articles ?? [],
      categories,
    });
  } catch (error) {
    console.error("Error fetching latest digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
