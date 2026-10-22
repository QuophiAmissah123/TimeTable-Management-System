import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { LectureCalendarView } from "@/components/calendar/LectureCalendarView";
import { formatDateKey } from "@/lib/services/session-service";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  await requireAdmin();

  const todayStr = formatDateKey(new Date());

  const [activePeriod, programmes, facilitators, entries, activeSessions, todaySessions] =
    await Promise.all([
      prisma.academicPeriod.findFirst({ where: { isCurrent: true } }),
      prisma.programme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.facilitator.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.timetableEntry.findMany({
        where: {
          timetableVersion: {
            status: "PUBLISHED",
            timetable: {
              status: "PUBLISHED",
            },
          },
        },
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
      }),
      prisma.teachingSession.findMany({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.teachingSession.findMany({
        where: { sessionDate: todayStr, status: "COMPLETED" },
        select: { timetableEntryId: true },
      }),
    ]);

  const activeSessionMap = new Map<string, any>();
  for (const s of activeSessions) {
    activeSessionMap.set(s.timetableEntryId, s);
  }

  const completedTodaySet = new Set<string>();
  for (const s of todaySessions) {
    completedTodaySet.add(s.timetableEntryId);
  }

  const calendarEntries = entries.map((e) => ({
    ...e,
    activeSession: activeSessionMap.get(e.id) || null,
    completedToday: completedTodaySet.has(e.id),
  }));

  const periodName = activePeriod
    ? `${activePeriod.academicYear} — ${activePeriod.semester}`
    : "Academic Semester";

  return (
    <div className="space-y-6">
      <LectureCalendarView
        entries={calendarEntries as any}
        programmes={programmes}
        facilitators={facilitators}
        academicPeriodName={periodName}
      />
    </div>
  );
}
