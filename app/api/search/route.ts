import { supabase } from "@/lib/utils";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { query } = await req.json();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = response.data[0].embedding;
  const results = await supabase.rpc("match_documents", {
    query_embedding: embedding.toString(),
    match_threshold: 0.5,
    match_count: 5,
  });

  return NextResponse.json({ results });
}
