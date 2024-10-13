import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { searchKnowledgeBase } from "../search/services";
import { Database } from "@/lib/types/schema";

type KnowledgeBaseItem =
  Database["public"]["Functions"]["match_documents"]["Returns"][number];

type GroqMessageParam = {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
};

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function medicalLlamaQuery(query: string): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a medical AI assistant. Provide a brief analysis of the following symptoms.",
      },
      { role: "user", content: query },
    ],
    model: "llama3-8b-8192",
    temperature: 0.5,
    max_tokens: 200,
  });
  return chatCompletion.choices[0].message.content || "";
}

async function searchMedicalKnowledgeBase(query: string): Promise<{ knowledgeBaseInfo: string, articlesData: KnowledgeBaseItem[] }> {
  try {
    const { data, error } = await searchKnowledgeBase(query);
    if (error) {
      throw error;
    }

    return { knowledgeBaseInfo: data.map((item: KnowledgeBaseItem) => item.summary).join("\n"), articlesData: data };
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return { knowledgeBaseInfo: "", articlesData: [] };
  }
}

async function chatWithModel(
  messages: GroqMessageParam[]
): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    messages,
    model: "llama3-70b-8192",
    temperature: 0.7,
    max_tokens: 1000,
  });
  return chatCompletion.choices[0].message.content || "";
}

async function aiDoctorPipeline(
  patientInput: string
): Promise<{ answer: string, articles: KnowledgeBaseItem[] }> {
  const systemPrompt = `
    You are a medical AI assistant. Your primary focus:

    1. Address chief complaint: Prioritize the patient's main concern.
    2. Assess urgency: Determine if immediate medical attention is required.
    3. Provide actionable advice: Offer specific, evidence-based recommendations.
    4. Clarify if needed: Ask 1-2 targeted questions if critical information is missing.
    5. Discuss potential diagnoses: Only if appropriate and within your knowledge scope.

    Guidelines:
    - Safety first: Err on the side of caution for serious symptoms.
    - Be concise: Use clear, simple language. 2-3 sentences maximum.
    - Stay focused: Address the immediate issue, avoid tangents.
    - Integrate data: Incorporate relevant information from additional medical sources.
    - Avoid speculation: If unsure, recommend professional evaluation.
    - No Markdown formatting: Provide plain text responses only.

    Key objective: Deliver the most crucial, actionable information to improve the patient's immediate situation or guide them to appropriate care.`;
  const medicalQuery = `Provide medical analysis for these symptoms: ${patientInput}`;
  const medicalInfo = await medicalLlamaQuery(medicalQuery);
  const { knowledgeBaseInfo, articlesData } = await searchMedicalKnowledgeBase(medicalQuery);

  console.log(`Knowledge base info: ${knowledgeBaseInfo}`);

  console.log(`Medical Llama info: ${medicalInfo}`);

  const person = {
    firstName: "John",
    lastName: "Smith",
    dateOfBirth: "1999-04-01",
    gender: "Male",
    locality: "New York",
    region: "NY",
  };

  const messages: GroqMessageParam[] = [
    { role: "system", content: "You are Aria, an AI health assistant." },
    { role: "user", content: systemPrompt },
    {
      role: "user",
      content: `Patient input: ${patientInput}\n\nPatient info: ${JSON.stringify(
        person
      )}\n\nAdditional information from specialized medical model: ${medicalInfo}\n\nAdditional information from knowledge base: ${knowledgeBaseInfo}`,
    },
  ];

  const response = await chatWithModel(messages);
  return { answer: response, articles: articlesData };
}

export async function POST(request: NextRequest) {
  try {
    const { patientInput } = await request.json();
    console.log(`Patient input: ${patientInput}`);

    if (!patientInput) {
      return NextResponse.json(
        { error: "Patient input is required" },
        { status: 400 }
      );
    }

    const { answer, articles } = await aiDoctorPipeline(patientInput);

    return NextResponse.json({ answer, articles });
  } catch (error) {
    console.error("Error in AI doctor pipeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
