import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ArticleCategory } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCategoryColor(category: ArticleCategory): string {
  const colors: Record<ArticleCategory, string> = {
    research: "bg-category-research/15 text-category-research",
    industry: "bg-category-industry/15 text-category-industry",
    product: "bg-category-product/15 text-category-product",
    policy: "bg-category-policy/15 text-category-policy",
    tutorial: "bg-category-tutorial/15 text-category-tutorial",
    opinion: "bg-category-opinion/15 text-category-opinion",
  };
  return colors[category] ?? "bg-muted/15 text-muted";
}

export function getCategoryBorderColor(category: ArticleCategory): string {
  const colors: Record<ArticleCategory, string> = {
    research: "border-category-research/30",
    industry: "border-category-industry/30",
    product: "border-category-product/30",
    policy: "border-category-policy/30",
    tutorial: "border-category-tutorial/30",
    opinion: "border-category-opinion/30",
  };
  return colors[category] ?? "border-muted/30";
}

export function getImportanceColor(score: number): string {
  if (score >= 8) return "text-importance-high";
  if (score >= 5) return "text-importance-medium";
  return "text-importance-low";
}

export function getImportanceDotColor(score: number): string {
  if (score >= 8) return "bg-importance-high";
  if (score >= 5) return "bg-importance-medium";
  return "bg-importance-low";
}

export function getImportanceLabel(score: number): string {
  if (score >= 8) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export function toISODateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}
