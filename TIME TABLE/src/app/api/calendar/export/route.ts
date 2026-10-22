import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateIcsCalendar, TimetableEntryCalendarItem } from "@/lib/calendar/ical-generator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timetableId = searchParams.get("timetableId");
    const programmeId = searchParams.get("programmeId");
    const facilitatorId = searchParams.get("facilitatorId");
    const levelId = searchParams.get("levelId");

    const where: any = {
      timetableVersion: {
        status: "PUBLISHED",
        timetable: {
          status: "PUBLISHED",
        },
      },
    };

    let calendarName = "College Academic Timetable - Lectures";
    let filename = "academic-lectures.ics";

    if (timetableId) {
      where.timetableVersion.timetableId = timetableId;
      const tt = await prisma.timetable.findUnique({
        where: { id: timetableId },
        include: { programme: true, programmeLevel: true, academicPeriod: true },
      });
      if (tt) {
        calendarName = `${tt.programme.name} (${tt.programmeLevel.levelName}) - Lectures`;
        filename = `${tt.programme.code.toLowerCase()}-${tt.programmeLevel.levelCode.toLowerCase()}-schedule.ics`;
      }
    } else if (programmeId) {
      where.timetableVersion.timetable.programmeId = programmeId;
      if (levelId) {
        where.timetableVersion.timetable.programmeLevelId = levelId;
      }
      const prog = await prisma.programme.findUnique({ where: { id: programmeId } });
      if (prog) {
        calendarName = `${prog.name} - Lecture Timetable`;
        filename = `${prog.code.toLowerCase()}-lectures.ics`;
      }
    } else if (facilitatorId) {
      where.facilitatorId = facilitatorId;
      const fac = await prisma.facilitator.findUnique({ where: { id: facilitatorId } });
      if (fac) {
        calendarName = `${fac.name} - Teaching Schedule`;
        filename = `${fac.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-schedule.ics`;
      }
    }

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        course: true,
        facilitator: true,
        timetableVersion: {
          include: {
            timetable: {
              include: {
                programme: true,
                programmeLevel: true,
                academicPeriod: true,
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    if (entries.length === 0) {
      return new NextResponse("No published lecture entries found for this calendar.", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const firstPeriod = entries[0]?.timetableVersion?.timetable?.academicPeriod;
    const semesterEndDate = firstPeriod?.endDate || null;

    const icsContent = generateIcsCalendar(
      calendarName,
      entries as TimetableEntryCalendarItem[],
      semesterEndDate
    );

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate calendar" },
      { status: 500 }
    );
  }
}
