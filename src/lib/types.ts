// === Article Categories ===
export type ArticleCategory =
  | "research"
  | "industry"
  | "product"
  | "policy"
  | "tutorial"
  | "opinion";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "research",
  "industry",
  "product",
  "policy",
  "tutorial",
  "opinion",
];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  research: "Research Papers",
  industry: "Industry News",
  product: "Product Launches",
  policy: "Policy & Ethics",
  tutorial: "Tutorials & Tools",
  opinion: "People & Opinions",
};

// === Knowledge Base Entity Types ===
export type EntityType = "person" | "org" | "concept" | "model" | "milestone";

export const ENTITY_TYPES: EntityType[] = [
  "person",
  "org",
  "concept",
  "model",
  "milestone",
];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "People",
  org: "Organizations",
  concept: "Concepts",
  model: "Models",
  milestone: "Milestones",
};

// === Database Row Types ===

export interface Article {
  id: string;
  title: string;
  url: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
  fetched_at: string;
  category: ArticleCategory;
  raw_content: string | null;
  ai_summary: string | null;
  key_takeaway: string | null;
  importance_score: number;
  tags: string[];
  mentioned_entities: string[];
  embedding: number[] | null;
  digest_date: string;
  is_bookmarked: boolean;
  entities_extracted: boolean;
  created_at: string;
}

export interface Digest {
  id: string;
  date: string;
  generated_at: string;
  article_count: number;
  top_story_id: string | null;
  weekly_summary: string | null;
  editorial_intro: string | null;
}

export interface KnowledgeBaseEntry {
  id: string;
  type: EntityType;
  name: string;
  slug: string;
  description: string | null;
  metadata: Record<string, unknown>;
  first_seen: string;
  last_mentioned: string;
  mention_count: number;
  embedding: number[] | null;
  source_article_ids: string[];
  enriched_at: string | null;
  trending_score: number;
  created_at: string;
}

export interface SearchLog {
  id: string;
  query: string;
  results_count: number;
  searched_at: string;
}

// === Source Configuration ===

export type SourceType = "rss" | "arxiv" | "hackernews" | "reddit" | "web";

export interface SourceConfig {
  name: string;
  url: string;
  type: SourceType;
  region: string;
  category: ArticleCategory;
  enabled: boolean;
  fetchFrequency: "daily" | "twice-daily";
  lastFetchedAt: string | null;
  errorCount: number;
}

// === Pipeline Types ===

export interface RawFeedItem {
  title: string;
  url: string;
  content?: string;
  published?: string;
  source: SourceConfig;
}

export interface SummarizationResult {
  summary: string;
  key_takeaway: string;
  importance_score: number;
  tags: string[];
  category: ArticleCategory;
}

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineResult {
  articlesProcessed: number;
  articlesStored: number;
  entitiesExtracted: number;
  backlogCount: number;
  errors: string[];
  duration: number;
}

export interface EntityBatchResult {
  processed: number;
  remaining: number;
  entitiesExtracted: number;
}

// === API Response Types ===

export interface DigestResponse {
  digest: Digest;
  articles: Article[];
  categories: Record<ArticleCategory, Article[]>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  mode: "text" | "semantic" | "hybrid";
}

export interface SearchResult {
  article: Article;
  similarity?: number;
  highlight?: string;
}

export interface ResearchResponse {
  answer: string;
  sources: Article[];
  query: string;
}

export interface StatsResponse {
  totalArticles: number;
  totalSources: number;
  activeSources: number;
  totalEntities: number;
  trendingTopics: { name: string; count: number }[];
  lastDigestDate: string | null;
  backlogCount: number | null;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
  sources: string[];
}

export interface KnowledgeBaseListResponse {
  entries: KnowledgeBaseEntry[];
  total: number;
  type?: EntityType;
}

export interface KnowledgeBaseDetailResponse {
  entry: KnowledgeBaseEntry;
  articles: Article[];
  relatedEntities: KnowledgeBaseEntry[];
}
