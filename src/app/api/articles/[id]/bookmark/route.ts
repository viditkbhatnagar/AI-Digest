import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: article, error: fetchError } = await supabase
      .from("articles")
      .select("is_bookmarked")
      .eq("id", id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const newState = !article.is_bookmarked;
    const { error: updateError } = await supabase
      .from("articles")
      .update({ is_bookmarked: newState })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      id,
      is_bookmarked: newState,
    });
  } catch (error) {
    console.error(`Bookmark toggle error for ${id}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
