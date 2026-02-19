"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  Radio,
  Database,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  Filter,
} from "lucide-react";
import { Header } from "@/components/header";
import { DigestHeader } from "@/components/digest-header";
import { CategoryTabs } from "@/components/category-tabs";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeleton } from "@/components/skeleton-loader";
import { StatsWidget } from "@/components/stats-widget";
import { EmptyState } from "@/components/empty-state";
import { fetchArticles } from "@/lib/api";
import type {
  Article,
  Digest,
  StatsResponse,
  ArticleCategory,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface HomeContentProps {
  digest: Digest | null;
  stats: StatsResponse;
  weeklyDigest: Digest | null;
}

type SortOption = "latest" | "importance";
type DateRange = "today" | "7d" | "30d" | "all";

export function HomeContent({
  digest,
  stats,
  weeklyDigest,
}: HomeContentProps) {
  const [activeCategory, setActiveCategory] = useState<
    ArticleCategory | "all"
  >("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [page, setPage] = useState(1);

  const [articles, setArticles] = useState<Article[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchArticles({
        page,
        sort: sortBy,
        dateRange,
        source: selectedSource || undefined,
        category: activeCategory === "all" ? undefined : activeCategory,
      });
      setArticles(data.articles);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      if (data.sources.length > 0) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, dateRange, selectedSource, activeCategory]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  function handleCategoryChange(category: ArticleCategory | "all") {
    setActiveCategory(category);
    setPage(1);
  }

  function handleSortChange(sort: SortOption) {
    setSortBy(sort);
    setPage(1);
  }

  function handleDateRangeChange(range: DateRange) {
    setDateRange(range);
    setPage(1);
  }

  function handleSourceChange(source: string) {
    setSelectedSource(source);
    setPage(1);
  }

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "all", label: "All" },
  ];

  return (
    <>
      <Header title="Today's Digest" subtitle={formatDate(new Date())} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatsWidget
          icon={Newspaper}
          label="Articles Today"
          value={digest?.article_count ?? 0}
        />
        <StatsWidget
          icon={Radio}
          label="Active Sources"
          value={stats.activeSources}
        />
        <StatsWidget
          icon={Database}
          label="KB Entries"
          value={stats.totalEntities}
        />
        <StatsWidget
          icon={Zap}
          label="Total Articles"
          value={stats.totalArticles}
        />
      </div>

      {!digest ? (
        <EmptyState
          icon={Newspaper}
          title="No digest yet"
          description="The pipeline hasn't run yet. Go to Settings to trigger it manually, or wait for the next scheduled run."
        />
      ) : (
        <>
          {/* Digest Header: date, count, editorial intro */}
          <DigestHeader digest={digest} />

          {/* Category filter tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            className="mb-4"
          />

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => handleSortChange("latest")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    sortBy === "latest"
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  Latest
                </button>
                <button
                  onClick={() => handleSortChange("importance")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors border-l border-border",
                    sortBy === "importance"
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  Top
                </button>
              </div>
            </div>

            {/* Date Range Pills */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <div className="flex rounded-lg border border-border overflow-hidden">
                {dateRangeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleDateRangeChange(opt.value)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium transition-colors",
                      opt.value !== "today" && "border-l border-border",
                      dateRange === opt.value
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Dropdown */}
            {sources.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-muted" />
                <select
                  value={selectedSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="bg-surface border border-border rounded-lg px-3 py-1 text-xs text-foreground appearance-none cursor-pointer pr-6 max-w-[200px]"
                >
                  <option value="">All Sources</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Result count */}
            {!loading && (
              <span className="text-xs text-muted ml-auto">
                {total} article{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Article Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No articles found"
              description="Try adjusting your filters or date range."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border transition-colors",
                  page <= 1
                    ? "opacity-40 cursor-not-allowed"
                    : "text-foreground hover:bg-surface-hover"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-border transition-colors",
                  page >= totalPages
                    ? "opacity-40 cursor-not-allowed"
                    : "text-foreground hover:bg-surface-hover"
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Weekly Highlights */}
      {weeklyDigest?.weekly_summary && (
        <section className="bg-surface rounded-xl p-5 border border-border mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              Weekly Highlights
            </h3>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {weeklyDigest.weekly_summary}
          </p>
        </section>
      )}

      {/* Trending Topics */}
      {stats.trendingTopics.length > 0 && (
        <section className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Trending Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.trendingTopics.map((topic) => (
              <span
                key={topic.name}
                className="px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent"
              >
                {topic.name} ({topic.count})
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
