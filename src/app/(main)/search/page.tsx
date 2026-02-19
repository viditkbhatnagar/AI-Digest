"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeleton } from "@/components/skeleton-loader";
import { EmptyState } from "@/components/empty-state";
import { fetchSearch, fetchResearch } from "@/lib/api";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABELS,
  type ArticleCategory,
  type Article,
  type SearchResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"quick" | "research">("quick");
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ArticleCategory>
  >(new Set());
  const [results, setResults] = useState<SearchResult[]>([]);
  const [researchAnswer, setResearchAnswer] = useState<string | null>(null);
  const [researchSources, setResearchSources] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function toggleCategory(cat: ArticleCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        setResearchAnswer(null);
        setResearchSources([]);
        setHasSearched(false);
        setError(null);
        return;
      }

      // Cancel previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        if (mode === "research") {
          const data = await fetchResearch(q);
          setResearchAnswer(data.answer);
          setResearchSources(data.sources);
          setResults([]);
        } else {
          const categoryFilter =
            selectedCategories.size === 1
              ? [...selectedCategories][0]
              : undefined;
          const data = await fetchSearch(q, "hybrid", categoryFilter);
          setResults(data.results);
          setResearchAnswer(null);
          setResearchSources([]);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    },
    [mode, selectedCategories]
  );

  // Filter results by selected categories (client-side for multi-category)
  const displayResults =
    selectedCategories.size > 1
      ? results.filter((r) => selectedCategories.has(r.article.category))
      : results;

  return (
    <>
      <Header
        title="Search"
        subtitle="Search across all articles and knowledge base"
      />

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search articles, papers, concepts..."
        className="mb-4"
      />

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("quick")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
            mode === "quick"
              ? "bg-accent/10 text-accent"
              : "text-muted border border-border hover:text-foreground"
          )}
        >
          Quick Search
        </button>
        <button
          onClick={() => setMode("research")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5",
            mode === "research"
              ? "bg-accent/10 text-accent"
              : "text-muted border border-border hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Research
        </button>
      </div>

      {/* Filter chips (category filters) */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ARTICLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors border",
              selectedCategories.has(cat)
                ? "bg-accent/10 text-accent border-accent/30"
                : "text-muted border-border hover:text-foreground"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {error ? (
        <EmptyState
          icon={Search}
          title="Search failed"
          description={error}
        />
      ) : !hasSearched ? (
        <EmptyState
          icon={Search}
          title="Search your AI knowledge"
          description="Enter a query to search across all articles, summaries, and knowledge base entries."
        />
      ) : isLoading ? (
        <div className="space-y-6">
          {mode === "research" && (
            <div className="bg-surface rounded-xl p-5 border border-accent/20">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <h3 className="text-sm font-semibold text-foreground">
                  Researching...
                </h3>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-surface-hover animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-surface-hover animate-pulse rounded" />
                <div className="h-4 w-5/6 bg-surface-hover animate-pulse rounded" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : mode === "research" ? (
        <div className="space-y-6">
          {researchAnswer && (
            <div className="bg-surface rounded-xl p-5 border border-accent/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  AI Research Answer
                </h3>
              </div>
              <div className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-muted prose-strong:text-foreground prose-li:text-muted prose-a:text-accent max-w-none">
                <ReactMarkdown>{researchAnswer}</ReactMarkdown>
              </div>
            </div>
          )}
          {researchSources.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-foreground">
                Source Articles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {researchSources.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </>
          )}
          {!researchAnswer && researchSources.length === 0 && (
            <EmptyState
              icon={Search}
              title="No results found"
              description={`No relevant information found for "${query}". Try a different question.`}
            />
          )}
        </div>
      ) : displayResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayResults.map((result) => (
            <ArticleCard key={result.article.id} article={result.article} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No articles match "${query}". Try a different search term.`}
        />
      )}
    </>
  );
}
