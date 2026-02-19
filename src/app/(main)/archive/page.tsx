"use client";

import { useState, useEffect, useMemo } from "react";
import { Archive, Bookmark, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { TimelineItem } from "@/components/timeline-item";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeleton } from "@/components/skeleton-loader";
import { EmptyState } from "@/components/empty-state";
import { fetchDigests, fetchDigestByDate } from "@/lib/api";
import type { Article, Digest } from "@/lib/types";
import { cn, formatShortDate, truncate } from "@/lib/utils";

export default function ArchivePage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [digests, setDigests] = useState<Digest[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [dateArticles, setDateArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Load digests on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchDigests();
        setDigests(data.digests as Digest[]);
        setHeatmapData(data.heatmapData);
      } catch (e) {
        console.error("Failed to load digests:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Load articles when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setDateArticles([]);
      return;
    }
    async function loadDate() {
      setIsLoadingArticles(true);
      try {
        const data = await fetchDigestByDate(selectedDate!);
        setDateArticles(data.articles as Article[]);
      } catch (e) {
        console.error("Failed to load articles:", e);
      } finally {
        setIsLoadingArticles(false);
      }
    }
    loadDate();
  }, [selectedDate]);

  const filteredArticles = useMemo(() => {
    if (!showBookmarkedOnly) return dateArticles;
    return dateArticles.filter((a) => a.is_bookmarked);
  }, [dateArticles, showBookmarkedOnly]);

  return (
    <>
      <Header
        title="Archive"
        subtitle="Browse historical digests and bookmarked articles"
      />

      {/* Calendar Heatmap */}
      <div className="bg-surface rounded-xl p-5 border border-border mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Activity
        </h3>
        {isLoading ? (
          <div className="h-28 w-full bg-surface-hover animate-pulse rounded" />
        ) : (
          <CalendarHeatmap
            data={heatmapData}
            onDateClick={(date) =>
              setSelectedDate(date === selectedDate ? null : date)
            }
          />
        )}
      </div>

      {/* Bookmarked filter toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground">
          {selectedDate
            ? `Digest: ${formatShortDate(selectedDate)}`
            : "Recent Digests"}
        </h3>
        <button
          onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
            showBookmarkedOnly
              ? "bg-accent/10 text-accent"
              : "text-muted border border-border hover:text-foreground"
          )}
        >
          <Bookmark
            className={cn(
              "w-3.5 h-3.5",
              showBookmarkedOnly && "fill-current"
            )}
          />
          Bookmarked
        </button>
      </div>

      {/* Content: selected date articles or digest timeline */}
      {selectedDate ? (
        isLoadingArticles ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Archive}
            title="No articles for this date"
            description={
              showBookmarkedOnly
                ? "No bookmarked articles on this date."
                : "No digest was generated for this date."
            }
          />
        )
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-muted animate-spin" />
        </div>
      ) : digests.length > 0 ? (
        <div>
          {digests.map((digest, i) => (
            <TimelineItem
              key={digest.id}
              date={formatShortDate(digest.date)}
              title={
                digest.editorial_intro
                  ? truncate(digest.editorial_intro, 80)
                  : `Digest for ${formatShortDate(digest.date)}`
              }
              description={
                digest.weekly_summary ||
                digest.editorial_intro ||
                "Daily AI digest"
              }
              articleCount={digest.article_count}
              isLast={i === digests.length - 1}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Archive}
          title="No digests yet"
          description="Digests will appear here after the pipeline runs."
        />
      )}
    </>
  );
}
