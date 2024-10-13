import { NextRequest, NextResponse } from "next/server";
import { searchPhysicians } from "@/app/api/search/services";

export async function POST(request: NextRequest) {
  const { query, state } = await request.json();
  const { data, error } = await searchPhysicians(query, state);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
