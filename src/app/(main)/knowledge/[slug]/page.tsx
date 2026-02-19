import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Hash,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/header";
import { ArticleCard } from "@/components/article-card";
import { KnowledgeCard } from "@/components/knowledge-card";
import { EmptyState } from "@/components/empty-state";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ENTITY_TYPE_LABELS, type EntityType } from "@/lib/types";
import type { Article, KnowledgeBaseEntry } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import type { Metadata } from "next";

const ARTICLE_SELECT =
  "id, title, url, source_name, source_url, published_at, fetched_at, category, ai_summary, key_takeaway, importance_score, tags, mentioned_entities, digest_date, is_bookmarked, created_at";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: entry } = await supabase
    .from("knowledge_base")
    .select("name, type")
    .eq("slug", slug)
    .single();

  if (!entry) {
    return { title: "Entity Not Found" };
  }

  return {
    title: entry.name,
    description: `${ENTITY_TYPE_LABELS[entry.type as EntityType]} in the AI Digest knowledge base`,
  };
}

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: entry } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!entry) {
    return (
      <>
        <Header title="Entity Not Found" subtitle="Knowledge Base" />
        <EmptyState
          icon={Brain}
          title="Entity not found"
          description="This knowledge base entry doesn't exist yet. It will be auto-created when articles mention it."
          action={
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Knowledge Base
            </Link>
          }
        />
      </>
    );
  }

  const typedEntry = entry as KnowledgeBaseEntry;

  // Fetch related articles via source_article_ids
  let relatedArticles: Article[] = [];
  if (typedEntry.source_article_ids?.length > 0) {
    const { data } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .in("id", typedEntry.source_article_ids)
      .order("importance_score", { ascending: false });
    relatedArticles = (data ?? []) as Article[];
  }

  // Fetch related entities (share at least one source_article_id)
  let relatedEntities: KnowledgeBaseEntry[] = [];
  if (typedEntry.source_article_ids?.length > 0) {
    const { data } = await supabase
      .from("knowledge_base")
      .select("*")
      .neq("id", typedEntry.id)
      .overlaps("source_article_ids", typedEntry.source_article_ids)
      .limit(10);
    relatedEntities = (data ?? []) as KnowledgeBaseEntry[];
  }

  return (
    <>
      {/* Back button */}
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Knowledge Base
      </Link>

      <Header
        title={typedEntry.name}
        subtitle={ENTITY_TYPE_LABELS[typedEntry.type]}
      />

      {/* Entity Profile Card */}
      <div className="bg-surface rounded-xl p-5 border border-border mb-6">
        {/* Type badge */}
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider">
          {ENTITY_TYPE_LABELS[typedEntry.type]}
        </span>

        {/* Description */}
        {typedEntry.description && (
          <p className="text-sm text-muted leading-relaxed mt-3">
            {typedEntry.description}
          </p>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Mentions
            </p>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              {typedEntry.mention_count}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Trending Score
            </p>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {Math.round(typedEntry.trending_score)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
              First Seen
            </p>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatShortDate(typedEntry.first_seen)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
              Last Mentioned
            </p>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatShortDate(typedEntry.last_mentioned)}
            </p>
          </div>
        </div>
      </div>

      {/* Mentioned In (articles) */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Mentioned In ({relatedArticles.length} articles)
        </h2>
        {relatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No articles found mentioning this entity.
          </p>
        )}
      </section>

      {/* Related Entities */}
      {relatedEntities.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Related Entities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedEntities.map((e) => (
              <KnowledgeCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
