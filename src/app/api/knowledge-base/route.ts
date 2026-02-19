import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import type { EntityType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as EntityType | null;
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "trending";

  try {
    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("knowledge_base")
      .select("*", { count: "exact" });

    if (type) {
      query = query.eq("type", type);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (sort === "mentions") {
      query = query.order("mention_count", { ascending: false });
    } else if (sort === "recent") {
      query = query.order("last_mentioned", { ascending: false });
    } else {
      query = query.order("trending_score", { ascending: false });
    }

    query = query.limit(100);

    const { data: entries, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      entries: entries ?? [],
      total: count ?? 0,
      type: type || undefined,
    });
  } catch (error) {
    console.error("Knowledge base list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
