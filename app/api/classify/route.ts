import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const classificationPrompt = `You are an AI medical assistant. Your task is to determine if a visual inspection would be beneficial for diagnosing the patient's condition based on their input. 

Instructions:
1. Analyze the patient's description carefully.
2. Determine if the patient is describing a visible physical symptom on their outer body.
3. Assess whether a visual inspection could provide valuable information for diagnosis.
4. Respond with a single character:
   - '0' if a picture is NOT needed
   - '1' if a picture IS needed for better assessment

Patient input: {patientInput}

Response (0 or 1):`;

export async function POST(request: NextRequest) {
  const { patientInput } = await request.json();

  if (!patientInput) {
    return NextResponse.json(
      { error: "Patient input is required" },
      { status: 400 }
    );
  }

  const groq = new Groq();

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: classificationPrompt.replace("{patientInput}", patientInput),
        },
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0,
      max_tokens: 2,
      top_p: 1,
      stream: false,
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (result !== "0" && result !== "1") {
      throw new Error(`Invalid response from AI model: ${result}`);
    }

    return NextResponse.json({ needsPicture: result === "1" });
  } catch (error) {
    console.error("Error classifying patient input:", error);
    return NextResponse.json(
      { error: `Failed to classify patient input: ${error}` },
      { status: 500 }
    );
  }
}
