import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/openai";
import type { SearchResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const mode = searchParams.get("mode") || "text";
  const category = searchParams.get("category") || null;
  const dateFrom = searchParams.get("dateFrom") || null;
  const dateTo = searchParams.get("dateTo") || null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminSupabaseClient();
    let results: SearchResult[] = [];

    if (mode === "text" || mode === "hybrid") {
      const { data: textResults } = await supabase.rpc("search_articles", {
        query_text: query,
        match_count: limit,
        filter_category: category,
        filter_date_from: dateFrom,
        filter_date_to: dateTo,
      });

      if (textResults) {
        results = textResults.map((a: Record<string, unknown>) => ({
          article: a,
          highlight: a.ai_summary as string | undefined,
        }));
      }
    }

    if (mode === "semantic" || mode === "hybrid") {
      const queryEmbedding = await generateEmbedding(query);
      const { data: semanticResults } = await supabase.rpc("match_articles", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
      });

      if (semanticResults) {
        const semanticMapped: SearchResult[] = semanticResults.map(
          (a: Record<string, unknown>) => ({
            article: a,
            similarity: a.similarity as number,
          })
        );

        if (mode === "hybrid") {
          const seen = new Set(results.map((r) => r.article.id));
          for (const sr of semanticMapped) {
            if (!seen.has(sr.article.id)) {
              results.push(sr);
              seen.add(sr.article.id);
            }
          }
        } else {
          results = semanticMapped;
        }
      }
    }

    if (mode === "semantic" && category) {
      results = results.filter((r) => r.article.category === category);
    }

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
      query,
      mode,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
