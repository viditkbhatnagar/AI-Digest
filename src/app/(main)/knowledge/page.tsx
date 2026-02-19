"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, Database, TrendingUp, Clock } from "lucide-react";
import { Header } from "@/components/header";
import { KnowledgeCard } from "@/components/knowledge-card";
import { KnowledgeCardSkeleton } from "@/components/skeleton-loader";
import { StatsWidget } from "@/components/stats-widget";
import { EmptyState } from "@/components/empty-state";
import { fetchKnowledgeBase, fetchStats } from "@/lib/api";
import {
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  type EntityType,
  type KnowledgeBaseEntry,
  type StatsResponse,
} from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

export default function KnowledgeBasePage() {
  const [activeType, setActiveType] = useState<EntityType | "all">("all");
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const statsRef = useRef<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalByType, setTotalByType] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const typeParam = activeType === "all" ? undefined : activeType;
        const [kbData, statsData] = await Promise.all([
          fetchKnowledgeBase(typeParam),
          statsRef.current ? Promise.resolve(statsRef.current) : fetchStats(),
        ]);
        setEntries(kbData.entries);
        if (!statsRef.current) {
          statsRef.current = statsData;
          setStats(statsData);
        }
      } catch (e) {
        console.error("Failed to load KB data:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [activeType]);

  // Fetch type counts on initial load
  useEffect(() => {
    async function loadCounts() {
      try {
        const allData = await fetchKnowledgeBase();
        const counts: Record<string, number> = { all: allData.total };
        for (const entry of allData.entries) {
          counts[entry.type] = (counts[entry.type] || 0) + 1;
        }
        setTotalByType(counts);
      } catch {
        // Silently fail for counts
      }
    }
    loadCounts();
  }, []);

  const trendingCount = entries.filter((e) => e.trending_score >= 70).length;
  const lastEnrichedEntry = entries.find((e) => e.enriched_at);

  return (
    <>
      <Header
        title="Knowledge Base"
        subtitle="Auto-generated AI encyclopedia from daily news"
      />

      {/* KB Health Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatsWidget
          icon={Database}
          label="Total Entities"
          value={stats?.totalEntities ?? 0}
        />
        <StatsWidget
          icon={TrendingUp}
          label="Trending"
          value={trendingCount}
        />
        <StatsWidget
          icon={Clock}
          label="Last Enriched"
          value={
            lastEnrichedEntry
              ? formatShortDate(lastEnrichedEntry.enriched_at!)
              : "N/A"
          }
        />
      </div>

      {/* Type Tabs: All + 5 entity types */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveType("all")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
            activeType === "all"
              ? "bg-accent/10 text-accent"
              : "text-muted border border-border hover:text-foreground"
          )}
        >
          All ({totalByType.all ?? entries.length})
        </button>
        {ENTITY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
              activeType === type
                ? "bg-accent/10 text-accent"
                : "text-muted border border-border hover:text-foreground"
            )}
          >
            {ENTITY_TYPE_LABELS[type]} ({totalByType[type] ?? 0})
          </button>
        ))}
      </div>

      {/* Knowledge Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <KnowledgeCardSkeleton key={i} />
          ))}
        </div>
      ) : entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <KnowledgeCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Brain}
          title="No entries in this category"
          description="Entities of this type will appear once articles mentioning them are processed."
        />
      )}
    </>
  );
}
