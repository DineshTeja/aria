import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq();

export async function POST(request: NextRequest) {
  const { imageData } = await request.json();

  if (!imageData) {
    return NextResponse.json(
      { error: "Image data is required" },
      { status: 400 }
    );
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Provide a concise medical description of the physical injury or condition shown in this image, if any, without referencing the location of the injury. Include any visible symptoms, affected areas, and potential diagnoses if applicable. If you are not confident about the diagnosis, respond with 'unknown'. You must not reference the location of the injury in your response.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
      model: "llava-v1.5-7b-4096-preview",
      temperature: 0.2,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    const analysis = chatCompletion.choices[0].message.content;

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze the image" },
      { status: 500 }
    );
  }
}
