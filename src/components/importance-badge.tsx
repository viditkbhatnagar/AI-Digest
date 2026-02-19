import {
  cn,
  getImportanceDotColor,
  getImportanceLabel,
  getImportanceColor,
} from "@/lib/utils";

interface ImportanceBadgeProps {
  score: number;
  variant?: "dot" | "badge";
  className?: string;
}

export function ImportanceBadge({
  score,
  variant = "dot",
  className,
}: ImportanceBadgeProps) {
  if (variant === "dot") {
    return (
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          getImportanceDotColor(score),
          className
        )}
        title={`Importance: ${getImportanceLabel(score)} (${score}/10)`}
      />
    );
  }

  return (
    <span
      className={cn(
        "text-xs font-medium",
        getImportanceColor(score),
        className
      )}
    >
      {getImportanceLabel(score)}
    </span>
  );
}
