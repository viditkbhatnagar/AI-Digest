import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import type { ArticlesResponse, ArticleCategory } from "@/lib/types";

const PAGE_SIZE = 30;
const VALID_CATEGORIES = new Set([
  "research",
  "industry",
  "product",
  "policy",
  "tutorial",
  "opinion",
]);

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const sort = searchParams.get("sort") === "importance" ? "importance" : "latest";
    const dateRange = searchParams.get("dateRange") ?? "all";
    const source = searchParams.get("source") || null;
    const category = searchParams.get("category") || null;

    // Build query
    let query = supabase
      .from("articles")
      .select(
        "id, title, url, source_name, source_url, published_at, fetched_at, category, ai_summary, key_takeaway, importance_score, tags, mentioned_entities, digest_date, is_bookmarked, created_at",
        { count: "exact" }
      );

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let cutoff: Date;
      if (dateRange === "today") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === "7d") {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "30d") {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(0);
      }
      query = query.gte("published_at", cutoff.toISOString());
    }

    // Source filter
    if (source) {
      query = query.eq("source_name", source);
    }

    // Category filter
    if (category && VALID_CATEGORIES.has(category)) {
      query = query.eq("category", category as ArticleCategory);
    }

    // Sort
    if (sort === "importance") {
      query = query.order("importance_score", { ascending: false });
    } else {
      query = query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: articles, count, error } = await query;

    if (error) {
      console.error("Articles API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch articles" },
        { status: 500 }
      );
    }

    // Fetch distinct source names (only on page 1 to avoid redundant queries)
    let sources: string[] = [];
    if (page === 1) {
      const { data: sourceRows } = await supabase
        .from("articles")
        .select("source_name")
        .order("source_name");

      if (sourceRows) {
        sources = [...new Set(sourceRows.map((r) => r.source_name))];
      }
    }

    const total = count ?? 0;
    const response: ArticlesResponse = {
      articles: (articles ?? []) as ArticlesResponse["articles"],
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      sources,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Articles API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
