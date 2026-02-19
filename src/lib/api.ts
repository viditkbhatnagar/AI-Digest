import type {
  StatsResponse,
  SearchResponse,
  ResearchResponse,
  KnowledgeBaseListResponse,
  KnowledgeBaseDetailResponse,
  ArticlesResponse,
  Article,
  Digest,
  EntityType,
  PipelineResult,
  EntityBatchResult,
} from "./types";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error || `API error ${res.status}: ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  return fetchJSON<StatsResponse>("/api/stats");
}

export async function fetchLatestDigest(): Promise<{
  digest: Digest | null;
  articles: Article[];
  categories: Record<string, Article[]>;
  message?: string;
}> {
  return fetchJSON("/api/digest/latest");
}

export async function fetchDigestByDate(date: string): Promise<{
  digest: Digest | null;
  articles: Article[];
  categories: Record<string, Article[]>;
  message?: string;
}> {
  return fetchJSON(`/api/digest/${date}`);
}

export async function fetchDigests(): Promise<{
  digests: Digest[];
  heatmapData: Record<string, number>;
}> {
  return fetchJSON("/api/digests");
}

export async function fetchArticles(params: {
  page?: number;
  sort?: "latest" | "importance";
  dateRange?: "today" | "7d" | "30d" | "all";
  source?: string;
  category?: string;
} = {}): Promise<ArticlesResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.sort) qs.set("sort", params.sort);
  if (params.dateRange) qs.set("dateRange", params.dateRange);
  if (params.source) qs.set("source", params.source);
  if (params.category) qs.set("category", params.category);
  const query = qs.toString();
  return fetchJSON<ArticlesResponse>(`/api/articles${query ? `?${query}` : ""}`);
}

export async function fetchSearch(
  query: string,
  mode: string = "text",
  category?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, mode });
  if (category) params.set("category", category);
  return fetchJSON<SearchResponse>(`/api/search?${params}`);
}

export async function fetchResearch(
  question: string
): Promise<ResearchResponse> {
  return fetchJSON<ResearchResponse>("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export async function fetchKnowledgeBase(
  type?: EntityType,
  search?: string,
  sort?: string
): Promise<KnowledgeBaseListResponse> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return fetchJSON<KnowledgeBaseListResponse>(
    `/api/knowledge-base${qs ? `?${qs}` : ""}`
  );
}

export async function fetchKnowledgeEntry(
  slug: string
): Promise<KnowledgeBaseDetailResponse> {
  return fetchJSON<KnowledgeBaseDetailResponse>(
    `/api/knowledge-base/${slug}`
  );
}

export async function toggleBookmark(
  articleId: string
): Promise<{ success: boolean; id: string; is_bookmarked: boolean }> {
  return fetchJSON(`/api/articles/${articleId}/bookmark`, {
    method: "PATCH",
  });
}

export async function triggerPipeline(): Promise<
  PipelineResult & { success: boolean }
> {
  return fetchJSON("/api/pipeline/trigger", {
    method: "POST",
  });
}

export async function processEntityBatch(): Promise<EntityBatchResult> {
  return fetchJSON<EntityBatchResult>("/api/entities/process-batch", {
    method: "POST",
  });
}

export async function fetchPendingEntityCount(): Promise<{ pending: number }> {
  return fetchJSON<{ pending: number }>("/api/entities/pending-count");
}
