import * as cheerio from "cheerio";
import { createAdminSupabaseClient } from "./supabase";
import { chatCompletionJSON, chatCompletion } from "./openai";
import { generateEmbedding } from "./openai";
import { PROMPTS } from "./prompts";
import { toISODateString } from "./utils";
import { fetchAllSources } from "./sources";
import { deduplicate } from "./dedup";
import { generateBatchEmbeddings } from "./embeddings";
import { processEntities } from "./entity-extraction";
import type {
  PipelineResult,
  RawFeedItem,
  SummarizationResult,
  ArticleCategory,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUMMARIZATION_BATCH_SIZE = 5;
const SUMMARIZATION_DELAY_MS = 500;
const DB_URL_CHUNK_SIZE = 100;
const INSERT_BATCH_SIZE = 20;
const ENTITY_IMPORTANCE_THRESHOLD = 6;
const MAX_ARTICLES_PER_RUN = 30;
const MAX_ENTITY_EXTRACTION_ARTICLES = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Summarize a single article
// ---------------------------------------------------------------------------

interface SummarizeResponse extends SummarizationResult {
  is_ai_related?: boolean;
  mentioned_entities?: string[];
}

async function summarizeArticle(
  title: string,
  content: string,
  sourceName: string
): Promise<SummarizeResponse | null> {
  try {
    const cleanContent = stripHtml(content);
    const userPrompt = `Title: ${title}
Source: ${sourceName}
Content: ${cleanContent.slice(0, 4000)}`;

    const result = await chatCompletionJSON<SummarizeResponse>(
      PROMPTS.SUMMARIZE_ARTICLE,
      userPrompt
    );

    return {
      summary: result.summary ?? "",
      key_takeaway: result.key_takeaway ?? "",
      importance_score: Math.min(10, Math.max(1, result.importance_score ?? 5)),
      tags: result.tags ?? [],
      category: result.category ?? ("industry" as ArticleCategory),
      mentioned_entities: result.mentioned_entities ?? [],
    };
  } catch (error) {
    console.error(
      `[pipeline] Summarization failed for "${title}":`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Summarize in batches
// ---------------------------------------------------------------------------

interface SummarizedArticle {
  title: string;
  url: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
  raw_content: string | null;
  ai_summary: string;
  key_takeaway: string;
  importance_score: number;
  tags: string[];
  category: ArticleCategory;
  mentioned_entities: string[];
}

async function summarizeBatch(
  items: RawFeedItem[]
): Promise<SummarizedArticle[]> {
  const results: SummarizedArticle[] = [];

  for (let i = 0; i < items.length; i += SUMMARIZATION_BATCH_SIZE) {
    const batch = items.slice(i, i + SUMMARIZATION_BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const summary = await summarizeArticle(
          item.title,
          item.content ?? item.title,
          item.source.name
        );
        return { item, summary };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.summary) {
        const { item, summary } = result.value;
        if (summary.is_ai_related === false) {
          console.log(
            `[pipeline] Skipping non-AI article: "${item.title}"`
          );
          continue;
        }
        results.push({
          title: item.title,
          url: item.url,
          source_name: item.source.name,
          source_url: item.source.url,
          published_at: item.published ?? null,
          raw_content: item.content ?? null,
          ai_summary: summary.summary,
          key_takeaway: summary.key_takeaway,
          importance_score: summary.importance_score,
          tags: summary.tags,
          category: summary.category,
          mentioned_entities: summary.mentioned_entities ?? [],
        });
      }
    }

    if (i + SUMMARIZATION_BATCH_SIZE < items.length) {
      await delay(SUMMARIZATION_DELAY_MS);
    }

    console.log(
      `[pipeline] Summarized batch ${Math.floor(i / SUMMARIZATION_BATCH_SIZE) + 1}/${Math.ceil(items.length / SUMMARIZATION_BATCH_SIZE)}`
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Check which URLs already exist in the database (chunked)
// ---------------------------------------------------------------------------

async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  const supabase = createAdminSupabaseClient();
  const existingUrls = new Set<string>();

  for (let i = 0; i < urls.length; i += DB_URL_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + DB_URL_CHUNK_SIZE);
    const { data } = await supabase
      .from("articles")
      .select("url")
      .in("url", chunk);

    if (data) {
      for (const row of data) {
        existingUrls.add(row.url);
      }
    }
  }

  return existingUrls;
}

// ---------------------------------------------------------------------------
// runDailyDigest: Full pipeline
// ---------------------------------------------------------------------------

export async function runDailyDigest(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const supabase = createAdminSupabaseClient();
  const digestDate = toISODateString();

  console.log(`[pipeline] Starting daily digest for ${digestDate}`);

  // Step 1: Fetch all sources
  let rawItems: RawFeedItem[];
  try {
    rawItems = await fetchAllSources();
  } catch (error) {
    const msg = `Source fetching failed: ${error instanceof Error ? error.message : error}`;
    console.error(`[pipeline] ${msg}`);
    return {
      articlesProcessed: 0,
      articlesStored: 0,
      entitiesExtracted: 0,
      backlogCount: 0,
      errors: [msg],
      duration: Date.now() - startTime,
    };
  }

  if (rawItems.length === 0) {
    return {
      articlesProcessed: 0,
      articlesStored: 0,
      entitiesExtracted: 0,
      backlogCount: 0,
      errors: ["No items fetched from any source"],
      duration: Date.now() - startTime,
    };
  }

  // Step 2: Deduplicate
  const dedupedItems = deduplicate(rawItems);
  console.log(
    `[pipeline] After dedup: ${dedupedItems.length} items (from ${rawItems.length})`
  );

  // Step 3: Filter out URLs already in the database
  const urls = dedupedItems.map((item) => item.url);
  const existingUrls = await getExistingUrls(urls);
  const newItems = dedupedItems.filter((item) => !existingUrls.has(item.url));
  console.log(
    `[pipeline] ${newItems.length} new items (${existingUrls.size} already in DB)`
  );

  if (newItems.length === 0) {
    return {
      articlesProcessed: 0,
      articlesStored: 0,
      entitiesExtracted: 0,
      backlogCount: 0,
      errors: [],
      duration: Date.now() - startTime,
    };
  }

  // Step 3b: Sort by recency and cap to avoid long-running pipelines
  const sortedNew = newItems.sort((a, b) => {
    const dateA = a.published ? new Date(a.published).getTime() : 0;
    const dateB = b.published ? new Date(b.published).getTime() : 0;
    return dateB - dateA;
  });
  const capped = sortedNew.slice(0, MAX_ARTICLES_PER_RUN);
  const backlogCount = Math.max(0, newItems.length - capped.length);
  if (backlogCount > 0) {
    console.log(
      `[pipeline] Capped to ${capped.length} articles (${backlogCount} deferred to next run)`
    );
  }

  // Step 4: Summarize articles in batches
  const summarized = await summarizeBatch(capped);
  console.log(
    `[pipeline] Summarized ${summarized.length}/${newItems.length} articles`
  );

  // Step 5: Sort by importance
  summarized.sort((a, b) => b.importance_score - a.importance_score);

  // Step 6: Generate embeddings
  const embeddingInputs = summarized.map((article) => ({
    id: article.url,
    text: `${article.title}. ${article.ai_summary}`,
  }));
  const embeddings = await generateBatchEmbeddings(embeddingInputs);

  // Step 7: Batch insert articles into Supabase
  let articlesStored = 0;
  const insertedArticleIds = new Map<string, string>(); // url -> id

  for (let i = 0; i < summarized.length; i += INSERT_BATCH_SIZE) {
    const batch = summarized.slice(i, i + INSERT_BATCH_SIZE);
    const rows = batch.map((article) => ({
      title: article.title,
      url: article.url,
      source_name: article.source_name,
      source_url: article.source_url,
      published_at: article.published_at,
      fetched_at: new Date().toISOString(),
      category: article.category,
      raw_content: article.raw_content,
      ai_summary: article.ai_summary,
      key_takeaway: article.key_takeaway,
      importance_score: article.importance_score,
      tags: article.tags,
      mentioned_entities: article.mentioned_entities,
      embedding: embeddings.get(article.url) ?? null,
      digest_date: digestDate,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("articles")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select("id, url");

    if (insertError) {
      console.error(`[pipeline] Article insert batch error:`, insertError);
      errors.push(`Insert batch error: ${insertError.message}`);
    } else if (inserted) {
      articlesStored += inserted.length;
      for (const row of inserted) {
        insertedArticleIds.set(row.url, row.id);
      }
    }
  }

  console.log(`[pipeline] Stored ${articlesStored} articles`);

  // Step 8: Extract entities (only for high-importance articles)
  let entitiesExtracted = 0;
  if (insertedArticleIds.size > 0) {
    const articlesForEntities = summarized
      .filter(
        (a) =>
          a.importance_score >= ENTITY_IMPORTANCE_THRESHOLD &&
          insertedArticleIds.has(a.url)
      )
      .slice(0, MAX_ENTITY_EXTRACTION_ARTICLES)
      .map((a) => ({
        id: insertedArticleIds.get(a.url)!,
        title: a.title,
        ai_summary: a.ai_summary,
        url: a.url,
        source_name: a.source_name,
      }));

    console.log(
      `[pipeline] Running entity extraction on ${articlesForEntities.length} articles (importance >= ${ENTITY_IMPORTANCE_THRESHOLD})`
    );

    try {
      entitiesExtracted = await processEntities(articlesForEntities);
    } catch (error) {
      const msg = `Entity extraction failed: ${error instanceof Error ? error.message : error}`;
      console.error(`[pipeline] ${msg}`);
      errors.push(msg);
    }
  }

  // Step 9: Create digest record
  const topStoryUrl = summarized[0]?.url;
  const topStoryId = topStoryUrl
    ? insertedArticleIds.get(topStoryUrl) ?? null
    : null;

  let editorialIntro: string | null = null;
  try {
    const topArticles = summarized.slice(0, 5);
    const introContent = topArticles
      .map(
        (a, i) =>
          `${i + 1}. "${a.title}" (${a.source_name}): ${a.ai_summary}`
      )
      .join("\n");
    editorialIntro = await chatCompletion(
      PROMPTS.GENERATE_DIGEST_INTRO,
      introContent
    );
  } catch (error) {
    console.warn(`[pipeline] Editorial intro generation failed:`, error);
    errors.push("Editorial intro generation failed");
  }

  const { error: digestError } = await supabase.from("digests").upsert(
    {
      date: digestDate,
      generated_at: new Date().toISOString(),
      article_count: articlesStored,
      top_story_id: topStoryId,
      editorial_intro: editorialIntro,
      backlog_count: backlogCount,
    },
    { onConflict: "date" }
  );

  if (digestError) {
    console.error(`[pipeline] Digest creation error:`, digestError);
    errors.push(`Digest creation error: ${digestError.message}`);
  }

  const duration = Date.now() - startTime;
  console.log(
    `[pipeline] Daily digest complete in ${(duration / 1000).toFixed(1)}s: ` +
      `${summarized.length} processed, ${articlesStored} stored, ${entitiesExtracted} entities, ${errors.length} errors`
  );

  return {
    articlesProcessed: summarized.length,
    articlesStored,
    entitiesExtracted,
    backlogCount,
    errors,
    duration,
  };
}

// ---------------------------------------------------------------------------
// runWeeklySummary: Weekly enrichment pipeline
// ---------------------------------------------------------------------------

export async function runWeeklySummary(): Promise<{
  summary: string | null;
  entitiesEnriched: number;
  errors: string[];
}> {
  const supabase = createAdminSupabaseClient();
  const errors: string[] = [];

  // Step 1: Fetch this week's articles
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = toISODateString(weekAgo);

  const { data: weekArticles, error: fetchError } = await supabase
    .from("articles")
    .select("*")
    .gte("digest_date", weekAgoStr)
    .order("importance_score", { ascending: false });

  if (fetchError || !weekArticles?.length) {
    console.warn("[pipeline] No articles found for weekly summary");
    return {
      summary: null,
      entitiesEnriched: 0,
      errors: ["No articles for this week"],
    };
  }

  // Step 2: Generate weekly summary
  let weeklySummary: string | null = null;
  try {
    const articlesText = weekArticles
      .slice(0, 50)
      .map(
        (a, i) =>
          `${i + 1}. "${a.title}" [${a.category}] (Score: ${a.importance_score}/10): ${a.ai_summary}`
      )
      .join("\n");

    weeklySummary = await chatCompletion(
      PROMPTS.GENERATE_WEEKLY_SUMMARY,
      articlesText,
      { maxTokens: 2048 }
    );
  } catch (error) {
    const msg = `Weekly summary generation failed: ${error instanceof Error ? error.message : error}`;
    errors.push(msg);
    console.error(`[pipeline] ${msg}`);
  }

  // Step 3: Update the latest digest's weekly_summary
  if (weeklySummary) {
    // Fetch latest digest first (can't use .limit() on .update())
    const { data: latestDigest } = await supabase
      .from("digests")
      .select("id")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (latestDigest) {
      const { error: updateError } = await supabase
        .from("digests")
        .update({ weekly_summary: weeklySummary })
        .eq("id", latestDigest.id);

      if (updateError) {
        console.error(
          "[pipeline] Weekly summary update failed:",
          updateError
        );
        errors.push(`Weekly summary update: ${updateError.message}`);
      }
    }
  }

  // Step 4: Enrich top 20 entities
  let entitiesEnriched = 0;
  const { data: topEntities, error: entityError } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("mention_count", { ascending: false })
    .limit(20);

  if (entityError || !topEntities?.length) {
    console.warn("[pipeline] No entities to enrich");
    return { summary: weeklySummary, entitiesEnriched: 0, errors };
  }

  for (const entity of topEntities) {
    try {
      // Fetch the articles this entity is mentioned in
      const { data: entityArticles } = await supabase
        .from("articles")
        .select("title, ai_summary, source_name, published_at")
        .in("id", entity.source_article_ids ?? [])
        .limit(10);

      const articleContexts = (entityArticles ?? [])
        .map(
          (a: { title: string; source_name: string; ai_summary: string }) =>
            `- "${a.title}" (${a.source_name}): ${a.ai_summary}`
        )
        .join("\n");

      const enrichedDescription = await chatCompletion(
        PROMPTS.ENRICH_ENTITY,
        `Entity: ${entity.name}
Type: ${entity.type}
Current description: ${entity.description ?? "None"}
Article contexts:\n${articleContexts}`,
        { maxTokens: 1024 }
      );

      // Generate embedding for the enriched entity
      const embedding = await generateEmbedding(
        `${entity.name}: ${enrichedDescription}`
      );

      const { error: enrichUpdateError } = await supabase
        .from("knowledge_base")
        .update({
          description: enrichedDescription,
          embedding,
          enriched_at: new Date().toISOString(),
        })
        .eq("id", entity.id);

      if (!enrichUpdateError) {
        entitiesEnriched++;
      }
    } catch (error) {
      console.warn(
        `[pipeline] Entity enrichment failed for "${entity.name}":`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(
    `[pipeline] Weekly summary complete: ${entitiesEnriched} entities enriched`
  );

  return { summary: weeklySummary, entitiesEnriched, errors };
}
