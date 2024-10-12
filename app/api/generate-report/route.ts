import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid message history" },
        { status: 400 }
      );
    }

    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "persona" ? "assistant" : msg.role,
      content: msg.content,
    }));

    const systemPrompt = `
      You are an AI medical assistant named Aria, tasked with generating a concise diagnostic report based on a conversation between a patient and an AI doctor. Your report should include:

      1. A brief summary of the patient's main symptoms and concerns.
      2. Potential diagnoses or conditions that may explain the symptoms.
      3. Recommended next steps or further actions for the patient.
      4. Any important warnings or precautions the patient should be aware of.

      Format your response in Markdown, using appropriate headers and bullet points for clarity. Be professional, empathetic, and thorough in your assessment. Always recommend consulting with a human healthcare professional for confirmation and treatment.
    `;

    const chatCompletion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedMessages,
        { role: "user", content: "Please generate a diagnostic report based on our conversation." },
      ],
      model: "llama3-8b-8192",
      temperature: 0.5,
      max_tokens: 1000,
    });

    const report = chatCompletion.choices[0].message.content || "";

    return new NextResponse(report, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating diagnostic report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
