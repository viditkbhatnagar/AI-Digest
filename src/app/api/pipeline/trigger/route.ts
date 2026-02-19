import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/pipeline";

// Protected by auth middleware — no CRON_SECRET needed
export async function POST() {
  try {
    const result = await runDailyDigest();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Manual pipeline trigger error:", error);
    return NextResponse.json(
      {
        error: "Pipeline execution failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
