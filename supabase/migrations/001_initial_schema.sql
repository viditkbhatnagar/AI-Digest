-- AI Pulse Database Schema
-- Run this migration against your Supabase project

-- Enable required extensions
create extension if not exists vector with schema public;
create extension if not exists pg_trgm with schema public;

-- ============================================
-- Articles table: Core table for all fetched and summarized content
-- ============================================
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  source_name text not null,
  source_url text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  category text not null check (category in ('research','industry','product','policy','tutorial','opinion')),
  raw_content text,
  ai_summary text,
  key_takeaway text,
  importance_score integer default 5 check (importance_score between 1 and 10),
  tags text[] default '{}',
  mentioned_entities text[] default '{}',
  embedding vector(1536),
  digest_date date not null default current_date,
  is_bookmarked boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- Digests table: Daily digest metadata
-- ============================================
create table public.digests (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  generated_at timestamptz not null default now(),
  article_count integer not null default 0,
  top_story_id uuid references public.articles(id) on delete set null,
  weekly_summary text,
  editorial_intro text
);

-- ============================================
-- Knowledge Base table: Auto-generated encyclopedia entries
-- ============================================
create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('person','org','concept','model','milestone')),
  name text not null,
  slug text not null unique,
  description text,
  metadata jsonb default '{}',
  first_seen timestamptz not null default now(),
  last_mentioned timestamptz not null default now(),
  mention_count integer default 1,
  embedding vector(1536),
  source_article_ids uuid[] default '{}',
  enriched_at timestamptz,
  trending_score float default 0.0,
  created_at timestamptz default now()
);

-- ============================================
-- Search Logs table: Track searches for analytics
-- ============================================
create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  results_count integer not null default 0,
  searched_at timestamptz not null default now()
);

-- ============================================
-- Indexes for articles
-- ============================================
create index idx_articles_digest_date on public.articles(digest_date desc);
create index idx_articles_category on public.articles(category);
create index idx_articles_importance on public.articles(importance_score desc);
create index idx_articles_published_at on public.articles(published_at desc);
create index idx_articles_source_name on public.articles(source_name);
create index idx_articles_bookmarked on public.articles(is_bookmarked) where is_bookmarked = true;
create index idx_articles_tags on public.articles using gin(tags);
create index idx_articles_title_trgm on public.articles using gin(title gin_trgm_ops);
create index idx_articles_summary_trgm on public.articles using gin(ai_summary gin_trgm_ops);

-- ============================================
-- Indexes for knowledge_base
-- ============================================
create index idx_kb_type on public.knowledge_base(type);
create index idx_kb_slug on public.knowledge_base(slug);
create index idx_kb_mention_count on public.knowledge_base(mention_count desc);
create index idx_kb_trending on public.knowledge_base(trending_score desc);
create index idx_kb_name_trgm on public.knowledge_base using gin(name gin_trgm_ops);

-- ============================================
-- Indexes for digests
-- ============================================
create index idx_digests_date on public.digests(date desc);

-- ============================================
-- Vector similarity indexes (IVFFlat)
-- Note: These require at least some data to be present.
-- For initial setup, we create them. They will work but
-- be most efficient after data is loaded.
-- ============================================
-- Uncomment these after inserting initial data:
-- create index idx_articles_embedding on public.articles
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);
-- create index idx_kb_embedding on public.knowledge_base
--   using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- Use HNSW indexes instead (work with empty tables)
create index idx_articles_embedding on public.articles
  using hnsw (embedding vector_cosine_ops);
create index idx_kb_embedding on public.knowledge_base
  using hnsw (embedding vector_cosine_ops);

-- ============================================
-- Full-text search function for articles
-- ============================================
create or replace function search_articles(
  query_text text,
  match_count int default 20,
  filter_category text default null,
  filter_date_from date default null,
  filter_date_to date default null
)
returns setof public.articles
language sql
stable
as $$
  select *
  from public.articles
  where (
    title ilike '%' || query_text || '%'
    or ai_summary ilike '%' || query_text || '%'
    or key_takeaway ilike '%' || query_text || '%'
  )
  and (filter_category is null or category = filter_category)
  and (filter_date_from is null or digest_date >= filter_date_from)
  and (filter_date_to is null or digest_date <= filter_date_to)
  order by importance_score desc, published_at desc nulls last
  limit match_count;
$$;

-- ============================================
-- Semantic search function (vector similarity)
-- ============================================
create or replace function match_articles(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 20
)
returns table (
  id uuid,
  title text,
  url text,
  source_name text,
  published_at timestamptz,
  category text,
  ai_summary text,
  key_takeaway text,
  importance_score integer,
  tags text[],
  digest_date date,
  is_bookmarked boolean,
  similarity float
)
language sql
stable
as $$
  select
    a.id, a.title, a.url, a.source_name, a.published_at,
    a.category, a.ai_summary, a.key_takeaway, a.importance_score,
    a.tags, a.digest_date, a.is_bookmarked,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.articles a
  where a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- Knowledge base semantic search
-- ============================================
create or replace function match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  slug text,
  type text,
  description text,
  mention_count integer,
  trending_score float,
  similarity float
)
language sql
stable
as $$
  select
    k.id, k.name, k.slug, k.type, k.description,
    k.mention_count, k.trending_score,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_base k
  where k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) > match_threshold
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- Fuzzy name matching for entity deduplication
-- ============================================
create or replace function find_similar_entity(
  entity_name text,
  similarity_threshold float default 0.4
)
returns table (
  id uuid,
  name text,
  slug text,
  type text,
  similarity float
)
language sql
stable
as $$
  select
    k.id, k.name, k.slug, k.type,
    similarity(lower(k.name), lower(entity_name)) as similarity
  from public.knowledge_base k
  where similarity(lower(k.name), lower(entity_name)) > similarity_threshold
  order by similarity(lower(k.name), lower(entity_name)) desc
  limit 5;
$$;
