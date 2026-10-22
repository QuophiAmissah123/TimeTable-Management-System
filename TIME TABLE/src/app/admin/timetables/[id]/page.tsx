import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { TimetableStudio } from "@/components/timetables/TimetableStudio";

export const dynamic = "force-dynamic";

export default async function TimetableStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [timetable, courses, facilitators] = await Promise.all([
    prisma.timetable.findUnique({
      where: { id },
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            entries: {
              include: {
                course: true,
                facilitator: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, creditHours: true },
    }),
    prisma.facilitator.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, department: true },
    }),
  ]);

  if (!timetable) {
    notFound();
  }

  return (
    <TimetableStudio
      timetable={timetable as any}
      courses={courses}
      facilitators={facilitators}
    />
  );
}
