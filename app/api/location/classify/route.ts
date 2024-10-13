import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const classificationPrompt = `You are an AI medical assistant. Your task is to determine whether or not the user is explicitlyrequesting to see relevant medical professionals in their area.

Respond with a single character:
   - '0' if the user is NOT explicitly requesting to see relevant medical professionals in their area
   - '1' if the user is explicitly requesting to see relevant medical professionals in their area

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
    console.log(patientInput);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: classificationPrompt,
        },
        {
          role: "user",
          content: patientInput,
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

    return NextResponse.json({
      requestingProfessionals: result === "1",
    });
  } catch (error) {
    console.error(
      "Error determining if user is requesting to see relevant medical professionals in their area:",
      error
    );
    return NextResponse.json(
      {
        error: `Failed to determine if user is requesting to see relevant medical professionals in their area: ${error}`,
      },
      { status: 500 }
    );
  }
}
