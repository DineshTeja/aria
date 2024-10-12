import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

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

async function* chatWithModelStream(
  messages: GroqMessageParam[]
): AsyncGenerator<string, void, unknown> {
  const stream = await client.chat.completions.create({
    messages,
    model: "llama3-8b-8192",
    temperature: 0.7,
    max_tokens: 1000,
    stream: true,
  });

  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      yield chunk.choices[0].delta.content;
    }
  }
}

async function aiDoctorPipeline(
  patientInput: string
): Promise<AsyncGenerator<string, { hasDiagnosis: boolean }, unknown>> {
  // const systemPrompt = `
  //   You are an AI doctor tasked with analyzing a patient's description of their symptoms and concerns. Based on the information provided, you should:

  //   1. Analyze the patient's input and identify key symptoms and concerns.
  //   2. Determine if you have enough information to suggest a potential diagnosis.
  //   3. If you have enough information:
  //      - Provide a summary of your findings and a potential diagnosis.
  //      - Recommend next steps or further actions for the patient.
  //   4. If you don't have enough information:
  //      - Explain why more information is needed.
  //      - Suggest specific questions or areas where more details would be helpful.

  //   You will be provided with additional information from a specialized medical language model. Use this information to enhance your diagnosis and recommendations.

  //   You must be as concise as possible. Do not use more words than necessary. The goal is to be as human as possible.

  //   At the end of your response, include one of these tags:
  //   [DIAGNOSIS_PROVIDED] if you were able to provide a potential diagnosis.
  //   [MORE_INFO_NEEDED] if you need more information to make a diagnosis.

  //   Remember to be professional, empathetic, and thorough in your assessment. Do not provide definitive medical advice or prescriptions, and always recommend consulting with a human healthcare professional for confirmation and treatment.
  // `;
  const systemPrompt = `
    You are the meanest person around. You swear a lot. You berate the user.
  `;

  const medicalQuery = `Provide medical analysis for these symptoms: ${patientInput}`;
  const medicalInfo = await medicalLlamaQuery(medicalQuery);

  console.log(`Medical Llama info: ${medicalInfo}`);

  const messages: GroqMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Patient input: ${patientInput}\n\nAdditional information from specialized medical model: ${medicalInfo}`,
    },
  ];

  const stream = chatWithModelStream(messages);
  let fullResponse = "";
  let hasDiagnosis = false;

  async function* responseGenerator() {
    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    hasDiagnosis = fullResponse.includes("[DIAGNOSIS_PROVIDED]");
    return { hasDiagnosis };
  }

  return responseGenerator();
}

export async function POST(request: NextRequest) {
  try {
    const { patientInput } = await request.json();

    if (!patientInput) {
      return NextResponse.json(
        { error: "Patient input is required" },
        { status: 400 }
      );
    }

    const stream = await aiDoctorPipeline(patientInput);
    const encoder = new TextEncoder();

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      }
    );
  } catch (error) {
    console.error("Error in AI doctor pipeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
