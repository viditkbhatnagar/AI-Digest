import { chatCompletionJSON, chatCompletion } from "./openai";
import { createAdminSupabaseClient } from "./supabase";
import { slugify } from "./utils";
import { PROMPTS } from "./prompts";
import type { ExtractedEntity } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractionInput {
  title: string;
  summary: string;
  url: string;
  source_name: string;
}

interface ExtractEntitiesResponse {
  entities: ExtractedEntity[];
}

// ---------------------------------------------------------------------------
// Extract entities from a single article
// ---------------------------------------------------------------------------

export async function extractEntities(
  article: ExtractionInput
): Promise<ExtractedEntity[]> {
  try {
    const userPrompt = `Article: "${article.title}"
Source: ${article.source_name}
Summary: ${article.summary}`;

    const result = await chatCompletionJSON<ExtractEntitiesResponse>(
      PROMPTS.EXTRACT_ENTITIES,
      userPrompt
    );

    return result.entities ?? [];
  } catch (error) {
    console.error(
      `[entities] Extraction failed for "${article.title}":`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Trending score: recency-weighted mention count
// ---------------------------------------------------------------------------

function calculateTrendingScore(
  mentionCount: number,
  lastMentioned: string
): number {
  const hoursAgo =
    (Date.now() - new Date(lastMentioned).getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = Math.max(0.1, 1 - hoursAgo / (7 * 24));
  return mentionCount * recencyMultiplier;
}

// ---------------------------------------------------------------------------
// Upsert a single entity into the knowledge base
// ---------------------------------------------------------------------------

const MERGE_SIMILARITY_THRESHOLD = 0.9;
const MATCH_SIMILARITY_THRESHOLD = 0.4;

export async function upsertEntity(
  entity: ExtractedEntity,
  articleId: string
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  try {
    // Check for similar existing entity via pg_trgm
    const { data: matches, error: matchError } = await supabase.rpc(
      "find_similar_entity",
      {
        entity_name: entity.name,
        similarity_threshold: MATCH_SIMILARITY_THRESHOLD,
      }
    );

    if (matchError) {
      console.error(`[entities] find_similar_entity RPC error:`, matchError);
      return;
    }

    const topMatch = matches?.[0];

    if (topMatch && topMatch.similarity >= MERGE_SIMILARITY_THRESHOLD) {
      // High-confidence match — merge into existing entity
      const { data: existing, error: fetchError } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("id", topMatch.id)
        .single();

      if (fetchError || !existing) {
        console.error(
          `[entities] Failed to fetch entity ${topMatch.id}:`,
          fetchError
        );
        return;
      }

      // Merge descriptions
      let mergedDescription = existing.description ?? entity.description;
      if (existing.description && entity.description) {
        try {
          const mergePrompt = PROMPTS.MERGE_ENTITY_DESCRIPTION.replace(
            "{existing}",
            existing.description
          ).replace("{new_context}", entity.description);
          mergedDescription = await chatCompletion(
            mergePrompt,
            `Entity: ${entity.name}`,
            {}
          );
        } catch {
          console.warn(
            `[entities] Description merge failed for "${entity.name}", keeping existing`
          );
        }
      }

      // Update existing entity
      const existingArticleIds: string[] =
        existing.source_article_ids ?? [];
      const updatedArticleIds = existingArticleIds.includes(articleId)
        ? existingArticleIds
        : [...existingArticleIds, articleId];

      const now = new Date().toISOString();
      const newMentionCount = (existing.mention_count ?? 0) + 1;

      const { error: updateError } = await supabase
        .from("knowledge_base")
        .update({
          description: mergedDescription,
          mention_count: newMentionCount,
          last_mentioned: now,
          source_article_ids: updatedArticleIds,
          metadata: { ...existing.metadata, ...entity.metadata },
          trending_score: calculateTrendingScore(newMentionCount, now),
        })
        .eq("id", topMatch.id);

      if (updateError) {
        console.error(
          `[entities] Update failed for "${entity.name}":`,
          updateError
        );
      }
    } else {
      // No strong match — insert new entity
      const slug = slugify(entity.name);
      const now = new Date().toISOString();

      const { error: insertError } = await supabase
        .from("knowledge_base")
        .upsert(
          {
            type: entity.type,
            name: entity.name,
            slug,
            description: entity.description,
            metadata: entity.metadata ?? {},
            first_seen: now,
            last_mentioned: now,
            mention_count: 1,
            source_article_ids: [articleId],
            trending_score: calculateTrendingScore(1, now),
          },
          { onConflict: "slug" }
        );

      if (insertError) {
        console.error(
          `[entities] Insert failed for "${entity.name}" (slug: ${slug}):`,
          insertError
        );
      }
    }
  } catch (error) {
    console.error(
      `[entities] upsertEntity failed for "${entity.name}":`,
      error instanceof Error ? error.message : error
    );
  }
}

// ---------------------------------------------------------------------------
// Process entities for multiple articles (sequential to avoid race conditions)
// ---------------------------------------------------------------------------

export async function processEntities(
  articles: Array<{
    id: string;
    title: string;
    ai_summary: string;
    url: string;
    source_name: string;
  }>
): Promise<number> {
  let totalEntities = 0;

  for (const article of articles) {
    const entities = await extractEntities({
      title: article.title,
      summary: article.ai_summary,
      url: article.url,
      source_name: article.source_name,
    });

    for (const entity of entities) {
      await upsertEntity(entity, article.id);
      totalEntities++;
    }
  }

  console.log(
    `[entities] Processed ${totalEntities} entities from ${articles.length} articles`
  );
  return totalEntities;
}
