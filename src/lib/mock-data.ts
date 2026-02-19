import type {
  Article,
  Digest,
  KnowledgeBaseEntry,
  StatsResponse,
} from "./types";

// Deterministic pseudo-random based on date string
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 100) / 100;
}

// ============================================
// MOCK ARTICLES (6 articles, one per category)
// ============================================

export const MOCK_ARTICLES: Article[] = [
  {
    id: "art-001",
    title:
      "Scaling Laws Revisited: Chinchilla-Optimal Training at 10T Parameters",
    url: "https://arxiv.org/abs/2026.12345",
    source_name: "ArXiv cs.LG",
    source_url: "https://arxiv.org",
    published_at: "2026-02-19T06:00:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "research",
    raw_content: null,
    ai_summary:
      "New research from DeepMind demonstrates that scaling laws established by Chinchilla need revision at the 10-trillion parameter scale. The team found that data quality scaling follows a logarithmic rather than linear curve, suggesting more efficient training regimes for frontier models.",
    key_takeaway:
      "Chinchilla scaling laws break down above 10T parameters; data quality matters more than quantity at extreme scale.",
    importance_score: 9,
    tags: ["scaling-laws", "training", "deepmind", "frontier-models"],
    mentioned_entities: ["DeepMind", "Chinchilla"],
    embedding: null,
    digest_date: "2026-02-19",
    is_bookmarked: true,
    created_at: "2026-02-19T08:00:00Z",
  },
  {
    id: "art-002",
    title: "OpenAI and Microsoft Announce $50B Stargate Expansion in Texas",
    url: "https://techcrunch.com/2026/02/stargate-expansion",
    source_name: "TechCrunch AI",
    source_url: "https://techcrunch.com",
    published_at: "2026-02-19T04:30:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "industry",
    raw_content: null,
    ai_summary:
      "OpenAI and Microsoft revealed plans to expand the Stargate computing initiative with a new $50 billion data center campus in Texas. The facility will house next-generation NVIDIA GB300 clusters and aims to provide 5x the compute capacity of current infrastructure.",
    key_takeaway:
      "Stargate expansion signals massive compute build-out for GPT-5 and beyond.",
    importance_score: 8,
    tags: ["openai", "microsoft", "infrastructure", "stargate"],
    mentioned_entities: ["OpenAI", "Microsoft", "NVIDIA"],
    embedding: null,
    digest_date: "2026-02-19",
    is_bookmarked: false,
    created_at: "2026-02-19T08:00:00Z",
  },
  {
    id: "art-003",
    title: "Anthropic Ships Claude 4.5 Sonnet with Native Computer Use",
    url: "https://anthropic.com/news/claude-4-5-sonnet",
    source_name: "Anthropic Blog",
    source_url: "https://anthropic.com",
    published_at: "2026-02-18T16:00:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "product",
    raw_content: null,
    ai_summary:
      "Anthropic released Claude 4.5 Sonnet featuring built-in computer use capabilities that allow the model to interact directly with desktop applications, browsers, and terminal environments without external tooling.",
    key_takeaway:
      "Claude 4.5 Sonnet integrates computer use natively, removing the need for separate agentic frameworks.",
    importance_score: 9,
    tags: ["anthropic", "claude", "computer-use", "agents"],
    mentioned_entities: ["Anthropic", "Claude"],
    embedding: null,
    digest_date: "2026-02-19",
    is_bookmarked: true,
    created_at: "2026-02-19T08:00:00Z",
  },
  {
    id: "art-004",
    title: "EU AI Act Enforcement Begins: First Penalties for Non-Compliance",
    url: "https://reuters.com/technology/eu-ai-act-enforcement",
    source_name: "Reuters Technology",
    source_url: "https://reuters.com",
    published_at: "2026-02-18T12:00:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "policy",
    raw_content: null,
    ai_summary:
      "The European Union has begun enforcement of the AI Act with three companies receiving formal warnings for deploying prohibited AI systems. This marks the first concrete regulatory action under the landmark legislation.",
    key_takeaway:
      "EU AI Act moves from paper to practice with first enforcement actions against three unnamed companies.",
    importance_score: 7,
    tags: ["eu-ai-act", "regulation", "compliance", "europe"],
    mentioned_entities: ["European Union"],
    embedding: null,
    digest_date: "2026-02-19",
    is_bookmarked: false,
    created_at: "2026-02-19T08:00:00Z",
  },
  {
    id: "art-005",
    title: "Building Production RAG Pipelines with LangGraph and Supabase",
    url: "https://blog.langchain.dev/rag-langgraph-supabase",
    source_name: "LangChain Blog",
    source_url: "https://blog.langchain.dev",
    published_at: "2026-02-18T10:00:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "tutorial",
    raw_content: null,
    ai_summary:
      "A comprehensive guide to building production-grade RAG pipelines using LangGraph for orchestration and Supabase pgvector for storage. Covers chunking strategies, hybrid search, and evaluation frameworks.",
    key_takeaway:
      "LangGraph + Supabase pgvector is emerging as a viable production RAG stack with built-in evaluation.",
    importance_score: 5,
    tags: ["rag", "langgraph", "supabase", "tutorial"],
    mentioned_entities: ["LangChain", "Supabase"],
    embedding: null,
    digest_date: "2026-02-19",
    is_bookmarked: false,
    created_at: "2026-02-19T08:00:00Z",
  },
  {
    id: "art-006",
    title: "Yann LeCun: 'Autoregressive LLMs Are a Dead End for AGI'",
    url: "https://importai.substack.com/p/lecun-agi-debate",
    source_name: "Import AI (Jack Clark)",
    source_url: "https://importai.substack.com",
    published_at: "2026-02-17T20:00:00Z",
    fetched_at: "2026-02-19T08:00:00Z",
    category: "opinion",
    raw_content: null,
    ai_summary:
      "Meta's Chief AI Scientist Yann LeCun reiterated his position that autoregressive language models cannot lead to AGI, arguing that world models with planning capabilities through JEPA architecture represent the true path forward.",
    key_takeaway:
      "LeCun doubles down: JEPA-style world models, not autoregressive LLMs, are the path to human-level AI.",
    importance_score: 6,
    tags: ["yann-lecun", "agi", "jepa", "opinion"],
    mentioned_entities: ["Yann LeCun", "Meta"],
    embedding: null,
    digest_date: "2026-02-17",
    is_bookmarked: false,
    created_at: "2026-02-19T08:00:00Z",
  },
];

// ============================================
// MOCK DIGESTS (3 digests)
// ============================================

export const MOCK_DIGESTS: Digest[] = [
  {
    id: "dig-001",
    date: "2026-02-19",
    generated_at: "2026-02-19T08:00:00Z",
    article_count: 24,
    top_story_id: "art-001",
    weekly_summary: null,
    editorial_intro:
      "A landmark day for scaling research as DeepMind rewrites the playbook on training efficiency. Meanwhile, the EU AI Act bites for the first time, and Anthropic ships native computer use.",
  },
  {
    id: "dig-002",
    date: "2026-02-18",
    generated_at: "2026-02-18T08:00:00Z",
    article_count: 19,
    top_story_id: null,
    weekly_summary:
      "This week saw major announcements from Google (Gemini 2.5 Pro) and a wave of open-source model releases. Regulatory momentum continued building in both the EU and US, with the AI Act's first enforcement actions making headlines. On the research front, DeepMind challenged established scaling laws while Anthropic pushed the boundaries of computer use in AI assistants.",
    editorial_intro:
      "Google steals the spotlight with Gemini 2.5 Pro benchmarks, while the open-source community responds with three new competitive models.",
  },
  {
    id: "dig-003",
    date: "2026-02-17",
    generated_at: "2026-02-17T08:00:00Z",
    article_count: 16,
    top_story_id: null,
    weekly_summary: null,
    editorial_intro:
      "A quieter Monday focused on infrastructure and tooling, with notable progress in agentic frameworks and a new benchmark for code generation.",
  },
];

// ============================================
// MOCK KNOWLEDGE BASE ENTRIES (5 entities)
// ============================================

export const MOCK_KB_ENTRIES: KnowledgeBaseEntry[] = [
  {
    id: "kb-001",
    type: "person",
    name: "Yann LeCun",
    slug: "yann-lecun",
    description:
      "Chief AI Scientist at Meta. Turing Award winner (2018). Known for contributions to convolutional neural networks and self-supervised learning. Vocal advocate for JEPA architecture as a path to AGI.",
    metadata: { role: "Chief AI Scientist", org: "Meta" },
    first_seen: "2026-01-15",
    last_mentioned: "2026-02-19",
    mention_count: 34,
    embedding: null,
    source_article_ids: ["art-006"],
    enriched_at: "2026-02-19T08:00:00Z",
    trending_score: 72,
    created_at: "2026-01-15T08:00:00Z",
  },
  {
    id: "kb-002",
    type: "org",
    name: "Anthropic",
    slug: "anthropic",
    description:
      "AI safety company founded by Dario and Daniela Amodei. Creator of the Claude family of models. Focused on developing reliable, interpretable, and steerable AI systems.",
    metadata: { founded: "2021", hq: "San Francisco" },
    first_seen: "2026-01-15",
    last_mentioned: "2026-02-19",
    mention_count: 58,
    embedding: null,
    source_article_ids: ["art-003"],
    enriched_at: "2026-02-19T08:00:00Z",
    trending_score: 89,
    created_at: "2026-01-15T08:00:00Z",
  },
  {
    id: "kb-003",
    type: "model",
    name: "Claude 4.5 Sonnet",
    slug: "claude-4-5-sonnet",
    description:
      "Anthropic's latest mid-tier model with native computer use capabilities. Released February 2026. Features built-in tool use, extended thinking, and agentic behaviors.",
    metadata: { provider: "Anthropic", release_date: "2026-02" },
    first_seen: "2026-02-18",
    last_mentioned: "2026-02-19",
    mention_count: 12,
    embedding: null,
    source_article_ids: ["art-003"],
    enriched_at: "2026-02-19T08:00:00Z",
    trending_score: 95,
    created_at: "2026-02-18T08:00:00Z",
  },
  {
    id: "kb-004",
    type: "concept",
    name: "Scaling Laws",
    slug: "scaling-laws",
    description:
      "Empirical relationships between model size, dataset size, compute budget, and performance. Originally formalized by Kaplan et al. (2020) and revised by Hoffmann et al. (Chinchilla, 2022). Under active revision for frontier-scale models.",
    metadata: {},
    first_seen: "2026-01-15",
    last_mentioned: "2026-02-19",
    mention_count: 41,
    embedding: null,
    source_article_ids: ["art-001"],
    enriched_at: "2026-02-19T08:00:00Z",
    trending_score: 68,
    created_at: "2026-01-15T08:00:00Z",
  },
  {
    id: "kb-005",
    type: "milestone",
    name: "EU AI Act Enforcement Begins",
    slug: "eu-ai-act-enforcement-begins",
    description:
      "February 2026 marks the first concrete enforcement actions under the EU AI Act, with formal warnings issued to companies deploying prohibited AI systems. A watershed moment in AI governance.",
    metadata: { date: "2026-02-18", region: "EU" },
    first_seen: "2026-02-18",
    last_mentioned: "2026-02-19",
    mention_count: 8,
    embedding: null,
    source_article_ids: ["art-004"],
    enriched_at: "2026-02-19T08:00:00Z",
    trending_score: 55,
    created_at: "2026-02-18T08:00:00Z",
  },
];

// ============================================
// MOCK CALENDAR HEATMAP DATA
// ============================================

export function generateMockHeatmapData(): Record<string, number> {
  const data: Record<string, number> = {};
  const start = new Date("2025-12-01");
  const end = new Date("2026-02-19");

  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getTime() + 86400000)
  ) {
    const key = d.toISOString().split("T")[0];
    const rand = seededRandom(key);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    data[key] = isWeekend
      ? Math.floor(rand * 11) + 5
      : Math.floor(rand * 21) + 10;
  }

  // Override with our mock digest counts
  data["2026-02-19"] = 24;
  data["2026-02-18"] = 19;
  data["2026-02-17"] = 16;

  return data;
}

// ============================================
// MOCK STATS
// ============================================

export const MOCK_STATS: StatsResponse = {
  totalArticles: 1247,
  totalSources: 42,
  activeSources: 38,
  totalEntities: 183,
  trendingTopics: [
    { name: "Scaling Laws", count: 41 },
    { name: "Claude 4.5", count: 34 },
    { name: "EU AI Act", count: 28 },
    { name: "Computer Use", count: 22 },
    { name: "Stargate", count: 19 },
  ],
  lastDigestDate: "2026-02-19",
  backlogCount: 42,
};

// ============================================
// MOCK AI RESEARCH ANSWER
// ============================================

export const MOCK_RESEARCH_ANSWER = `Based on analysis of 24 recent articles, here are the key developments in scaling laws:

**Recent Findings:**
- DeepMind's latest paper demonstrates that Chinchilla-optimal training ratios break down above 10 trillion parameters
- Data quality follows a logarithmic curve at extreme scale, not the linear relationship previously assumed
- Google's Gemini team has independently verified similar findings

**Implications:**
1. Future frontier models may require fundamentally different training approaches
2. Data curation becomes more important than data volume at scale
3. Compute efficiency gains of 2-3x are achievable with revised training schedules

**Key Sources:** ArXiv cs.LG (3 papers), DeepMind Blog, Google AI Blog`;
