import type { RawFeedItem } from "./types";

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "source",
  "via",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove tracking params
    for (const param of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(param.toLowerCase())) {
        parsed.searchParams.delete(param);
      }
    }
    parsed.searchParams.sort();
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

// ---------------------------------------------------------------------------
// Trigram-based title similarity (Jaccard index)
// ---------------------------------------------------------------------------

function generateTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const trigrams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

function trigramSimilarity(a: string, b: string): number {
  const trigramsA = generateTrigrams(a);
  const trigramsB = generateTrigrams(b);
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) intersection++;
  }
  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Main deduplication
// ---------------------------------------------------------------------------

const TITLE_SIMILARITY_THRESHOLD = 0.85;

export function deduplicate(items: RawFeedItem[]): RawFeedItem[] {
  if (items.length === 0) return [];

  // Pass 1: URL-based dedup
  const urlMap = new Map<string, RawFeedItem>();
  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.url);
    const existing = urlMap.get(normalizedUrl);
    if (existing) {
      // Keep the item with more content
      if ((item.content?.length ?? 0) > (existing.content?.length ?? 0)) {
        urlMap.set(normalizedUrl, item);
      }
    } else {
      urlMap.set(normalizedUrl, item);
    }
  }

  const afterUrlDedup = Array.from(urlMap.values());
  console.log(
    `[dedup] URL pass: ${items.length} → ${afterUrlDedup.length} (removed ${items.length - afterUrlDedup.length})`
  );

  // Pass 2: Fuzzy title dedup
  const removed = new Set<number>();
  for (let i = 0; i < afterUrlDedup.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < afterUrlDedup.length; j++) {
      if (removed.has(j)) continue;
      const similarity = trigramSimilarity(
        afterUrlDedup[i].title,
        afterUrlDedup[j].title
      );
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        const iLen = afterUrlDedup[i].content?.length ?? 0;
        const jLen = afterUrlDedup[j].content?.length ?? 0;
        if (jLen > iLen) {
          removed.add(i);
          break;
        } else {
          removed.add(j);
        }
      }
    }
  }

  const result = afterUrlDedup.filter((_, idx) => !removed.has(idx));
  console.log(
    `[dedup] Title pass: ${afterUrlDedup.length} → ${result.length} (removed ${afterUrlDedup.length - result.length})`
  );

  return result;
}
