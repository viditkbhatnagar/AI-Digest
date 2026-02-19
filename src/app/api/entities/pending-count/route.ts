import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";

const IMPORTANCE_THRESHOLD = 6;

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();

    const { count, error } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("entities_extracted", false)
      .gte("importance_score", IMPORTANCE_THRESHOLD)
      .not("ai_summary", "is", null);

    if (error) {
      return NextResponse.json(
        { error: "Failed to count pending articles", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ pending: count ?? 0 });
  } catch (error) {
    console.error("Pending entity count error:", error);
    return NextResponse.json(
      {
        error: "Failed to get pending count",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
