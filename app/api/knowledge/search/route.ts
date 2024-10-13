import { NextRequest, NextResponse } from "next/server";
import { searchKnowledgeBaseCategories } from "@/app/api/search/services";

export async function POST(request: NextRequest) {
  const { query, selectedCategories } = await request.json();
  const { data, error } = await searchKnowledgeBaseCategories(query, selectedCategories);

  if (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
