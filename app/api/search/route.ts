import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const searchResponseSchema = z.object({
  informed_query: z.string(),
  category: z.array(
    z.enum([
      "Cardiovascular",
      "Respiratory",
      "Gastrointestinal",
      "Endocrine",
      "Hematological",
      "Infectious",
      "Musculoskeletal",
      "Autoimmune",
      "Cancer",
      "Neurological",
    ])
  ),
});

export async function POST(req: Request) {
  const { query } = await req.json();

  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: query }],
    response_format: zodResponseFormat(searchResponseSchema, "searchResponse"),
  });

  return NextResponse.json({ response });
}
