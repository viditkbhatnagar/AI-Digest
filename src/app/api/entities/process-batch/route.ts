import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { processEntities } from "@/lib/entity-extraction";

const BATCH_SIZE = 1;
const IMPORTANCE_THRESHOLD = 6;

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
  if (vercelCronSecret && vercelCronSecret === process.env.CRON_SECRET)
    return true;

  const { searchParams } = new URL(request.url);
  return searchParams.get("secret") === process.env.CRON_SECRET;
}

export async function POST(request: NextRequest) {
  // Allow access via either auth middleware (UI) or CRON_SECRET (external cron)
  // Auth middleware already protects this route for logged-in users.
  // CRON_SECRET check is for external cron services like cron-job.org.
  const hasCronSecret = verifyCronSecret(request);
  const hasCookie = request.cookies.has("ai-pulse-auth");

  if (!hasCronSecret && !hasCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Fetch a small batch of articles needing entity extraction
    const { data: articles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, ai_summary, url, source_name")
      .eq("entities_extracted", false)
      .gte("importance_score", IMPORTANCE_THRESHOLD)
      .not("ai_summary", "is", null)
      .order("importance_score", { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch articles", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        processed: 0,
        remaining: 0,
        entitiesExtracted: 0,
      });
    }

    // Run entity extraction on this batch
    const entitiesExtracted = await processEntities(articles);

    // Mark these articles as extracted
    const articleIds = articles.map((a) => a.id);
    const { error: updateError } = await supabase
      .from("articles")
      .update({ entities_extracted: true })
      .in("id", articleIds);

    if (updateError) {
      console.error("[entities] Failed to mark articles as extracted:", updateError);
    }

    // Count remaining
    const { count } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("entities_extracted", false)
      .gte("importance_score", IMPORTANCE_THRESHOLD)
      .not("ai_summary", "is", null);

    return NextResponse.json({
      processed: articles.length,
      remaining: count ?? 0,
      entitiesExtracted,
    });
  } catch (error) {
    console.error("Entity batch processing error:", error);
    return NextResponse.json(
      {
        error: "Entity extraction failed",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
