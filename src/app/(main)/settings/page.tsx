"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { LogOut, CheckCircle, Loader2, Play, AlertCircle, Zap, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import sourcesConfig from "@/lib/sources-config.json";
import type { SourceType, StatsResponse } from "@/lib/types";
import { fetchStats, triggerPipeline, processEntityBatch, fetchPendingEntityCount } from "@/lib/api";
import { cn, formatShortDate } from "@/lib/utils";

const SOURCE_TYPE_ORDER: SourceType[] = [
  "rss",
  "arxiv",
  "hackernews",
  "reddit",
  "web",
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sourceStates, setSourceStates] = useState<Record<number, boolean>>(
    {}
  );
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [entityPending, setEntityPending] = useState<number | null>(null);
  const [entityRunning, setEntityRunning] = useState(false);
  const [entityProgress, setEntityProgress] = useState<string | null>(null);
  const [entityStopRequested, setEntityStopRequested] = useState(false);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
    fetchPendingEntityCount()
      .then((r) => setEntityPending(r.pending))
      .catch(console.error);
  }, []);

  function isSourceEnabled(index: number): boolean {
    return sourceStates[index] ?? (sourcesConfig.sources[index]?.enabled ?? true);
  }

  function toggleSource(index: number) {
    setSourceStates((prev) => ({
      ...prev,
      [index]: !isSourceEnabled(index),
    }));
  }

  const enabledCount = sourcesConfig.sources.filter((_, i) =>
    isSourceEnabled(i)
  ).length;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleExtractEntities() {
    setEntityRunning(true);
    setEntityProgress(null);
    setEntityStopRequested(false);
    let totalProcessed = 0;
    let totalEntities = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const result = await processEntityBatch();
        totalProcessed += result.processed;
        totalEntities += result.entitiesExtracted;

        if (result.processed === 0 || result.remaining === 0) {
          setEntityPending(0);
          setEntityProgress(
            totalProcessed > 0
              ? `Done! Extracted ${totalEntities} entities from ${totalProcessed} articles`
              : "No articles pending entity extraction"
          );
          break;
        }

        setEntityPending(result.remaining);
        setEntityProgress(
          `Processing... ${totalEntities} entities from ${totalProcessed} articles (${result.remaining} remaining)`
        );

        // Check if user requested stop
        if (entityStopRequested) {
          setEntityProgress(
            `Stopped. Extracted ${totalEntities} entities from ${totalProcessed} articles (${result.remaining} remaining)`
          );
          break;
        }
      }

      // Refresh stats
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (e) {
      setEntityProgress(
        `Failed after ${totalProcessed} articles: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setEntityRunning(false);
    }
  }

  async function handleRunPipeline() {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const result = await triggerPipeline();
      setPipelineResult(
        `Pipeline complete: ${result.articlesStored} articles stored, ${result.entitiesExtracted} entities extracted in ${Math.round(result.duration / 1000)}s`
      );
      // Refresh stats
      const newStats = await fetchStats();
      setStats(newStats);
    } catch (e) {
      setPipelineResult(
        `Failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setPipelineRunning(false);
    }
  }

  return (
    <>
      <Header
        title="Settings"
        subtitle="Configure sources, theme, and manual controls"
      />

      <div className="space-y-6">
        {/* Theme */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Appearance
          </h3>
          <div className="flex gap-2">
            {(["dark", "light", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 text-sm rounded-lg capitalize transition-colors ${
                  theme === t
                    ? "bg-accent text-white"
                    : "bg-background text-muted border border-border hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Source Management */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Source Management
            </h3>
            <span className="text-xs text-muted">
              {enabledCount}/{sourcesConfig.sources.length} enabled
            </span>
          </div>
          <p className="text-sm text-muted mb-4">
            Enable or disable individual news sources for your daily digest.
          </p>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {SOURCE_TYPE_ORDER.map((sourceType) => {
              const group = sourcesConfig.sources
                .map((s, i) => ({ ...s, globalIndex: i }))
                .filter((s) => s.type === sourceType);

              if (group.length === 0) return null;

              return (
                <div key={sourceType}>
                  <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                    {sourceType.toUpperCase()} ({group.length})
                  </h4>
                  <div className="space-y-0.5">
                    {group.map((source) => {
                      const enabled = isSourceEnabled(source.globalIndex);
                      return (
                        <div
                          key={source.globalIndex}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                enabled ? "bg-importance-low" : "bg-muted"
                              )}
                            />
                            <span className="text-sm text-foreground truncate">
                              {source.name}
                            </span>
                            <span className="text-[10px] text-muted shrink-0">
                              {source.category}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleSource(source.globalIndex)}
                            className={cn(
                              "relative w-9 h-5 rounded-full transition-colors shrink-0",
                              enabled
                                ? "bg-accent"
                                : "bg-surface-hover border border-border"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                enabled ? "left-[18px]" : "left-0.5"
                              )}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* KB Health */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Knowledge Base Health
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted mb-1">Total Articles</p>
              <p className="text-lg font-bold text-foreground">
                {stats?.totalArticles ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Total Entities</p>
              <p className="text-lg font-bold text-foreground">
                {stats?.totalEntities ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Backlog</p>
              <p className={`text-lg font-bold ${
                stats?.backlogCount && stats.backlogCount > 0
                  ? "text-importance-high"
                  : "text-foreground"
              }`}>
                {stats?.backlogCount != null ? stats.backlogCount : "—"}
              </p>
              {stats?.backlogCount != null && stats.backlogCount > 0 && (
                <p className="text-[10px] text-muted mt-0.5">
                  articles pending
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Last Digest</p>
              <p className="text-sm font-medium text-foreground">
                {stats?.lastDigestDate
                  ? formatShortDate(stats.lastDigestDate)
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Status</p>
              <p className="text-sm font-medium text-importance-low flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Healthy
              </p>
            </div>
          </div>
        </section>

        {/* Entity Extraction */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Entity Extraction
          </h3>
          <p className="text-sm text-muted mb-3">
            Extract entities from articles into the knowledge base. Processes 3
            articles per batch to stay within serverless time limits.
            {entityPending != null && entityPending > 0 && (
              <span className="ml-1 font-medium text-accent">
                {entityPending} articles pending.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExtractEntities}
              disabled={entityRunning || entityPending === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors",
                entityRunning || entityPending === 0
                  ? "bg-accent/50 text-white cursor-not-allowed"
                  : "bg-accent text-white hover:bg-accent/90"
              )}
            >
              {entityRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {entityRunning
                ? "Extracting..."
                : entityPending === 0
                  ? "No Pending Articles"
                  : "Extract Entities"}
            </button>
            {entityRunning && (
              <button
                onClick={() => setEntityStopRequested(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Stop
              </button>
            )}
          </div>
          {entityProgress && (
            <div
              className={cn(
                "mt-3 p-3 rounded-lg text-sm",
                entityProgress.startsWith("Failed") || entityProgress.startsWith("Stopped")
                  ? "bg-importance-high/10 text-importance-high"
                  : entityProgress.startsWith("Done") || entityProgress.startsWith("No articles")
                    ? "bg-importance-low/10 text-importance-low"
                    : "bg-accent/10 text-accent"
              )}
            >
              <div className="flex items-start gap-2">
                {entityProgress.startsWith("Failed") || entityProgress.startsWith("Stopped") ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : entityProgress.startsWith("Done") || entityProgress.startsWith("No articles") ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                )}
                {entityProgress}
              </div>
            </div>
          )}
        </section>

        {/* Manual Trigger */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Manual Pipeline Trigger
          </h3>
          <p className="text-sm text-muted mb-3">
            Run the digest pipeline on demand instead of waiting for the
            automatic daily cron job (8 AM IST).
          </p>
          <button
            onClick={handleRunPipeline}
            disabled={pipelineRunning}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors",
              pipelineRunning
                ? "bg-accent/50 text-white cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent/90"
            )}
          >
            {pipelineRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {pipelineRunning ? "Running Pipeline..." : "Run Digest Now"}
          </button>
          {pipelineResult && (
            <div
              className={cn(
                "mt-3 p-3 rounded-lg text-sm",
                pipelineResult.startsWith("Failed")
                  ? "bg-importance-high/10 text-importance-high"
                  : "bg-importance-low/10 text-importance-low"
              )}
            >
              <div className="flex items-start gap-2">
                {pipelineResult.startsWith("Failed") ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                {pipelineResult}
              </div>
            </div>
          )}
        </section>

        {/* Logout */}
        <section className="bg-surface rounded-xl p-5 border border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-importance-high hover:bg-importance-high/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </section>
      </div>
    </>
  );
}
