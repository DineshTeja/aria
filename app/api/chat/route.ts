import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

type GroqMessageParam = {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
  };

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function medicalLlamaQuery(query: string): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a medical AI assistant. Provide a brief analysis of the following symptoms.' },
      { role: 'user', content: query }
    ],
    model: 'llama3-8b-8192',
    temperature: 0.5,
    max_tokens: 200,
  });
  return chatCompletion.choices[0].message.content || '';
}

async function chatWithModel(messages: GroqMessageParam[]): Promise<string> {
  const chatCompletion = await client.chat.completions.create({
    messages,
    model: 'llama3-8b-8192',
    temperature: 0.7,
    max_tokens: 1000,
  });
  return chatCompletion.choices[0].message.content || '';
}

async function aiDoctorPipeline(patientInput: string): Promise<{ response: string; hasDiagnosis: boolean }> {
  const systemPrompt = `
    You are an AI doctor tasked with analyzing a patient's description of their symptoms and concerns. Based on the information provided, you should:

    1. Analyze the patient's input and identify key symptoms and concerns.
    2. Determine if you have enough information to suggest a potential diagnosis.
    3. If you have enough information:
       - Provide a summary of your findings and a potential diagnosis.
       - Recommend next steps or further actions for the patient.
    4. If you don't have enough information:
       - Explain why more information is needed.
       - Suggest specific questions or areas where more details would be helpful.

    You will be provided with additional information from a specialized medical language model. Use this information to enhance your diagnosis and recommendations.

    At the end of your response, include one of these tags:
    [DIAGNOSIS_PROVIDED] if you were able to provide a potential diagnosis.
    [MORE_INFO_NEEDED] if you need more information to make a diagnosis.

    Remember to be professional, empathetic, and thorough in your assessment. Do not provide definitive medical advice or prescriptions, and always recommend consulting with a human healthcare professional for confirmation and treatment.
  `;

  const medicalQuery = `Provide medical analysis for these symptoms: ${patientInput}`;
  const medicalInfo = await medicalLlamaQuery(medicalQuery);

  console.log(`Medical Llama info: ${medicalInfo}`);

  const messages: GroqMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Patient input: ${patientInput}\n\nAdditional information from specialized medical model: ${medicalInfo}` },
  ];

  const response = await chatWithModel(messages);
  
  const hasDiagnosis = response.includes('[DIAGNOSIS_PROVIDED]');
  const responseContent = response.replace('[DIAGNOSIS_PROVIDED]', '').replace('[MORE_INFO_NEEDED]', '').trim();

  return { response: responseContent, hasDiagnosis };
}

export async function POST(request: NextRequest) {
  try {
    const { patientInput } = await request.json();

    if (!patientInput) {
      return NextResponse.json({ error: 'Patient input is required' }, { status: 400 });
    }

    const { response, hasDiagnosis } = await aiDoctorPipeline(patientInput);

    return NextResponse.json({ response, hasDiagnosis });
  } catch (error) {
    console.error('Error in AI doctor pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
