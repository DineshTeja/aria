import { NextRequest, NextResponse } from "next/server";
import { Person } from "@/lib/types/person";
import { supabase } from "@/lib/utils";
import { Database } from "@/lib/types/schema";
import Groq from "groq-sdk";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import OpenAI from "openai";

type Doctor = Database["public"]["Tables"]["new_doctors"]["Row"];

const prompt = `You are an AI medical assistant. Your task is to provide a list of doctors that are relevant to the patient's input, given the context of the doctors in the area. Respond in 2-3 complete sentences with your recommendations.\n\nPatient input: {patientInput}\nDoctors in the area: {doctors}`;

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const specialitySchema = z.object({
  specialty: z.enum([
    "Allergy & Immunology",
    "Anesthesiology",
    "Cardiology",
    "Certified Registered Nurse Anesthetist",
    "Child Neurology",
    "Colon & Rectal Surgery",
    "Dermatology",
    "Emergency Medicine",
    "Endocrinology",
    "Family Medicine",
    "Gastroenterology",
    "General Surgery",
    "Geriatrics",
    "Hematology",
    "Infectious Disease",
    "Internal Medicine",
    "Interventional Radiology",
    "Medical Genetics",
    "Medicine/Pediatrics",
    "Neonat/Perinatology",
    "Nephrology",
    "Neurology",
    "Neurosurgery",
    "Nuclear Medicine",
    "Obstetrics & Gynecology",
    "Occupational Medicine",
    "Oncology",
    "Ophthalmology",
    "Oral & Maxillofacial Surgery",
    "Orthopaedic Surgery",
    "Other MD/DO",
    "Otolaryngology (ENT)",
    "Pathology",
    "Pediatric (General) Surgery",
    "Pediatric Cardiology",
    "Pediatric Emergency Medicine",
    "Pediatric Endocrinology",
    "Pediatric Gastroenterology",
    "Pediatric Hematology & Oncology",
    "Pediatric Infectious Disease",
    "Pediatric Nephrology",
    "Pediatric Pulmonology",
    "Pediatric Rheumatology",
    "Pediatrics",
    "Physical Medicine/Rehab",
    "Plastic Surgery",
    "Preventive Medicine",
    "Psychiatry",
    "Pulmonology",
    "Radiation Oncology",
    "Radiology",
    "Research",
    "Resident Physician",
    "Rheumatology",
    "Thoracic Surgery",
    "Urology",
    "Vascular Surgery",
  ]),
});

export async function POST(request: NextRequest) {
  const {
    patientInfo,
    patientInput,
    doctors,
  }: { patientInfo: Person; patientInput: string; doctors: Doctor[] } =
    await request.json();

  if (doctors.length > 0) {
    return NextResponse.json({
      response: "I've already found doctors for you.",
      doctors,
    });
  } else {
    const completion = await openaiClient.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI medical assistant. Figure out the right kind of professional to look at the patient based on the following details.",
        },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(specialitySchema, "speciality"),
    });

    const specialtyObj: z.infer<typeof specialitySchema> | null =
      completion.choices[0].message.parsed;

    if (!specialtyObj) {
      return NextResponse.json(
        { error: "No speciality found" },
        { status: 500 }
      );
    }

    const specialty = specialtyObj.specialty;

    const groq = new Groq();

    const { data, error } = await supabase
      .from("new_doctors")
      .select("*")
      .eq("locality", patientInfo.locality)
      .eq("region", patientInfo.region)
      .eq("speciality", specialty)
      .returns<Doctor[]>()
      .limit(10);

    const { data: data2, error: error2 } = await supabase
      .from("new_doctors")
      .select("*")
      .eq("region", patientInfo.region)
      .eq("speciality", specialty)
      .returns<Doctor[]>()
      .limit(10);

    if (error || error2) {
      return NextResponse.json(
        { error: (error || error2)?.message },
        { status: 500 }
      );
    }

    // console.log(specialty);

    const uniqueDoctors = Array.from(
      new Map(
        [...data, ...data2].map((doctor) => [doctor.link, doctor])
      ).values()
    );
    // console.log(uniqueDoctors);
    const allDoctors: Doctor[] = uniqueDoctors.slice(0, 10);

    const groqCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
            .replace("{doctors}", JSON.stringify(allDoctors))
            .replace("{patientInput}", patientInput),
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
    });

    const response = groqCompletion.choices[0].message.content;

    return NextResponse.json({ response, doctors: allDoctors });
  }
}
