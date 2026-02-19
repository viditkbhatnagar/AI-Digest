"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={
        error.message || "An unexpected error occurred. Please try again."
      }
      action={
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          Try Again
        </button>
      }
    />
  );
}
