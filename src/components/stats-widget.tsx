import { cn } from "@/lib/utils";

interface StatsWidgetProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  className?: string;
}

export function StatsWidget({
  icon: Icon,
  label,
  value,
  className,
}: StatsWidgetProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl p-4 border border-border",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted" />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
