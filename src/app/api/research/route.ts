import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { generateEmbedding, chatCompletion } from "@/lib/openai";
import { PROMPTS } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Find relevant articles via vector similarity
    const { data: matchedArticles } = await supabase.rpc("match_articles", {
      query_embedding: questionEmbedding,
      match_threshold: 0.4,
      match_count: 10,
    });

    // Search knowledge base for entity context
    const { data: matchedEntities } = await supabase.rpc(
      "match_knowledge_base",
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.5,
        match_count: 5,
      }
    );

    // Build context from retrieved documents
    const articleContext = (matchedArticles ?? [])
      .map(
        (a: Record<string, unknown>, i: number) =>
          `[${i + 1}] "${a.title}" (${a.source_name}, ${a.published_at ? new Date(a.published_at as string).toLocaleDateString() : "unknown date"})\nSummary: ${a.ai_summary}\nKey takeaway: ${a.key_takeaway}`
      )
      .join("\n\n");

    const entityContext = (matchedEntities ?? [])
      .map(
        (e: Record<string, unknown>) =>
          `Entity: ${e.name} (${e.type}) - ${e.description}`
      )
      .join("\n");

    const fullContext = [articleContext, entityContext]
      .filter(Boolean)
      .join("\n\n---\n\n");

    // Build prompt with context and question
    const prompt = PROMPTS.RESEARCH_QUERY.replace(
      "{context}",
      fullContext || "No relevant context found in the knowledge base."
    ).replace("{question}", question);

    const answer = await chatCompletion(
      prompt,
      "Please provide a comprehensive answer based on the context above.",
      { maxTokens: 2048 }
    );

    // Return source articles (without heavy fields)
    const sources = (matchedArticles ?? []).slice(0, 5).map(
      (a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        source_name: a.source_name,
        source_url: "",
        published_at: a.published_at,
        fetched_at: "",
        category: a.category,
        raw_content: null,
        ai_summary: a.ai_summary,
        key_takeaway: a.key_takeaway,
        importance_score: a.importance_score,
        tags: a.tags ?? [],
        mentioned_entities: [],
        embedding: null,
        digest_date: a.digest_date ?? "",
        is_bookmarked: a.is_bookmarked ?? false,
        created_at: "",
      })
    );

    return NextResponse.json({
      answer,
      sources,
      query: question,
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
