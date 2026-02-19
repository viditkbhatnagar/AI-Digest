import { NextRequest, NextResponse } from "next/server";
import { runWeeklySummary } from "@/lib/pipeline";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Check Vercel's built-in cron secret header
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  if (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET)
    return true;

  const { searchParams } = new URL(request.url);
  return searchParams.get("secret") === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklySummary();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Weekly summary cron error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
