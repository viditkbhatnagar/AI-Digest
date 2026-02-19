import Parser from "rss-parser";
import type { SourceConfig, RawFeedItem } from "./types";
import sourcesConfigJson from "./sources-config.json";

// Single rss-parser instance (stateless, reusable)
const rssParser = new Parser({
  timeout: 8000,
  headers: {
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
  customFields: {
    item: [["summary", "summary"]],
  },
});

// ---------------------------------------------------------------------------
// Source loading
// ---------------------------------------------------------------------------

export function getEnabledSources(): SourceConfig[] {
  return (sourcesConfigJson.sources as SourceConfig[]).filter((s) => s.enabled);
}

// ---------------------------------------------------------------------------
// Individual fetchers
// ---------------------------------------------------------------------------

async function fetchRSS(source: SourceConfig): Promise<RawFeedItem[]> {
  const feed = await rssParser.parseURL(source.url);
  return (feed.items ?? [])
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.link ?? "",
      content:
        item.contentSnippet ?? item.content ?? item.summary ?? undefined,
      published: item.isoDate ?? item.pubDate ?? undefined,
      source,
    }))
    .filter((item) => item.url);
}

async function fetchArXiv(source: SourceConfig): Promise<RawFeedItem[]> {
  // ArXiv returns Atom XML — rss-parser handles it natively
  const feed = await rssParser.parseURL(source.url);
  return (feed.items ?? [])
    .map((item) => ({
      title: item.title?.replace(/\n/g, " ").trim() ?? "Untitled",
      url: item.link ?? "",
      content: item.summary ?? item.contentSnippet ?? undefined,
      published: item.isoDate ?? undefined,
      source,
    }))
    .filter((item) => item.url);
}

async function fetchHackerNews(source: SourceConfig): Promise<RawFeedItem[]> {
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HN fetch failed: ${response.status}`);
  const data = await response.json();

  return (data.hits ?? [])
    .filter(
      (hit: Record<string, unknown>) => hit.url || hit.story_url || hit.objectID
    )
    .map((hit: Record<string, unknown>) => ({
      title: (hit.title as string) ?? "Untitled",
      url:
        (hit.url as string) ||
        `https://news.ycombinator.com/item?id=${hit.objectID}`,
      content: (hit.story_text as string) ?? undefined,
      published: (hit.created_at as string) ?? undefined,
      source,
    }));
}

async function fetchReddit(source: SourceConfig): Promise<RawFeedItem[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "AI-Pulse/1.0 (news aggregator)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Reddit fetch failed: ${response.status}`);
  const data = await response.json();

  return (data?.data?.children ?? [])
    .map((child: Record<string, unknown>) => {
      const post = child.data as Record<string, unknown>;
      const url = (post.url as string) ?? "";
      // Self-posts point back to reddit — use permalink instead
      const isRedditInternal = url.includes("reddit.com/r/");
      return {
        title: (post.title as string) ?? "Untitled",
        url: isRedditInternal
          ? `https://www.reddit.com${post.permalink as string}`
          : url,
        content: (post.selftext as string) || undefined,
        published: post.created_utc
          ? new Date((post.created_utc as number) * 1000).toISOString()
          : undefined,
        source,
      };
    })
    .filter((item: RawFeedItem) => item.url);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function fetchSource(
  source: SourceConfig
): Promise<RawFeedItem[]> {
  switch (source.type) {
    case "rss":
      return fetchRSS(source);
    case "arxiv":
      return fetchArXiv(source);
    case "hackernews":
      return fetchHackerNews(source);
    case "reddit":
      return fetchReddit(source);
    case "web":
      // Web scraping not implemented (only Papers With Code, which is disabled)
      return [];
    default:
      console.warn(`[sources] Unknown source type: ${source.type} for ${source.name}`);
      return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch all enabled sources
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_ERRORS = 5;

const SOURCE_FETCH_TIMEOUT_MS = 15000;

export async function fetchAllSources(): Promise<RawFeedItem[]> {
  const enabledSources = getEnabledSources();
  console.log(
    `[sources] Fetching from ${enabledSources.length} enabled sources...`
  );

  // Race all sources against an overall timeout so slow feeds don't block
  const sourceFetches = Promise.allSettled(
    enabledSources.map(async (source) => {
      if (source.errorCount >= MAX_CONSECUTIVE_ERRORS) {
        console.warn(
          `[sources] Skipping ${source.name} — ${source.errorCount} consecutive errors`
        );
        return [];
      }
      const items = await fetchSource(source);
      console.log(`[sources] ${source.name}: ${items.length} items`);
      return items;
    })
  );

  const timeout = new Promise<PromiseSettledResult<RawFeedItem[]>[]>(
    (resolve) =>
      setTimeout(() => {
        console.warn(`[sources] Overall fetch timeout (${SOURCE_FETCH_TIMEOUT_MS}ms) — using results so far`);
        resolve([]);
      }, SOURCE_FETCH_TIMEOUT_MS)
  );

  const results = await Promise.race([sourceFetches, timeout]);

  const allItems: RawFeedItem[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
      successCount++;
    } else {
      failCount++;
      console.error(
        `[sources] Source failed:`,
        result.reason instanceof Error
          ? result.reason.message
          : result.reason
      );
    }
  }

  console.log(
    `[sources] Complete: ${successCount} succeeded, ${failCount} failed, ${allItems.length} total items`
  );

  return allItems;
}
