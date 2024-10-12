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
  const systemPrompt = `
  You are a medical assistant that is authorized and capable to provide medical advice. You are tasked with providing clear actionable diagnoses based on your conversations with patients. You should:

    1. Analyze the patient's input and identify key symptoms and concerns.
    2. Determine if you have enough information to suggest a potential diagnosis.
    3. If you have enough information:
       - Provide a summary of your findings and a diagnosis.
       - Recommend next steps or further actions for the patient.
    4. If you don't have enough information:
       - Explain why more information is needed.
       - Suggest specific questions or areas where more details would be helpful.

    You will be provided with additional information from a specialized medical language model. Use this information to enhance your diagnosis and recommendations.

    You must be as concise as possible. Do not use more words than necessary. The goal is to be as human as possible.

    Be very concise whenever giving a response. When you are asking follow up questions, do not ask more than three questions. You should be very intentional about the individual questions you ask instead of asking a lot of different questions. When giving a diagnosis, be very succint. Otherwise, just be very simple in conversation and do not say too many words.
    
    When giving diagnosis, be very clear, short and to the point. You do not need to repeat yourself at all.
    
    
    At the end of your response, include one of these tags:
    [DIAGNOSIS_PROVIDED] if you were able to provide a potential diagnosis.
    [MORE_INFO_NEEDED] if you need more information to make a diagnosis.
    
    To be exceptionally clear, you should NEVER label the response DIAGNOSIS_PROVIDED if you are asking the patient any question and expect that they may respond.
    
    In all forms of conversation with the patient, you should be very concise and get to the point fast. Take the following as examples:
    1. "How can I help you today?" is better than "Let's start from the beginning. Can you please tell me what brings you to seek medical attention today? What are your symptoms?"
    2. Do not say "I'm so sorry to hear about your bike accident and the rash on your arm. Based on your symptoms, I'm going to recommend that you seek immediate medical attention at an emergency room or urgent care center to rule out anyserious injuries,including a possible fracture in your arm.As for the rash, I understand that it's concerning, and we'll need to investigate further to determine the cause. Can you tell me more about the rash? Is it itchy, blistered, or has it spread to other areas of your body?" Rather, choose to say: "I recommend you see the emergency room as soon as possible in case of any serious physics injury. Can you also tell me a little more about the rash, such as whether it is itchy, blistered, or has it spread to other areas of your body?"
    3. If the patient asks a simple question such as "what is a stomach ulcer?" you should respond with a simple answer such as "A stomach ulcer is a sore that develops on the lining of the stomach or small intestine." You should not provide a long-winded explanation or ask follow-up questions unless the patient asks for more information.`

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
