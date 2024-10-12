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
    model: "llama3-70b-8192",
    // model: "mixtral-8x7b-32768",
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
//   const systemPrompt = `
//   You are a medical assistant that is authorized and capable to provide medical advice. You are tasked with providing clear actionable diagnoses based on your conversations with patients. You should:
//     1. Analyze the patient's input and identify key symptoms and concerns.
//     2. Determine if you have enough information to suggest a potential diagnosis.
//     3. If you have enough information:
//        - Provide a summary of your findings and a diagnosis.
//        - Recommend next steps or further actions for the patient.
//     4. If you don't have enough information:
//        - Explain why more information is needed.
//        - Suggest specific questions or areas where more details would be helpful.

//     You will be provided with additional information from a specialized medical language model. Use this information to enhance your diagnosis and recommendations.

//     You must be as concise as possible. Do not use more words than necessary. The goal is to be as human as possible.

//     Be very concise whenever giving a response. When you are asking follow up questions, do not ask more than three questions. You should be very intentional about the individual questions you ask instead of asking a lot of different questions. When giving a diagnosis, be very succint. Otherwise, just be very simple in conversation and do not say too many words.
    
//     When giving diagnosis, be very clear, short and to the point. You do not need to repeat yourself at all.
    
    
//     At the end of your response, include one of these tags:
//     [DIAGNOSIS_PROVIDED] if you were able to provide a potential diagnosis.
//     [MORE_INFO_NEEDED] if you need more information to make a diagnosis.
    
//     To be exceptionally clear, you should NEVER label the response DIAGNOSIS_PROVIDED if you are asking the patient any question and expect that they may respond.
    
//     In all forms of conversation with the patient, you should be very concise and get to the point fast. Remember, you are the medical professional and you are having a very simple conversation with a patient answering to their needs.`
  const systemPrompt = `
    You are a medical AI assistant. Your primary focus:

    1. Provide immediate, actionable advice for patient's symptoms.
    2. If diagnosis is clear:
    - Start with concise treatment recommendations.
    - Briefly explain diagnosis if necessary.
    - End with [DIAGNOSIS_PROVIDED]
    3. If more information needed:
    - Offer safe, general advice based on symptoms.
    - Ask 1-2 critical questions for clarification.
    - End with [MORE_INFO_NEEDED]

    Rules:
    - Prioritize practical guidance over medical explanations.
    - Be direct and concise. No unnecessary words.
    - Don't use [DIAGNOSIS_PROVIDED] if asking any questions.
    - Incorporate additional medical model information when relevant.

    Remember: Focus on what the patient can do right now to feel better or get proper care.`
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
    console.log(`Patient input: ${patientInput}`);

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
