import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const classificationPrompt = `You are an AI medical assistant. Your task is to determine if a visual inspection would be beneficial for diagnosing the patient's condition based on their input and any previous picture analysis.

Instructions:
1. Analyze the patient's current description carefully.
2. Consider the previous picture analysis provided.
3. Determine if the previous picture analysis is still relevant to the current patient input.
4. If the previous picture analysis is no longer relevant to the current context, recommend taking a new picture.
5. Also recommend a new picture if the patient is describing a new or changed visible physical symptom on their outer body.
6. Assess whether a new visual inspection could provide valuable additional information for diagnosis.
7. Respond with a single character:
   - '0' if a new picture is NOT needed
   - '1' if a new picture IS needed for better assessment

Important: If the previous picture analysis is not relevant to the current patient input, this strongly indicates that a new picture (1) is needed. But if the previous picture analysis is even closely related to the current patient input, this indicates that a new picture is NOT needed (0).

Previous picture analysis: {previousPictureAnalysis}
Current patient input: {patientInput}

Response (0 or 1):`;

export async function POST(request: NextRequest) {
  const { patientInput, previousPictureAnalysis } = await request.json();

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
          content: classificationPrompt
            .replace("{patientInput}", patientInput)
            .replace("{previousPictureAnalysis}", previousPictureAnalysis),
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
