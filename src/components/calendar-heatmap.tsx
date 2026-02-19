"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CalendarHeatmapProps {
  data: Record<string, number>;
  onDateClick?: (date: string) => void;
  className?: string;
}

interface DayCell {
  date: string | null;
  count: number;
}

function getHeatmapColor(count: number): string {
  if (count === 0) return "bg-surface-hover";
  if (count < 10) return "bg-accent/20";
  if (count < 20) return "bg-accent/40";
  if (count < 25) return "bg-accent/60";
  return "bg-accent/80";
}

export function CalendarHeatmap({
  data,
  onDateClick,
  className,
}: CalendarHeatmapProps) {
  const weeks = useMemo(() => {
    const today = new Date();
    // Go back ~12 weeks (84 days)
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    // Align to start of week (Sunday)
    start.setDate(start.getDate() - start.getDay());

    const result: DayCell[][] = [];
    const current = new Date(start);

    while (current <= today) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        if (current > today) {
          week.push({ date: null, count: 0 });
        } else {
          const key = current.toISOString().split("T")[0];
          week.push({ date: key, count: data[key] || 0 });
        }
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }

    return result;
  }, [data]);

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex gap-[3px]">
        {/* Day labels column */}
        <div className="flex flex-col gap-[3px] mr-2">
          {dayLabels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] text-muted h-[14px] leading-[14px] w-6"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <button
                key={di}
                onClick={() => day.date && onDateClick?.(day.date)}
                title={
                  day.date ? `${day.date}: ${day.count} articles` : undefined
                }
                disabled={!day.date}
                className={cn(
                  "w-[14px] h-[14px] rounded-sm transition-colors",
                  day.date
                    ? getHeatmapColor(day.count)
                    : "bg-transparent cursor-default",
                  day.date && "hover:ring-1 hover:ring-accent cursor-pointer"
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px] text-muted mr-1">Less</span>
        {[0, 8, 15, 22, 30].map((n) => (
          <div
            key={n}
            className={cn("w-[10px] h-[10px] rounded-sm", getHeatmapColor(n))}
          />
        ))}
        <span className="text-[10px] text-muted ml-1">More</span>
      </div>
    </div>
  );
}
