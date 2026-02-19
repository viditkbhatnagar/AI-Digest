import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const { data: digests, error } = await supabase
      .from("digests")
      .select("id, date, article_count, editorial_intro, weekly_summary")
      .order("date", { ascending: false })
      .limit(90);

    if (error) throw error;

    const heatmapData: Record<string, number> = {};
    for (const d of digests ?? []) {
      heatmapData[d.date] = d.article_count;
    }

    return NextResponse.json({
      digests: digests ?? [],
      heatmapData,
    });
  } catch (error) {
    console.error("Digests list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
