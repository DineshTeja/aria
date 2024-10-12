import { NextResponse } from "next/server";
import { searchKnowledgeBase } from "./services";

export async function POST(req: Request) {
  const { query } = await req.json();

  const { data, status, error } = await searchKnowledgeBase(query);

  if (error) {
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
}
