import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { pdfToText } from 'pdf-ts';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileField = formData.get('file');

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json({ error: 'No file provided or file is invalid' }, { status: 400 });
    }

    const file = fileField;

    // Save the uploaded file to a temporary path
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, file.name);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    // Convert PDF to text
    const textContent = await convertPdfToText(filePath);

    // Use gpt4o for summarization
    const summary = await summarizeTextWithGPT4O(textContent);

    // Clean up the temporary file
    await fs.unlink(filePath);

    // Store file in Supabase storage
    const fileName = `public/${file.name}`;

    const fileContent = await fs.readFile(filePath);

    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('pdf_knowledge_files')
      .upload(fileName, fileContent)

    if (fileError) {
      throw new Error(`Failed to upload file: ${fileError.message}`);
    }

    // Update database insertion to include text content and summary
    const { error: dbError } = await supabase
      .from('pdf_knowledge')
      .insert({
        file_name: file.name,
        file_path: fileData.path,
        summary: summary,
        content: textContent,
      });

    if (dbError) {
      throw new Error(`Failed to store metadata: ${dbError.message}`);
    }

    return NextResponse.json({ message: 'PDF processed and stored successfully' });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}

async function convertPdfToText(filePath: string): Promise<string> {
  try {
    const pdfBuffer = await fs.readFile(filePath);
    const text = await pdfToText(pdfBuffer);
    return text;
  } catch (error) {
    console.error('Error converting PDF to text:', error);
    throw error;
  }
}

async function summarizeTextWithGPT4O(textContent: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Please provide a concise summary (2-3 sentences) of the following text:\n\n${textContent}`,
      },
    ],
    max_tokens: 500,
  });

  const summary = response.choices[0].message.content?.trim();
  return summary || '';
}
