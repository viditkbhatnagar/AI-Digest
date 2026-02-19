import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import type { Article, ArticleCategory } from "@/lib/types";

const ARTICLE_SELECT =
  "id, title, url, source_name, source_url, published_at, fetched_at, category, ai_summary, key_takeaway, importance_score, tags, mentioned_entities, digest_date, is_bookmarked, created_at";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data: digest } = await supabase
      .from("digests")
      .select("*")
      .eq("date", date)
      .single();

    if (!digest) {
      return NextResponse.json({
        digest: null,
        articles: [],
        categories: {},
        date,
        message: `No digest found for ${date}.`,
      });
    }

    const { data: articles } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("digest_date", date)
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
    console.error(`Error fetching digest for ${date}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
