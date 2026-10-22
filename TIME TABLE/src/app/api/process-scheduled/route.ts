import { NextResponse } from "next/server";
import { processScheduledPublications } from "@/lib/services/timetable-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await processScheduledPublications();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process scheduled timetables" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
